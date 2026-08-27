import { createHash, randomUUID } from "crypto";

export type WajenziIdPrefix = "ORG" | "USR" | "PRJ" | "PRD" | "SUP" | "LOC" | "DOC" | "BOQ" | "PO" | "EVT" | "OFR" | "IMP" | "EVD" | "WSP" | "SUB" | "AGN" | "PRP" | "RFQ" | "QTE" | "DLV";

const prefixByEntityType: Record<string, WajenziIdPrefix> = {
  organization: "ORG",
  person: "USR",
  user_account: "USR",
  project: "PRJ",
  product: "PRD",
  product_variant: "PRD",
  site: "LOC",
  facility: "LOC",
  document: "DOC",
  boq_item: "BOQ",
  purchase_order: "PO",
  event: "EVT",
  evidence: "EVD",
  workspace: "WSP",
  offer: "OFR",
  import_batch: "IMP",
};

export function createWajenziId(prefix: WajenziIdPrefix, seed?: string) {
  const fragment = seed
    ? createHash("sha256").update(seed).digest("hex").slice(0, 14).toUpperCase()
    : randomUUID().replaceAll("-", "").slice(0, 14).toUpperCase();
  return `WJZ-${prefix}-${fragment}`;
}

export function createEntityWajenziId(entityType: string, seed?: string) {
  const prefix = prefixByEntityType[entityType];
  if (!prefix) throw new Error(`No WAJENZI ID prefix registered for entity type: ${entityType}`);
  return createWajenziId(prefix, seed);
}

export function normalizedProductKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function scoreProductMatch(submissionName: string, canonicalName: string) {
  const left = new Set(normalizedProductKey(submissionName).split(" ").filter(Boolean));
  const right = new Set(normalizedProductKey(canonicalName).split(" ").filter(Boolean));
  if (!left.size || !right.size) return 0;
  const leftTokens = Array.from(left);
  const intersection = leftTokens.filter(token => right.has(token)).length;
  return intersection / new Set(leftTokens.concat(Array.from(right))).size;
}

export function determineCanonicalOutcome(input: {
  sourceRowAlreadyImported: boolean;
  bestMatchScore?: number;
  hasIdentityConflict?: boolean;
}) {
  if (input.sourceRowAlreadyImported) return "idempotent_skip" as const;
  if (input.hasIdentityConflict) return "review_required" as const;
  if ((input.bestMatchScore ?? 0) >= 0.92) return "matched_existing_product" as const;
  if ((input.bestMatchScore ?? 0) >= 0.65) return "review_required" as const;
  return "new_canonical_requires_steward" as const;
}

export function haversineDistanceKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371.0088;
  const dLat = radians(to.latitude - from.latitude);
  const dLon = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function hasCompleteCoordinatePair(latitude?: number | null, longitude?: number | null) {
  return (latitude == null && longitude == null) || (latitude != null && longitude != null);
}

export type ComparableOffer = {
  offerId: string;
  canonicalProductId: string;
  productName?: string;
  supplierName: string;
  facilityName: string;
  facilityLatitude?: number | null;
  facilityLongitude?: number | null;
  normalizedAmount?: number | null;
  normalizedUnit?: string | null;
  currencyCode: string;
  taxBasis: string;
  priceVerificationStatus: string;
  priceObservedAt: Date;
  stockQuantity?: number | null;
  stockUnit?: string | null;
  availabilityState: string;
  stockVerificationStatus: string;
  stockObservedAt: Date;
  stockFreshnessUntil?: Date | null;
};

export function filterComparableOffers(input: {
  offers: ComparableOffer[];
  projectSite?: { latitude: number; longitude: number } | null;
  radiusKm: number;
  now: Date;
  currencyCode: string;
  normalizedUnit: string;
  taxBasis: string;
}) {
  if (!input.projectSite) return { ready: false as const, reason: "A project site with coordinates is required before distance filtering." };
  const ranked = input.offers
    .filter(offer => offer.facilityLatitude != null && offer.facilityLongitude != null)
    .map(offer => ({ ...offer, distanceKm: haversineDistanceKm(input.projectSite!, { latitude: Number(offer.facilityLatitude), longitude: Number(offer.facilityLongitude) }) }))
    .filter(offer => offer.distanceKm <= input.radiusKm)
    .filter(offer => offer.availabilityState === "available" && offer.stockVerificationStatus === "verified")
    .filter(offer => !offer.stockFreshnessUntil || offer.stockFreshnessUntil >= input.now)
    .filter(offer => offer.priceVerificationStatus === "verified")
    .filter(offer => offer.currencyCode === input.currencyCode && offer.normalizedUnit === input.normalizedUnit && offer.taxBasis === input.taxBasis)
    .filter(offer => offer.normalizedAmount != null)
    .sort((a, b) => Number(a.normalizedAmount) - Number(b.normalizedAmount) || a.distanceKm - b.distanceKm);
  return { ready: true as const, results: ranked };
}

export function canAccessWorkspace(role: string | undefined, action: "read" | "steward" | "supplier_write" | "project_write") {
  if (!role) return false;
  const allowed: Record<string, string[]> = {
    read: ["registry_steward", "supplier", "contractor", "project_user", "viewer"],
    steward: ["registry_steward"],
    supplier_write: ["registry_steward", "supplier"],
    project_write: ["registry_steward", "contractor", "project_user"],
  };
  return allowed[action].includes(role);
}
