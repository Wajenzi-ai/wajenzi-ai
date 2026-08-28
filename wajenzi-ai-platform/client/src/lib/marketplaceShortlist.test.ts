import { describe, expect, it } from "vitest";
import { buildProcurementContext, toggleShortlist } from "./marketplaceShortlist";

const cistern = {
  id: 1,
  title: "Cistern package",
  priceKes: 14345,
  salePriceKes: 10570,
  supplierName: "Wajenzi Stores",
  externalUrl: "https://supplier.example/cistern",
};

const rebar = {
  id: 2,
  title: "D12 reinforcement bar",
  priceKes: 1780,
  salePriceKes: null,
  supplierName: null,
  externalUrl: null,
};

describe("marketplace shortlist helpers", () => {
  it("retains a saved product when the active catalog result set changes", () => {
    const saved = toggleShortlist([], cistern);
    const afterDifferentSearch = [...saved];

    expect(afterDifferentSearch).toEqual([cistern]);
    expect(toggleShortlist(afterDifferentSearch, cistern)).toEqual([]);
  });

  it("builds a reviewable AI sourcing context with supplier, price, and link signals", () => {
    const context = buildProcurementContext([cistern, rebar]);

    expect(context).toContain("Marketplace comparison shortlist");
    expect(context).toContain("Cistern package · Wajenzi Stores · Ksh 10,570 · https://supplier.example/cistern");
    expect(context).toContain("D12 reinforcement bar · Marketplace supplier · Ksh 1,780");
    expect(context).toContain("protected-payment considerations");
  });
});
