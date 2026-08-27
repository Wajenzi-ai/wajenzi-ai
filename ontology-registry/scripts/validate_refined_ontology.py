import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

with (ROOT / "refined-ontology.json").open(encoding="utf-8") as f:
    ontology = json.load(f)

required_groups = {
    "identity_access": {"Person", "UserAccount", "Organization", "OrganizationRole", "OrganizationMembership", "Workspace", "ProjectRoleAssignment"},
    "place_location": {"Site", "Address", "GeoObservation", "GeographicUnit", "BoundaryVersion", "SpatialMembership", "Facility", "Warehouse", "DeliveryZone", "Jurisdiction", "TransportRoute"},
    "project_construction": {"ProjectPhase", "WBSNode", "Activity", "Task", "Milestone", "Building", "BuildingElement"},
    "products_supply": {"Product", "ProductVariant", "ProductSpecification", "ProductOffer", "PriceObservation", "AvailabilityObservation"},
    "quantity_cost": {"ProjectRequirement", "QuantityTakeoff", "Measurement", "Formula", "BOQ", "BOQItem", "Budget", "Commitment", "Expense"},
    "procurement_commerce_finance": {"ProcurementRequest", "RFQ", "Quotation", "PurchaseOrder", "CustomerOrder", "Invoice", "Payment", "Settlement"},
    "logistics": {"DeliveryRequest", "Shipment", "DispatchAssignment", "Delivery", "DeliveryEvent", "ProofOfDelivery"},
    "compliance_trust": {"Contract", "PartyRole", "Obligation", "Permit", "VerificationCase", "ProfessionalRegistration", "TaxProfile"},
    "events_ai_analytics": {"BusinessEvent", "StateTransition", "AuditEvent", "ProvenanceRecord", "AIJob", "Recommendation", "ActionRequest"},
}

classes = set()
for values in ontology["class_groups"].values():
    classes.update(values)

missing = []
for group, required in required_groups.items():
    absent = sorted(required - set(ontology["class_groups"].get(group, [])))
    if absent:
        missing.append(f"{group}: {', '.join(absent)}")

predicates = ontology["predicates"]
required_predicates = {
    "controls", "member_of", "has_organization_role", "assigned_project_role", "on_project",
    "has_site", "has_geo_observation", "spatially_member_of", "falls_under", "administered_by",
    "has_phase", "contains_wbs", "decomposes_into", "contains_activity", "depends_on",
    "has_variant", "offered_by", "available_at", "has_price_observation", "has_availability_observation",
    "requires_specification", "satisfied_by", "generates", "responds_to", "placed_with",
    "settles", "moves", "assigns", "originates_at", "destines_at", "has_estimate", "executes",
    "creates_obligation", "performed_by", "due_by", "tests_or_inspects", "produces_result",
    "corrected_by", "modifies", "supported_by", "caused_by", "affects", "records", "reads",
}
present_predicates = {p["code"] for p in predicates}
missing_predicates = sorted(required_predicates - present_predicates)

files = [
    "ontology-gap-report.md", "refined-ontology.md", "refined-ontology.json",
    "wajenzi-core-ontology.mmd", "wajenzi-identity-location.mmd",
    "wajenzi-project-procurement.mmd", "wajenzi-execution-traceability.mmd",
]
missing_files = [name for name in files if not (ROOT / name).exists()]

# Duplicate predicate codes are permitted when they represent different domain/range signatures,
# but we report them because implementation should normalize them into one vocabulary entry.
code_counts = {}
for p in predicates:
    code_counts[p["code"]] = code_counts.get(p["code"], 0) + 1
duplicate_codes = sorted(code for code, count in code_counts.items() if count > 1)

print(f"classes={len(classes)} predicates={len(predicates)}")
if missing:
    raise SystemExit("Missing required class coverage: " + " | ".join(missing))
if missing_predicates:
    raise SystemExit("Missing required predicates: " + ", ".join(missing_predicates))
if missing_files:
    raise SystemExit("Missing package files: " + ", ".join(missing_files))

print("ontology_json=valid")
print("required_class_coverage=pass")
print("required_predicate_coverage=pass")
print("package_files=present")
print("duplicate_predicate_codes=", ", ".join(duplicate_codes) if duplicate_codes else "none")
print("validation=PASS")
