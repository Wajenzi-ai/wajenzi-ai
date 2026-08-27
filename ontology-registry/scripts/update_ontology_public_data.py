import json
from pathlib import Path

path = Path(__file__).resolve().parent / "refined-ontology.json"
data = json.loads(path.read_text(encoding="utf-8"))
data["version"] = "0.4.0"
data["status"] = "draft-with-public-reference-data"

def add_unique(group, names):
    for name in names:
        if name not in group:
            group.append(name)

add_unique(data["class_groups"]["place_location"], [
    "PostalReference", "RoadInventoryObservation", "RoadConditionObservation", "Postcode"
])
add_unique(data["class_groups"]["classification_knowledge"], [
    "ProcurementRegime", "StandardDocumentFamily", "StandardDocumentVersion", "MarketReferenceGuide",
    "MarketReferenceObservation", "CostIndexSeries", "CostIndexObservation", "ProductClass", "LabourClass", "EquipmentClass"
])
add_unique(data["class_groups"]["information_evidence"], [
    "EIAReport", "ConsultationRecord", "DirectorDisclosure", "MasterProductRecord", "SupplierProductSubmission", "CanonicalizationCandidate", "CanonicalizationDecision", "ProductIdentityKey", "CatalogueImportBatch"
])
add_unique(data["class_groups"]["classification_knowledge"], [
    "MasterCatalogue", "CatalogueAuthority"
])
add_unique(data["class_groups"]["compliance_trust"], [
    "NCAProjectRegistration", "NCAContractorRegistration", "NCAPractisingLicence", "EnvironmentalAssessment",
    "EIALicence", "EnvironmentalAudit", "EnvironmentalManagementPlan", "NEMAExpertCredential",
    "StandardDocumentApproval", "ProcuringEntity", "AwardedSupplier", "TenderNotice", "ProcurementAward", "AwardLine"
])

new_predicates = [
    {"code": "has_postcode", "domain": ["Address", "PostOffice", "PostalReference"], "range": ["Postcode", "PostalArea"]},
    {"code": "supports_route", "domain": ["RoadInventoryObservation", "RoadConditionObservation"], "range": ["RoadSegment"]},
    {"code": "has_road_observation", "domain": ["RoadSegment"], "range": ["RoadInventoryObservation", "RoadConditionObservation"]},
    {"code": "has_project_registration", "domain": ["Project"], "range": ["NCAProjectRegistration"]},
    {"code": "registers_project", "domain": ["NCAProjectRegistration"], "range": ["Project"]},
    {"code": "requires_environmental_assessment", "domain": ["Project", "Site"], "range": ["EnvironmentalAssessment"]},
    {"code": "has_eia_licence", "domain": ["EnvironmentalAssessment"], "range": ["EIALicence"]},
    {"code": "has_environmental_audit", "domain": ["Project", "Site"], "range": ["EnvironmentalAudit"]},
    {"code": "issued_by", "domain": ["Permit", "EIALicence", "Credential", "NCAPractisingLicence", "StandardDocumentVersion"], "range": ["Authority"]},
    {"code": "has_standard_document", "domain": ["ProcurementRegime", "StandardDocumentFamily"], "range": ["StandardDocumentVersion"]},
    {"code": "uses_procurement_regime", "domain": ["Project", "ProcurementRequest", "TenderNotice"], "range": ["ProcurementRegime"]},
    {"code": "references", "domain": ["MarketReferenceGuide", "CostIndexSeries", "CostEstimate", "Rate"], "range": ["MarketReferenceObservation", "CostIndexObservation", "MarketReferenceGuide", "CostIndexSeries"]},
    {"code": "has_reference_observation", "domain": ["MarketReferenceGuide", "CostIndexSeries"], "range": ["MarketReferenceObservation", "CostIndexObservation"]},
    {"code": "sampled_in", "domain": ["MarketReferenceObservation"], "range": ["GeographicUnit", "PostalArea", "Place"]},
    {"code": "awards_contract", "domain": ["ProcuringEntity", "TenderNotice"], "range": ["ProcurementAward", "Contract"]},
    {"code": "awarded_to", "domain": ["ProcurementAward", "AwardLine"], "range": ["Organization", "AwardedSupplier"]},
    {"code": "discloses", "domain": ["AwardedSupplier", "Organization"], "range": ["DirectorDisclosure", "BeneficialOwnership"]},
    {"code": "has_award_line", "domain": ["ProcurementAward"], "range": ["AwardLine"]},
    {"code": "crosswalk_confidence", "domain": ["Crosswalk"], "range": ["ConfidenceScore"]},
    {"code": "contains_master_record", "domain": ["MasterCatalogue", "CatalogueAuthority"], "range": ["MasterProductRecord"]},
    {"code": "authoritative_for", "domain": ["CatalogueAuthority"], "range": ["Product", "ProductVariant", "ProductIdentityKey"]},
    {"code": "instantiates_canonical_product", "domain": ["MasterProductRecord"], "range": ["Product"]},
    {"code": "instantiates_canonical_variant", "domain": ["MasterProductRecord"], "range": ["ProductVariant"]},
    {"code": "submits_product", "domain": ["Organization", "SupplierProductSubmission"], "range": ["SupplierProductSubmission", "ProductOffer"]},
    {"code": "candidate_for", "domain": ["SupplierProductSubmission"], "range": ["CanonicalizationCandidate"]},
    {"code": "resolves_to", "domain": ["SupplierProductSubmission", "CanonicalizationCandidate"], "range": ["Product", "ProductVariant"]},
    {"code": "skips_canonical_creation", "domain": ["CanonicalizationDecision"], "range": ["Product", "ProductVariant"]},
    {"code": "creates_canonical_product", "domain": ["CanonicalizationDecision"], "range": ["Product", "ProductVariant"]},
    {"code": "requires_steward_approval", "domain": ["CanonicalizationCandidate", "CanonicalizationDecision"], "range": ["Approval", "Person", "UserAccount"]},
    {"code": "uses_match_signal", "domain": ["CanonicalizationCandidate"], "range": ["ProductIdentityKey", "ClassificationAssignment", "Evidence"]},
    {"code": "has_identity_key", "domain": ["Product", "ProductVariant"], "range": ["ProductIdentityKey"]},
    {"code": "has_catalogue_import", "domain": ["CatalogueAuthority", "MasterCatalogue"], "range": ["CatalogueImportBatch"]},
    {"code": "has_source_row", "domain": ["CatalogueImportBatch"], "range": ["MasterProductRecord"]},
    {"code": "preserves_source_identity", "domain": ["MasterProductRecord", "SupplierProductSubmission"], "range": ["ExternalIdentifier", "SourceRecord"]}
]
existing = {p["code"] for p in data["predicates"]}
for predicate in new_predicates:
    if predicate["code"] not in existing:
        data["predicates"].append(predicate)

req = data.setdefault("provenance_requirements", {})
fields = req.setdefault("required_fields", [])
if "license_or_terms" not in fields:
    fields.append("license_or_terms")
req["required_for_public_reference_data"] = True

path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print("updated", path.name, "version", data["version"])
print("classes", sum(len(v) for v in data["class_groups"].values()))
print("predicates", len(data["predicates"]))
