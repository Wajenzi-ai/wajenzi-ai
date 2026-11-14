import test from "node:test";
import assert from "node:assert/strict";
import fixture from "./fixtures/nakuru-bungalow.mock.json" with { type: "json" };
import registry from "../../../docs/cost-intelligence/formula-registry.v1.1.json" with { type: "json" };
import {
  calculateProcurementQuantity, calculateLandedPrice, calculateMaterialLine,
  calculateLabourLine, normalizeTaxAmount, calculateLogisticsCost,
  calculatePriceExposure, calculateProjectViews, calculateCustomerCommercialPrice,
  calculateFundingRequirement, calculateExpectedRisk, calculateContingency,
  calculateLocationFactor, calculateEquipmentCost, convertQuantity,
  topologicalSort, affectedDependencyClosure, executeDependencyGraph,
  calculateSensitivityScenarios, validateFormulaRegistry, createCalculationSnapshot,
  runMonteCarlo
} from "./engine-v1.1.mjs";

test("Nakuru 3-bedroom 120 m2 mock project reconciles all four views", () => {
  const result = calculateProjectViews(fixture);
  assert.equal(result.technicalConstructionEstimate, 8585000);
  assert.equal(result.indirectAndProfessionalCosts, 1300000);
  assert.equal(result.financingCosts, 250000);
  assert.equal(result.expectedRiskCost, 210000);
  assert.equal(result.contingencyEligibleBase, 9885000);
  assert.equal(result.residualContingency, 494250);
  assert.equal(result.forecastDeliveryCost, 10839250);
  assert.equal(result.costPerM2, 90327.08);
  assert.equal(result.fundingRequirement, 10839250);
  assert.equal(result.customerCommercialPrice, null);
  assert.equal(result.mockData, true);
});

test("quantity and cement price preserve precision until line-total boundary", () => {
  const quantity = calculateProcurementQuantity({
    measuredQuantity: 500, assemblyCoefficient: 1, wastageRate: 0.03
  });
  assert.equal(quantity.procurementQuantity, 515);
  const landedPrice = calculateLandedPrice({
    supplierQuote: { amount: 750, taxStatus: "exclusive", taxRate: 0, priceBasis: "local_quote" },
    additionalCharges: [
      { kind: "transport", amount: 35, taxStatus: "exclusive", taxRate: 0 },
      { kind: "handling", amount: 10, taxStatus: "exclusive", taxRate: 0 }
    ],
    discount: 5,
    deliveryBasis: "ex_works",
    monthsToNeed: 2,
    escalationRatePerPeriod: 0.02,
    escalationPeriodMonths: 1
  });
  assert.equal(landedPrice.landedNetUnitPrice, 790);
  assert.equal(landedPrice.futureNetUnitPrice, 821.916);
  const line = calculateMaterialLine({
    measuredQuantity: 500, wastageRate: 0.03, landedPrice
  });
  assert.equal(line.netMaterialCost, 423286.74);
});

test("labour productivity uses worker-hours consistently", () => {
  const result = calculateLabourLine({
    quantity: 235, productivityPerWorkerHour: 0.8,
    crewSize: 2, dailyWage: 1500, paidHoursPerDay: 8
  });
  assert.equal(result.workerHours, 293.75);
  assert.equal(result.durationDays, 18.36);
  assert.equal(result.cost, 55078.13);
});

test("tax normalisation separates recoverable and non-recoverable input VAT", () => {
  const exclusive = normalizeTaxAmount({
    amount: 100000, rate: 0.16, taxStatus: "exclusive", inputVatRecoverable: true
  });
  assert.equal(exclusive.netAmount, 100000);
  assert.equal(exclusive.taxAmount, 16000);
  assert.equal(exclusive.grossAmount, 116000);
  assert.equal(exclusive.costBasis, 100000);
  assert.equal(exclusive.recoverableInputVat, 16000);
  const inclusive = normalizeTaxAmount({
    amount: 116000, rate: 0.16, taxStatus: "inclusive", inputVatRecoverable: false
  });
  assert.equal(inclusive.netAmount, 100000);
  assert.equal(inclusive.taxAmount, 16000);
  assert.equal(inclusive.grossAmount, 116000);
  assert.equal(inclusive.costBasis, 116000);
  assert.equal(inclusive.nonRecoverableInputVat, 16000);
  assert.throws(() => normalizeTaxAmount({
    amount: 100, rate: 0.16, taxStatus: "unknown"
  }), /unknown tax status/);
});

test("delivered-to-site quote cannot receive a second transport charge", () => {
  assert.throws(() => calculateLandedPrice({
    supplierQuote: { amount: 1000, taxStatus: "exclusive", priceBasis: "local_quote" },
    additionalCharges: [{ kind: "transport", amount: 100, taxStatus: "exclusive" }],
    deliveryBasis: "delivered_to_site"
  }), /already included/);
  assert.throws(() => calculateLogisticsCost({
    trips: 1, ratePerTrip: 1000, deliveryBasis: "delivered_to_site"
  }), /duplicates delivered-to-site/);
});

test("location index only adjusts national base prices", () => {
  assert.equal(calculateLocationFactor({
    priceBasis: "national_base", currentIndex: 120, baseIndex: 100
  }), 1.2);
  assert.equal(calculateLocationFactor({
    priceBasis: "local_quote", currentIndex: 120, baseIndex: 100
  }), 1);
});

test("fixed committed quantities are protected from market repricing", () => {
  const base = calculatePriceExposure({
    requiredQuantity: 100, committedQuantity: 60,
    fixedContractUnitPrice: 700, marketUnitPrice: 800
  });
  const changed = calculatePriceExposure({
    requiredQuantity: 100, committedQuantity: 60,
    fixedContractUnitPrice: 700, marketUnitPrice: 900
  });
  assert.equal(base.committedCost, 42000);
  assert.equal(changed.committedCost, 42000);
  assert.equal(base.totalCost, 74000);
  assert.equal(changed.totalCost, 78000);
});

test("expected risk uses residual exposure and excludes transferred risk", () => {
  assert.equal(calculateExpectedRisk([
    { probability: 0.5, impact: 100000, residualProbability: 0.2, residualImpact: 50000 },
    { probability: 1, impact: 20000, includedElsewhere: true }
  ]), 10000);
  assert.equal(calculateContingency({ eligibleCostBase: 9885000, rate: 0.05 }), 494250);
});

test("customer pricing distinguishes markup from gross margin and stays outside forecast", () => {
  const markup = calculateCustomerCommercialPrice({
    forecastDeliveryCost: 1000000, pricingMode: "markup",
    rate: 0.15, serviceFees: 25000, customerTaxRate: 0.16,
    customerTaxStatus: "exclusive"
  });
  assert.equal(markup.commercialMargin, 150000);
  assert.equal(markup.customerCommercialPrice, 1363000);
  const grossMargin = calculateCustomerCommercialPrice({
    forecastDeliveryCost: 1000000, pricingMode: "gross_margin",
    rate: 0.15, serviceFees: 0, customerTaxRate: 0,
    customerTaxStatus: "exclusive"
  });
  assert.equal(grossMargin.commercialMargin, 176470.59);
  assert.equal(grossMargin.customerCommercialPrice, 1176470.59);
});

test("cashflow periods are ordered and funding is the peak cumulative deficit", () => {
  const result = calculateFundingRequirement({
    openingCash: 100000,
    cashflows: [
      { period: "M2", periodIndex: 2, plannedOutflow: 200000, plannedInflow: 250000 },
      { period: "M1", periodIndex: 1, plannedOutflow: 300000, plannedInflow: 0 }
    ]
  });
  assert.equal(result.peakFundingGap, 200000);
  assert.equal(result.closingCash, -150000);
});

test("dependency graph is ordered, selective and cycle-safe", () => {
  const nodes = [
    { id: "material", kind: "input", dependsOn: [] },
    { id: "labour", kind: "input", dependsOn: [] },
    { id: "direct", dependsOn: ["material", "labour"], compute: d => d.material + d.labour },
    { id: "forecast", dependsOn: ["direct"], compute: d => d.direct + 20 }
  ];
  assert.deepEqual(topologicalSort(nodes), ["material", "labour", "direct", "forecast"]);
  assert.deepEqual(affectedDependencyClosure(nodes, ["material"]), ["material", "direct", "forecast"]);
  const full = executeDependencyGraph({ nodes, initialValues: { material: 10, labour: 5 } });
  assert.equal(full.values.forecast, 35);
  const selective = executeDependencyGraph({
    nodes, initialValues: { material: 10 }, existingValues: { material: 1, labour: 5, direct: 15, forecast: 35 },
    changedIds: ["material"]
  });
  assert.deepEqual(selective.executed, ["direct", "forecast"]);
  assert.throws(() => topologicalSort([
    { id: "a", dependsOn: ["b"] }, { id: "b", dependsOn: ["a"] }
  ]), /cycle/);
  assert.throws(() => topologicalSort([
    { id: "a", dependsOn: ["missing"] }
  ]), /missing dependency/);
  assert.throws(() => affectedDependencyClosure(nodes, ["not-a-node"]), /unknown changed dependency/);
});

test("formula registry dependencies validate without cycles or duplicate keys", () => {
  assert.ok(validateFormulaRegistry(registry).length > 0);
});

test("calculation snapshots are reproducible and hashes ignore object key order", () => {
  const a = createCalculationSnapshot({
    input: { z: 1, a: 2 }, result: { total: 3 }, runNumber: 1
  });
  const b = createCalculationSnapshot({
    input: { a: 2, z: 1 }, result: { total: 3 }, runNumber: 1
  });
  assert.equal(a.inputHash, b.inputHash);
  assert.equal(a.resultHash, b.resultHash);
});

test("seeded P50/P80/P90 outputs are reproducible and ordered", () => {
  const base = {
    technicalConstructionEstimate: 8585000,
    indirectAndProfessionalCosts: 1300000,
    financingCosts: 250000,
    contingencyRate: 0.05,
    risks: fixture.risks
  };
  const a = runMonteCarlo(base, { iterations: 10000, seed: 20261113 });
  const b = runMonteCarlo(base, { iterations: 10000, seed: 20261113 });
  assert.deepEqual(a, b);
  assert.ok(a.p50 <= a.p80 && a.p80 <= a.p90);
  assert.ok(a.minimum <= a.p50 && a.p90 <= a.maximum);
  assert.equal(a.p50, fixture.expected.monteCarlo.p50);
  assert.equal(a.p80, fixture.expected.monteCarlo.p80);
  assert.equal(a.p90, fixture.expected.monteCarlo.p90);
});


test("inclusive supplier discount is applied before VAT decomposition", () => {
  const landed = calculateLandedPrice({
    supplierQuote: {
      amount: 116000, taxStatus: "inclusive", taxRate: 0.16,
      inputVatRecoverable: false, priceBasis: "local_quote"
    },
    discount: 1160,
    deliveryBasis: "ex_works"
  });
  assert.equal(landed.landedNetUnitPrice, 99000);
  assert.equal(landed.nonRecoverableInputVatPerUnit, 15840);
});

test("supplier quote delivery basis is authoritative and conflicting overrides fail", () => {
  assert.throws(() => calculateLandedPrice({
    supplierQuote: { amount: 1000, taxStatus: "exclusive", deliveryBasis: "delivered_to_site" },
    additionalCharges: [{ kind: "transport", amount: 100, taxStatus: "exclusive" }]
  }), /already included/);
  assert.throws(() => calculateLandedPrice({
    supplierQuote: { amount: 1000, taxStatus: "exclusive", deliveryBasis: "delivered_to_site" },
    deliveryBasis: "ex_works"
  }), /conflicts with supplier quote/);
});

test("fuel cannot be charged twice when included in equipment hire rate", () => {
  assert.throws(() => calculateEquipmentCost({
    operatingHours: 10, hourlyRate: 1500, fuel: 5000, hourlyRateIncludesFuel: true
  }), /already included/);
});

test("committed quantity cannot exceed requirement without explicit reclassification", () => {
  assert.throws(() => calculatePriceExposure({
    requiredQuantity: 10, committedQuantity: 11,
    fixedContractUnitPrice: 700, marketUnitPrice: 800
  }), /exceeds required quantity/);
  const exposedCommitment = calculatePriceExposure({
    requiredQuantity: 10, committedQuantity: 5, marketUnitPrice: 900,
    committedPriceExposed: true
  });
  assert.equal(exposedCommitment.committedCost, 4500);
  assert.equal(exposedCommitment.exposedCost, 4500);
});

test("customer tax-inclusive presentation adds tax to pre-tax commercial target", () => {
  const result = calculateCustomerCommercialPrice({
    forecastDeliveryCost: 1000000, pricingMode: "markup", rate: 0.1,
    serviceFees: 0, customerTaxRate: 0.16, customerTaxStatus: "inclusive"
  });
  assert.equal(result.customerTaxableBase, 1100000);
  assert.equal(result.customerOutputTax, 176000);
  assert.equal(result.customerDisplayedPrice, 1276000);
  assert.equal(result.customerGrossPayable, 1276000);
});

test("unit conversion checks dimensions and compatible base units", () => {
  const units = {
    kg: { dimension: { mass: 1 }, base: "kg", factor: 1 },
    t: { dimension: { mass: 1 }, base: "kg", factor: 1000 },
    hr: { dimension: { time: 1 }, base: "hr", factor: 1 },
    month: { dimension: { calendar: 1 }, base: "month", factor: 1 }
  };
  assert.equal(convertQuantity(2, "t", "kg", units), 2000);
  assert.throws(() => convertQuantity(1, "t", "hr", units), /dimensional mismatch/);
  assert.throws(() => convertQuantity(1, "month", "hr", units), /dimensional mismatch/);
});

test("formula registry rejects duplicate producers and version drift", () => {
  const duplicate = structuredClone(registry);
  duplicate.formulas[1].output = duplicate.formulas[0].output;
  assert.throws(() => validateFormulaRegistry(duplicate), /duplicate.*output symbol/);
  const drift = structuredClone(registry);
  drift.formulas[0].version = "1.0.0";
  assert.throws(() => validateFormulaRegistry(drift), /version mismatch/);
});

test("sensitivity analysis recalculates only downstream formula nodes", () => {
  const nodes = [
    { id: "cementPrice", dependsOn: [] },
    { id: "steelPrice", dependsOn: [] },
    { id: "materials", dependsOn: ["cementPrice", "steelPrice"], compute: d => d.cementPrice + d.steelPrice },
    { id: "forecast", dependsOn: ["materials"], compute: d => d.materials + 100 }
  ];
  const baselineValues = { cementPrice: 50, steelPrice: 30, materials: 80, forecast: 180 };
  const result = calculateSensitivityScenarios({
    nodes, baselineValues, resultNodeId: "forecast",
    scenarios: [{ id: "cement_up_10", label: "Cement +10%", changedIds: ["cementPrice"], changedValues: { cementPrice: 55 } }]
  });
  assert.deepEqual(result[0].recalculatedNodes, ["materials", "forecast"]);
  assert.equal(result[0].scenarioValue, 185);
  assert.equal(result[0].delta, 5);
  assert.equal(result[0].deltaPercent, 2.78);
});
