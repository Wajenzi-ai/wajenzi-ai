import test from "node:test";
import assert from "node:assert/strict";
import fixture from "./fixtures/nakuru-bungalow.mock.json" with { type: "json" };
import {calculateMaterialLine,calculateLabourLine,calculateTax,calculateProject,calculateExpectedRisk,calculateContingency,calculateCommercialPrice,calculateFundingRequirement,runMonteCarlo} from "./engine.mjs";

test("mock project reconciles to the agreed pre-tax total",()=>{
 const r=calculateProject(fixture);
 assert.equal(r.technicalConstructionEstimate,8585000);
 assert.equal(r.indirectAndProfessionalCosts,1300000);
 assert.equal(r.financingCosts,250000);
 assert.equal(r.expectedRiskCost,210000);
 assert.equal(r.contingencyEligibleBase,9885000);
 assert.equal(r.residualContingency,494250);
 assert.equal(r.preTaxForecastDeliveryCost,10839250);
 assert.equal(r.costPerM2,90327.08);
 assert.equal(r.landExcluded,true);
 assert.equal(r.mockData,true);
});
test("cement procurement includes wastage, landed price and escalation",()=>{
 const r=calculateMaterialLine(fixture.cementExample);
 assert.equal(r.procurementQuantity,515);
 assert.equal(r.landedBaseUnitPrice,790);
 assert.equal(r.futureUnitPrice,821.76);
 assert.equal(r.total,423206.4);
});
test("walling labour calculates worker hours and exact labour cost",()=>{
 const r=calculateLabourLine(fixture.wallingLabourExample);
 assert.equal(r.workerHours,293.75);
 assert.equal(r.durationDays,18.36);
 assert.equal(r.cost,55078.13);
});
test("tax supports inclusive, exclusive and exempt treatment",()=>{
 assert.deepEqual(calculateTax({amount:100000,rate:.16,taxStatus:"exclusive"}),{taxableBase:100000,tax:16000,gross:116000});
 assert.deepEqual(calculateTax({amount:116000,rate:.16,taxStatus:"inclusive"}),{taxableBase:100000,tax:16000,gross:116000});
 assert.deepEqual(calculateTax({amount:100000,rate:.16,taxStatus:"exempt"}),{taxableBase:100000,tax:0,gross:100000});
});
test("risk and contingency remain distinct",()=>{
 assert.equal(calculateExpectedRisk(fixture.risks),210000);
 assert.equal(calculateContingency({eligibleCostBase:9885000,rate:.05}),494250);
});
test("commercial price adds margin and service fee outside delivery cost",()=>{
 const r=calculateCommercialPrice({forecastDeliveryCost:1000000,marginBase:500000,marginRate:.15,serviceFees:25000,taxRate:.16});
 assert.equal(r.deliveryCost,1000000);assert.equal(r.margin,75000);
 assert.equal(r.customerPriceBeforeTax,1100000);assert.equal(r.customerTax,176000);assert.equal(r.customerPrice,1276000);
});
test("funding requirement is peak cumulative deficit",()=>{
 const r=calculateFundingRequirement({openingCash:100000,cashflows:[{period:"M1",plannedOutflow:300000,plannedInflow:0},{period:"M2",plannedOutflow:200000,plannedInflow:250000}]});
 assert.equal(r.peakFundingGap,400000);assert.equal(r.closingCash,-150000);
});
test("seeded Monte Carlo output is reproducible and ordered",()=>{
 const base={technicalConstructionEstimate:8585000,indirectAndProfessionalCosts:1300000,financingCosts:250000,contingencyRate:.05,risks:fixture.risks};
 const a=runMonteCarlo(base,{iterations:2000,seed:42}),b=runMonteCarlo(base,{iterations:2000,seed:42});
 assert.deepEqual(a,b);assert.ok(a.p50<=a.p80&&a.p80<=a.p90);
});
test("invalid tax status and negative quantities are rejected",()=>{
 assert.throws(()=>calculateTax({amount:100,rate:.16,taxStatus:"unknown"}));
 assert.throws(()=>calculateMaterialLine({baseQuantity:-1,supplierPrice:5}));
});
