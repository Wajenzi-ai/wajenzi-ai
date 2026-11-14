import { createHash } from "node:crypto";

export const ENGINE_VERSION = "1.1.0";
export const FORMULA_REGISTRY_VERSION = "WJ-COST-FORMULAS-1.1.0";
const TAX_STATUSES = new Set(["exclusive", "inclusive", "exempt", "zero_rated"]);

function finite(name, value) {
  if (!Number.isFinite(value)) throw new Error(name + " must be finite");
}
function nonNegative(name, value) {
  finite(name, value);
  if (value < 0) throw new Error(name + " must be non-negative");
}
function rate(name, value, max = 1) {
  finite(name, value);
  if (value < 0 || value > max) throw new Error(name + " is outside the permitted range");
}
export function roundMoney(value) {
  finite("money", value);
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
export function normalizeTaxAmount({ amount, rate: taxRate = 0, taxStatus, inputVatRecoverable = false }) {
  nonNegative("tax amount", amount);
  rate("tax rate", taxRate);
  if (taxStatus === "unknown" || !TAX_STATUSES.has(taxStatus)) {
    throw new Error("unknown tax status blocks a firm quote");
  }
  let netAmount = amount, taxAmount = 0, grossAmount = amount;
  if (taxStatus === "exclusive") {
    taxAmount = amount * taxRate;
    grossAmount = amount + taxAmount;
  } else if (taxStatus === "inclusive") {
    netAmount = taxRate === 0 ? amount : amount / (1 + taxRate);
    taxAmount = grossAmount - netAmount;
  }
  const recoverableTax = inputVatRecoverable ? taxAmount : 0;
  const nonRecoverableTax = inputVatRecoverable ? 0 : taxAmount;
  return {
    netAmount: roundMoney(netAmount),
    taxAmount: roundMoney(taxAmount),
    grossAmount: roundMoney(grossAmount),
    recoverableInputVat: roundMoney(recoverableTax),
    nonRecoverableInputVat: roundMoney(nonRecoverableTax),
    costBasis: roundMoney(inputVatRecoverable ? netAmount : grossAmount)
  };
}
export function calculateProcurementQuantity({
  measuredQuantity, assemblyCoefficient = 1, wastageRate = 0,
  wastageIncludedInCoefficient = false
}) {
  nonNegative("measured quantity", measuredQuantity);
  nonNegative("assembly coefficient", assemblyCoefficient);
  rate("wastage rate", wastageRate);
  if (wastageIncludedInCoefficient && wastageRate > 0) {
    throw new Error("wastage would be counted twice");
  }
  const assemblyGrossQuantity = measuredQuantity * assemblyCoefficient;
  const procurementQuantity = assemblyGrossQuantity * (wastageIncludedInCoefficient ? 1 : 1 + wastageRate);
  return {
    assemblyGrossQuantity,
    procurementQuantity,
    appliedWastageRate: wastageIncludedInCoefficient ? 0 : wastageRate
  };
}
export function calculateLocationFactor({ priceBasis = "local_quote", currentIndex, baseIndex }) {
  if (priceBasis === "local_quote") return 1;
  if (priceBasis !== "national_base") throw new Error("unsupported price basis");
  nonNegative("current location index", currentIndex);
  nonNegative("base location index", baseIndex);
  if (currentIndex === 0 || baseIndex === 0) throw new Error("location indices must be positive");
  return currentIndex / baseIndex;
}
export function calculateLandedPrice({
  supplierQuote,
  additionalCharges = [],
  discount = 0,
  deliveryBasis = "ex_works",
  locationIndex = null,
  monthsToNeed = 0,
  escalationRatePerPeriod = 0,
  escalationPeriodMonths = 1,
  priceLocked = false,
  isPriceExposed = true
}) {
  if (!supplierQuote || typeof supplierQuote !== "object") throw new Error("supplier quote is required");
  nonNegative("supplier quote amount", supplierQuote.amount);
  nonNegative("discount", discount);
  nonNegative("months to need", monthsToNeed);
  nonNegative("escalation period months", escalationPeriodMonths);
  if (escalationPeriodMonths === 0) throw new Error("escalation period must be positive");
  finite("escalation rate", escalationRatePerPeriod);
  if (escalationRatePerPeriod <= -1) throw new Error("escalation rate must be greater than -1");
  if (priceLocked && isPriceExposed) throw new Error("fixed-price committed quantity cannot be escalated");
  const factor = locationIndex
    ? calculateLocationFactor({ priceBasis: supplierQuote.priceBasis, ...locationIndex })
    : calculateLocationFactor({ priceBasis: supplierQuote.priceBasis ?? "local_quote" });
  const supplier = normalizeTaxAmount({
    amount: supplierQuote.amount * factor,
    rate: supplierQuote.taxRate ?? 0,
    taxStatus: supplierQuote.taxStatus,
    inputVatRecoverable: supplierQuote.inputVatRecoverable ?? false
  });
  if (!["ex_works", "delivered_to_depot", "delivered_to_site"].includes(deliveryBasis)) {
    throw new Error("invalid delivery basis");
  }
  let netCharges = 0, nonRecoverableTax = supplier.nonRecoverableInputVat;
  let recoverableTax = supplier.recoverableInputVat;
  for (const charge of additionalCharges) {
    nonNegative("charge amount", charge.amount);
    if (deliveryBasis === "delivered_to_site" && charge.kind === "transport") {
      throw new Error("site transport is already included in delivered-to-site quote");
    }
    const normalized = normalizeTaxAmount({
      amount: charge.amount,
      rate: charge.taxRate ?? 0,
      taxStatus: charge.taxStatus,
      inputVatRecoverable: charge.inputVatRecoverable ?? false
    });
    netCharges += normalized.netAmount;
    nonRecoverableTax += normalized.nonRecoverableInputVat;
    recoverableTax += normalized.recoverableInputVat;
  }
  const landedNet = supplier.netAmount + netCharges - discount;
  if (landedNet < 0) throw new Error("discount exceeds landed net cost");
  const periods = monthsToNeed / escalationPeriodMonths;
  const escalationFactor = isPriceExposed && !priceLocked
    ? Math.pow(1 + escalationRatePerPeriod, periods)
    : 1;
  return {
    supplierNetUnitPrice: supplier.netAmount,
    supplierTaxPerUnit: supplier.taxAmount,
    locationFactor: factor,
    landedNetUnitPrice: roundMoney(landedNet),
    nonRecoverableInputVatPerUnit: roundMoney(nonRecoverableTax),
    recoverableInputVatPerUnit: roundMoney(recoverableTax),
    escalationFactor,
    futureNetUnitPrice: roundMoney(landedNet * escalationFactor),
    futureNonRecoverableInputVatPerUnit: roundMoney(nonRecoverableTax * escalationFactor),
    deliveryBasis,
    priceLocked
  };
}
export function calculatePriceExposure({
  requiredQuantity, committedQuantity = 0, fixedContractUnitPrice = null, marketUnitPrice
}) {
  nonNegative("required quantity", requiredQuantity);
  nonNegative("committed quantity", committedQuantity);
  nonNegative("market unit price", marketUnitPrice);
  const lockedQuantity = Math.min(requiredQuantity, committedQuantity);
  if (lockedQuantity > 0 && fixedContractUnitPrice === null) {
    throw new Error("committed quantity requires a contractual unit price");
  }
  if (fixedContractUnitPrice !== null) nonNegative("contract unit price", fixedContractUnitPrice);
  const exposedQuantity = Math.max(0, requiredQuantity - lockedQuantity);
  return {
    committedQuantity: lockedQuantity,
    exposedQuantity,
    committedCost: roundMoney(lockedQuantity * (fixedContractUnitPrice ?? 0)),
    exposedCost: roundMoney(exposedQuantity * marketUnitPrice),
    totalCost: roundMoney(lockedQuantity * (fixedContractUnitPrice ?? 0) + exposedQuantity * marketUnitPrice)
  };
}
export function calculateMaterialLine({
  measuredQuantity, assemblyCoefficient = 1, wastageRate = 0,
  wastageIncludedInCoefficient = false, landedPrice
}) {
  if (!landedPrice) throw new Error("landed price result is required");
  const q = calculateProcurementQuantity({
    measuredQuantity, assemblyCoefficient, wastageRate, wastageIncludedInCoefficient
  });
  return {
    ...q,
    netMaterialCost: roundMoney(q.procurementQuantity * landedPrice.futureNetUnitPrice),
    nonRecoverableInputTax: roundMoney(q.procurementQuantity * landedPrice.futureNonRecoverableInputVatPerUnit),
    recoverableInputVat: roundMoney(q.procurementQuantity * landedPrice.recoverableInputVatPerUnit),
    currency: "KES"
  };
}
export function calculateLabourLine({
  quantity, productivityPerWorkerHour, crewSize = 1, dailyWage,
  paidHoursPerDay = 8
}) {
  nonNegative("work quantity", quantity);
  nonNegative("daily wage", dailyWage);
  for (const [name, value] of Object.entries({ productivityPerWorkerHour, crewSize, paidHoursPerDay })) {
    finite(name, value);
    if (value <= 0) throw new Error(name + " must be positive");
  }
  const workerHours = quantity / productivityPerWorkerHour;
  return {
    workerHours,
    durationDays: Math.ceil(workerHours / (crewSize * paidHoursPerDay) * 100) / 100,
    wagePerWorkerHour: roundMoney(dailyWage / paidHoursPerDay),
    cost: roundMoney(workerHours * dailyWage / paidHoursPerDay)
  };
}
export function calculateEquipmentCost({ operatingHours, hourlyRate, mobilization = 0, fuel = 0 }) {
  for (const [name, value] of Object.entries({ operatingHours, hourlyRate, mobilization, fuel })) nonNegative(name, value);
  return roundMoney(operatingHours * hourlyRate + mobilization + fuel);
}
export function calculateLogisticsCost({
  trips = 0, ratePerTrip = 0, loading = 0, offloading = 0, waiting = 0,
  deliveryBasis = "ex_works"
}) {
  for (const [name, value] of Object.entries({ trips, ratePerTrip, loading, offloading, waiting })) nonNegative(name, value);
  if (deliveryBasis === "delivered_to_site" && trips > 0) {
    throw new Error("separate site logistics duplicates delivered-to-site price");
  }
  return roundMoney(trips * ratePerTrip + loading + offloading + waiting);
}
export function calculateFinanceCost({ monthlyBalances = [], arrangementFees = 0, otherFees = 0 }) {
  nonNegative("arrangement fees", arrangementFees);
  nonNegative("other fees", otherFees);
  const interest = monthlyBalances.reduce((sum, row) => {
    nonNegative("outstanding balance", row.outstandingBalance);
    rate("monthly rate", row.monthlyRate, 10);
    return sum + row.outstandingBalance * row.monthlyRate;
  }, 0);
  return { interest: roundMoney(interest), fees: roundMoney(arrangementFees + otherFees), total: roundMoney(interest + arrangementFees + otherFees) };
}
export function calculateExpectedRisk(risks = []) {
  return roundMoney(risks.reduce((sum, risk) => {
    if (risk.includedElsewhere) return sum;
    const probability = risk.residualProbability ?? risk.probability;
    const impact = risk.residualImpact ?? risk.impact;
    rate("risk probability", probability);
    nonNegative("risk impact", impact);
    return sum + probability * impact;
  }, 0));
}
export function calculateContingency({ eligibleCostBase, rate: contingencyRate }) {
  nonNegative("contingency base", eligibleCostBase);
  rate("contingency rate", contingencyRate);
  return roundMoney(eligibleCostBase * contingencyRate);
}
export function calculateCustomerCommercialPrice({
  forecastDeliveryCost, pricingMode = "markup", rate: pricingRate = 0,
  serviceFees = 0, customerTaxRate = 0, customerTaxStatus = "exclusive"
}) {
  nonNegative("forecast delivery cost", forecastDeliveryCost);
  nonNegative("service fees", serviceFees);
  rate("pricing rate", pricingRate);
  if (pricingMode === "gross_margin" && pricingRate >= 1) throw new Error("gross margin must be below 100%");
  if (!["markup", "gross_margin"].includes(pricingMode)) throw new Error("invalid pricing mode");
  const preServicePrice = pricingMode === "markup"
    ? forecastDeliveryCost * (1 + pricingRate)
    : forecastDeliveryCost / (1 - pricingRate);
  const commercialAmount = preServicePrice + serviceFees;
  const tax = normalizeTaxAmount({
    amount: commercialAmount, rate: customerTaxRate,
    taxStatus: customerTaxStatus, inputVatRecoverable: false
  });
  return {
    forecastDeliveryCost: roundMoney(forecastDeliveryCost),
    pricingMode,
    commercialMargin: roundMoney(preServicePrice - forecastDeliveryCost),
    serviceFees: roundMoney(serviceFees),
    customerTaxableBase: tax.netAmount,
    customerOutputTax: tax.taxAmount,
    customerCommercialPrice: tax.grossAmount
  };
}
export function calculateFundingRequirement({ cashflows = [], openingCash = 0 }) {
  nonNegative("opening cash", openingCash);
  const ordered = cashflows.map((row, index) => ({ ...row, __index: index }));
  if (ordered.every(row => row.periodStart)) ordered.sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  else if (ordered.every(row => Number.isFinite(row.periodIndex))) ordered.sort((a, b) => a.periodIndex - b.periodIndex);
  let balance = openingCash, peakGap = 0;
  const periods = ordered.map(row => {
    nonNegative("planned outflow", row.plannedOutflow);
    nonNegative("planned inflow", row.plannedInflow);
    balance += row.plannedInflow - row.plannedOutflow;
    peakGap = Math.max(peakGap, -balance);
    return {
      period: row.period,
      closingCash: roundMoney(balance),
      cumulativeFundingGap: roundMoney(Math.max(0, -balance))
    };
  });
  return { peakFundingGap: roundMoney(peakGap), closingCash: roundMoney(balance), periods };
}
export function calculateProjectViews(fixture) {
  const direct = roundMoney(fixture.systems.reduce((sum, row) => sum + row.cost, 0));
  const indirect = roundMoney(fixture.indirectCosts.reduce((sum, row) => sum + row.amount, 0));
  const finance = calculateFinanceCost(fixture.finance);
  const risk = calculateExpectedRisk(fixture.risks);
  const contingencyBase = fixture.contingencyEligibleCostBase ?? (direct + indirect);
  const contingency = calculateContingency({ eligibleCostBase: contingencyBase, rate: fixture.contingencyRate });
  const nonRecoverableInputTax = roundMoney((fixture.inputTaxLines ?? []).reduce((sum, row) => {
    const normalized = normalizeTaxAmount(row);
    return sum + normalized.nonRecoverableInputVat;
  }, 0));
  const otherProjectTaxes = roundMoney((fixture.otherProjectTaxes ?? []).reduce((sum, row) => sum + row.amount, 0));
  const forecast = roundMoney(direct + indirect + finance.total + risk + contingency + nonRecoverableInputTax + otherProjectTaxes);
  const customer = fixture.customerPricing
    ? calculateCustomerCommercialPrice({ forecastDeliveryCost: forecast, ...fixture.customerPricing })
    : null;
  const funding = calculateFundingRequirement({ cashflows: fixture.cashflows ?? [], openingCash: fixture.openingCash ?? 0 });
  return {
    currency: fixture.currency ?? "KES",
    technicalConstructionEstimate: direct,
    indirectAndProfessionalCosts: indirect,
    financingCosts: finance.total,
    expectedRiskCost: risk,
    contingencyEligibleBase: roundMoney(contingencyBase),
    residualContingency: contingency,
    nonRecoverableInputTax,
    otherProjectTaxes,
    forecastDeliveryCost: forecast,
    costPerM2: roundMoney(forecast / fixture.floorAreaM2),
    customerCommercialPrice: customer,
    fundingRequirement: funding.peakFundingGap,
    cashflow: funding.periods,
    landExcluded: fixture.landExcluded !== false,
    mockData: fixture.dataStatus === "mock"
  };
}
export function convertQuantity(quantity, fromUnit, toUnit, unitRegistry) {
  nonNegative("quantity", quantity);
  const from = unitRegistry[fromUnit], to = unitRegistry[toUnit];
  if (!from || !to) throw new Error("unknown unit");
  if (JSON.stringify(from.dimension) !== JSON.stringify(to.dimension)) throw new Error("dimensional mismatch");
  return quantity * from.factor / to.factor;
}
export function topologicalSort(nodes) {
  const byId = new Map();
  for (const node of nodes) {
    if (byId.has(node.id)) throw new Error("duplicate graph node: " + node.id);
    byId.set(node.id, node);
  }
  const indegree = new Map(nodes.map(node => [node.id, 0]));
  const dependents = new Map(nodes.map(node => [node.id, []]));
  for (const node of nodes) {
    for (const dep of node.dependsOn ?? []) {
      if (!byId.has(dep)) throw new Error("missing dependency " + dep + " for " + node.id);
      indegree.set(node.id, indegree.get(node.id) + 1);
      dependents.get(dep).push(node.id);
    }
  }
  const queue = nodes.filter(node => indegree.get(node.id) === 0).map(node => node.id);
  const order = [];
  while (queue.length) {
    const id = queue.shift();
    order.push(id);
    for (const next of dependents.get(id)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  if (order.length !== nodes.length) throw new Error("formula dependency cycle detected");
  return order;
}
export function affectedDependencyClosure(nodes, changedIds) {
  const affected = new Set(changedIds);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (!affected.has(node.id) && (node.dependsOn ?? []).some(dep => affected.has(dep))) {
        affected.add(node.id);
        changed = true;
      }
    }
  }
  const order = topologicalSort(nodes);
  return order.filter(id => affected.has(id));
}
export function executeDependencyGraph({ nodes, initialValues = {}, existingValues = {}, changedIds = null }) {
  const order = topologicalSort(nodes);
  const selected = changedIds ? new Set(affectedDependencyClosure(nodes, changedIds)) : new Set(order);
  const values = { ...initialValues, ...existingValues };
  const executed = [];
  for (const id of order) {
    if (!selected.has(id)) continue;
    const node = nodes.find(item => item.id === id);
    const dependencies = Object.fromEntries((node.dependsOn ?? []).map(dep => [dep, values[dep]]));
    if ((node.dependsOn ?? []).some(dep => values[dep] === undefined)) throw new Error("missing value for dependency of " + id);
    values[id] = node.compute(dependencies, values);
    executed.push(id);
  }
  return { values, executed, order };
}
export function validateFormulaRegistry(registry) {
  const keys = new Set();
  for (const formula of registry.formulas) {
    if (keys.has(formula.key)) throw new Error("duplicate formula key: " + formula.key);
    keys.add(formula.key);
  }
  const nodes = registry.formulas.map(formula => ({ id: formula.key, dependsOn: formula.dependsOn ?? [] }));
  return topologicalSort(nodes);
}
function stableStringify(value) {
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stableStringify(value[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}
export function createCalculationSnapshot({ input, result, runNumber, scenarioId = null, seed = null }) {
  const inputText = stableStringify(input), resultText = stableStringify(result);
  const inputHash = createHash("sha256").update(inputText).digest("hex");
  const resultHash = createHash("sha256").update(resultText).digest("hex");
  return {
    runNumber, scenarioId, seed, engineVersion: ENGINE_VERSION,
    formulaRegistryVersion: FORMULA_REGISTRY_VERSION,
    inputSnapshot: input, resultSnapshot: result, inputHash, resultHash
  };
}
function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}
function triangular(random, min, mode, max) {
  const u = random(), c = (mode - min) / (max - min);
  return u < c
    ? min + Math.sqrt(u * (max - min) * (mode - min))
    : max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}
function percentile(values, p) {
  const position = (values.length - 1) * p;
  const low = Math.floor(position), high = Math.ceil(position);
  return values[low] + (values[high] - values[low]) * (position - low);
}
export function runMonteCarlo(base, { iterations = 10000, seed = 20261113 } = {}) {
  if (!Number.isInteger(iterations) || iterations < 100) throw new Error("iterations >= 100 required");
  const random = rng(seed), results = [];
  for (let i = 0; i < iterations; i++) {
    const direct = base.technicalConstructionEstimate * triangular(random, 0.95, 1, 1.15);
    const indirect = base.indirectAndProfessionalCosts * triangular(random, 0.98, 1, 1.08);
    const finance = base.financingCosts * triangular(random, 0.9, 1, 1.25);
    const risk = (base.risks ?? []).reduce((sum, item) => sum + (random() < item.probability ? item.impact : 0), 0);
    const contingency = (direct + indirect) * (base.contingencyRate ?? 0);
    results.push(direct + indirect + finance + risk + contingency + (base.nonRecoverableInputTax ?? 0));
  }
  results.sort((a, b) => a - b);
  return {
    iterations, seed,
    p50: roundMoney(percentile(results, 0.5)),
    p80: roundMoney(percentile(results, 0.8)),
    p90: roundMoney(percentile(results, 0.9)),
    minimum: roundMoney(results[0]),
    maximum: roundMoney(results[results.length - 1]),
    assumptions: [
      "Independent triangular cost multipliers",
      "Bernoulli residual-risk event sampling",
      "No cross-variable correlation in v1.1",
      "Contingency is recalculated on simulated direct plus indirect costs"
    ]
  };
}
