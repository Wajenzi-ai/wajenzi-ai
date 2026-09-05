import { describe, expect, it } from "vitest";
import { calculateTrueLandedCost, getOfferReadiness } from "@shared/marketOperations";

describe("market operations contracts", () => {
  it("calculates a true landed cost from item, delivery, handling, and distance inputs", () => {
    expect(calculateTrueLandedCost({ unitPriceKes: 8500, quantity: 10, deliveryKes: 2400, handlingKes: 300, distanceKm: 18, distanceRateKesPerKm: 25 })).toBe(88_150);
  });

  it("does not treat an incomplete supplier offer as ready", () => {
    const result = getOfferReadiness({ canonicalEntityId: "WJ-PROD-001", supplierOrganizationId: 22, priceKes: 8500, availableQuantity: 10, leadTimeDays: null, deliveryPromise: "" });
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual(["lead-time observation", "delivery promise"]);
  });

  it("requires canonical identity and preserves source observations in the readiness boundary", () => {
    const result = getOfferReadiness({ supplierOrganizationId: 22, priceKes: 8500, availableQuantity: 10, leadTimeDays: 2, deliveryPromise: "Nairobi site delivery subject to confirmation" });
    expect(result.ready).toBe(false);
    expect(result.missing).toEqual(["canonical product identity"]);
  });

  it("accepts an offer only when all required observations are present", () => {
    expect(getOfferReadiness({ canonicalEntityId: "WJ-PROD-001", supplierOrganizationId: 22, priceKes: 8500, availableQuantity: 10, leadTimeDays: 2, deliveryPromise: "Confirmed within two working days" })).toEqual({ ready: true, missing: [] });
  });
});
