from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).parent

ontology = json.loads((ROOT / "ontology.json").read_text())
classes = {item["code"] for item in ontology["classes"]}
missing = set()
for predicate in ontology["predicates"]:
    for key in ("domain", "range"):
        for class_code in predicate[key]:
            if class_code != "*" and class_code not in classes:
                missing.add(class_code)

if missing:
    raise SystemExit(f"Ontology references undefined classes: {sorted(missing)}")

required_files = {
    "ontology-and-id-registry.md",
    "ontology.json",
    "registry_schema.sql",
    "seed.sql",
    "registry-api.openapi.yaml",
    "README.md",
}
actual_files = {path.name for path in ROOT.iterdir() if path.is_file()}
missing_files = required_files - actual_files
if missing_files:
    raise SystemExit(f"Missing required files: {sorted(missing_files)}")

schema = (ROOT / "registry_schema.sql").read_text()
for required_token in (
    "CREATE TABLE IF NOT EXISTS registry_entity",
    "CREATE TABLE IF NOT EXISTS registry_identifier",
    "CREATE TABLE IF NOT EXISTS product_listing",
    "CREATE TABLE IF NOT EXISTS relationship_assertion",
    "CREATE OR REPLACE FUNCTION resolve_identifier",
    "CREATE OR REPLACE FUNCTION resolve_entity",
):
    if required_token not in schema:
        raise SystemExit(f"Schema missing required token: {required_token}")

api = (ROOT / "registry-api.openapi.yaml").read_text()
for required_path in (
    "/registry/entities:",
    "/registry/identifiers/resolve:",
    "/registry/assertions:",
    "/registry/merges:",
):
    if required_path not in api:
        raise SystemExit(f"API contract missing required path: {required_path}")

print("Foundation validation passed")
print(f"Ontology classes: {len(classes)}")
print(f"Ontology predicates: {len(ontology['predicates'])}")
print(f"Files checked: {len(required_files)}")
