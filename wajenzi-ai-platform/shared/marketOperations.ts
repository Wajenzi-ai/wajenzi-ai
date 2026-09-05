export type OfferEvidence = {
  canonicalEntityId?: string | null;
  supplierOrganizationId?: number | null;
  priceKes?: number | null;
  availableQuantity?: number | null;
  leadTimeDays?: number | null;
  deliveryPromise?: string | null;
};

export function calculateTrueLandedCost(input: { unitPriceKes: number; quantity: number; deliveryKes: number; handlingKes?: number; distanceKm?: number; distanceRateKesPerKm?: number }) {
  const handlingKes = input.handlingKes ?? 0;
  const distanceKes = (input.distanceKm ?? 0) * (input.distanceRateKesPerKm ?? 0);
  return Math.max(0, input.unitPriceKes) * Math.max(0, input.quantity) + Math.max(0, input.deliveryKes) + Math.max(0, handlingKes) + Math.max(0, distanceKes);
}

export function getOfferReadiness(evidence: OfferEvidence) {
  const missing: string[] = [];
  if (!evidence.canonicalEntityId?.trim()) missing.push("canonical product identity");
  if (!evidence.supplierOrganizationId) missing.push("supplier organization");
  if (evidence.priceKes === null || evidence.priceKes === undefined || evidence.priceKes < 0) missing.push("price observation");
  if (evidence.availableQuantity === null || evidence.availableQuantity === undefined) missing.push("stock observation");
  if (evidence.leadTimeDays === null || evidence.leadTimeDays === undefined) missing.push("lead-time observation");
  if (!evidence.deliveryPromise?.trim()) missing.push("delivery promise");
  return { ready: missing.length === 0, missing } as const;
}
