import { describe, expect, it } from "vitest";
import {
  canAccessWorkspace,
  canAcknowledgePurchaseOrder,
  canApprovePurchaseOrder,
  canCreateDeliveryIntent,
  canTransitionDeliveryIntent,
  canTransitionPurchaseOrder,
  canViewPurchaseOrder,
  createWajenziId,
  determineCanonicalOutcome,
  filterComparableOffers,
  hasCompleteCoordinatePair,
  haversineDistanceKm,
  normalizedProductKey,
  scoreProductMatch,
} from "./registryCore";

describe("WAJENZI immutable identifier policy", () => {
  it("derives a stable, typed identifier from the same registry seed", () => {
    const first = createWajenziId("PRD", "wajenzi-master-catalogue-v1:16932");
    const second = createWajenziId("PRD", "wajenzi-master-catalogue-v1:16932");
    expect(first).toBe(second);
    expect(first).toMatch(/^WJZ-PRD-[A-F0-9]{14}$/);
  });
});

describe("canonicalization", () => {
  it("normalizes names and preserves the no-silent-creation rule", () => {
    expect(normalizedProductKey("Bamburi Cement—50 kg")).toBe("bamburi cement 50 kg");
    expect(scoreProductMatch("Bamburi Cement", "Bamburi Cement")).toBe(1);
    expect(determineCanonicalOutcome({ sourceRowAlreadyImported: true, bestMatchScore: 1 })).toBe("idempotent_skip");
    expect(determineCanonicalOutcome({ sourceRowAlreadyImported: false, bestMatchScore: 0.95 })).toBe("matched_existing_product");
    expect(determineCanonicalOutcome({ sourceRowAlreadyImported: false, bestMatchScore: 0.72 })).toBe("review_required");
    expect(determineCanonicalOutcome({ sourceRowAlreadyImported: false, bestMatchScore: 0.24 })).toBe("new_canonical_requires_steward");
  });
});

describe("workspace access boundaries", () => {
  it("allows only stewards to make canonical decisions", () => {
    expect(canAccessWorkspace("registry_steward", "steward")).toBe(true);
    expect(canAccessWorkspace("supplier", "steward")).toBe(false);
    expect(canAccessWorkspace("supplier", "supplier_write")).toBe(true);
    expect(canAccessWorkspace("project_user", "project_write")).toBe(true);
    expect(canAccessWorkspace("viewer", "project_write")).toBe(false);
  });

  it("requires both coordinates or neither when creating a project site", () => {
    expect(hasCompleteCoordinatePair(-1.286389, 36.817223)).toBe(true);
    expect(hasCompleteCoordinatePair(undefined, undefined)).toBe(true);
    expect(hasCompleteCoordinatePair(-1.286389, undefined)).toBe(false);
    expect(hasCompleteCoordinatePair(undefined, 36.817223)).toBe(false);
  });

  it("requires a project authority or registry steward for order approval", () => {
    expect(canApprovePurchaseOrder("registry_steward")).toBe(true);
    expect(canApprovePurchaseOrder("contractor", "project_manager")).toBe(true);
    expect(canApprovePurchaseOrder("project_user", "project_user")).toBe(true);
    expect(canApprovePurchaseOrder("contractor", "viewer")).toBe(false);
    expect(canApprovePurchaseOrder("supplier", "supplier")).toBe(false);
  });

  it("scopes order visibility and acknowledgement to named suppliers or active project access", () => {
    expect(canViewPurchaseOrder("registry_steward", { isActiveProjectMember: false, isNamedSupplier: false })).toBe(true);
    expect(canViewPurchaseOrder("supplier", { isActiveProjectMember: false, isNamedSupplier: true })).toBe(true);
    expect(canViewPurchaseOrder("supplier", { isActiveProjectMember: true, isNamedSupplier: false })).toBe(false);
    expect(canViewPurchaseOrder("contractor", { isActiveProjectMember: true, isNamedSupplier: false })).toBe(true);
    expect(canViewPurchaseOrder("project_user", { isActiveProjectMember: false, isNamedSupplier: false })).toBe(false);
    expect(canAcknowledgePurchaseOrder("supplier", true)).toBe(true);
    expect(canAcknowledgePurchaseOrder("supplier", false)).toBe(false);
    expect(canAcknowledgePurchaseOrder("contractor", true)).toBe(false);
  });
});

describe("purchase-order and delivery-intent policy", () => {
  it("limits purchase-order actions to their ordered lifecycle", () => {
    expect(canTransitionPurchaseOrder("pending_approval", "approve")).toBe(true);
    expect(canTransitionPurchaseOrder("approved", "issue")).toBe(true);
    expect(canTransitionPurchaseOrder("issued", "acknowledge")).toBe(true);
    expect(canTransitionPurchaseOrder("pending_approval", "issue")).toBe(false);
    expect(canTransitionPurchaseOrder("acknowledged", "approve")).toBe(false);
  });

  it("allows delivery intent only after acknowledgement and forward reported states", () => {
    expect(canCreateDeliveryIntent("issued")).toBe(false);
    expect(canCreateDeliveryIntent("acknowledged")).toBe(true);
    expect(canTransitionDeliveryIntent("planned", "scheduled")).toBe(true);
    expect(canTransitionDeliveryIntent("scheduled", "in_transit")).toBe(true);
    expect(canTransitionDeliveryIntent("in_transit", "delivered")).toBe(true);
    expect(canTransitionDeliveryIntent("planned", "delivered")).toBe(false);
    expect(canTransitionDeliveryIntent("delivered", "in_transit")).toBe(false);
  });
});

describe("location-aware procurement guard", () => {
  const now = new Date("2026-08-27T12:00:00.000Z");
  const eligibleOffer = {
    offerId: "WJZ-OFR-ELIGIBLE", canonicalProductId: "WJZ-PRD-CEMENT", productName: "Bamburi Cement", supplierName: "Example Supplier", facilityName: "Example warehouse", facilityLatitude: -1.2676, facilityLongitude: 36.8108, normalizedAmount: 720, normalizedUnit: "bag", currencyCode: "KES", taxBasis: "inclusive", priceVerificationStatus: "verified", priceObservedAt: now, stockQuantity: 180, stockUnit: "bag", availabilityState: "available", stockVerificationStatus: "verified", stockObservedAt: now, stockFreshnessUntil: new Date("2026-08-28T12:00:00.000Z"),
  };

  it("computes a geodesic site-to-facility distance", () => {
    const distance = haversineDistanceKm({ latitude: -1.286389, longitude: 36.817223 }, { latitude: -1.2676, longitude: 36.8108 });
    expect(distance).toBeGreaterThan(2);
    expect(distance).toBeLessThan(3);
  });

  it("returns only offers that have verified stock and a comparable price", () => {
    const result = filterComparableOffers({ offers: [eligibleOffer, { ...eligibleOffer, offerId: "WJZ-OFR-NOT-VERIFIED", stockVerificationStatus: "unverified" }], projectSite: { latitude: -1.286389, longitude: 36.817223 }, radiusKm: 50, now, currencyCode: "KES", normalizedUnit: "bag", taxBasis: "inclusive" });
    expect(result.ready).toBe(true);
    if (result.ready) expect(result.results).toHaveLength(1);
  });

  it("refuses to run a distance result without a project-site coordinate", () => {
    const result = filterComparableOffers({ offers: [eligibleOffer], projectSite: null, radiusKm: 50, now, currencyCode: "KES", normalizedUnit: "bag", taxBasis: "inclusive" });
    expect(result).toEqual({ ready: false, reason: "A project site with coordinates is required before distance filtering." });
  });
});
