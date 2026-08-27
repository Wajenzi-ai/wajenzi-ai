import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
errors = []

def load_json(name):
    try:
        return json.loads((ROOT / name).read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"{name}: invalid JSON: {exc}")
        return {}

def load_csv(name):
    try:
        with (ROOT / name).open(encoding="utf-8", newline="") as f:
            return list(csv.DictReader(f))
    except Exception as exc:
        errors.append(f"{name}: invalid CSV: {exc}")
        return []

manifest = load_json("public-data-source-manifest.json")
ontology = load_json("refined-ontology.json")
admin = load_csv("kenya_cod_ab_units.csv")
wards = load_csv("kenya_hdx_wards_reference.csv")
gb = load_csv("kenya_geoboundaries_adm3_reference.csv")
crosswalk = load_csv("kenya_ward_crosswalk_geoboundaries_to_hdx.csv")
gazette = load_csv("kenya_gazette_2024_203_service_units_enriched.csv")
ppra = load_csv("ppra_mrg_april_2026_construction_reference.csv")
knbs = load_csv("knbs_cipi_q2_2026_reference.csv")

if ontology.get("version") != "0.4.0":
    errors.append("refined-ontology.json: expected version 0.4.0")
if len(admin) != 338:
    errors.append(f"kenya_cod_ab_units.csv: expected 338 rows, got {len(admin)}")
if Counter(row["level"] for row in admin) != Counter({"admin0": 1, "admin1": 47, "admin2": 290}):
    errors.append("kenya_cod_ab_units.csv: level counts do not equal 1/47/290")
if len({row["source_pcode"] for row in admin}) != len(admin):
    errors.append("kenya_cod_ab_units.csv: source pcodes are not unique")
if len(wards) != 1450:
    errors.append(f"kenya_hdx_wards_reference.csv: expected 1450 rows, got {len(wards)}")
nonempty_uids = [row["dhis2_uid"] for row in wards if row["dhis2_uid"]]
if len(nonempty_uids) != 1448 or len(set(nonempty_uids)) != 1448:
    errors.append("kenya_hdx_wards_reference.csv: expected 1,448 unique nonempty DHIS2 UIDs")
if sum(not row["dhis2_uid"] for row in wards) != 2:
    errors.append("kenya_hdx_wards_reference.csv: expected two blank DHIS2 UIDs to be flagged")
if len({row["source_record_id"] for row in wards}) != len(wards):
    errors.append("kenya_hdx_wards_reference.csv: deterministic source_record_id values are not unique")
if len(gb) != 1452 or len({row["boundary_id"] for row in gb}) != 1452:
    errors.append("kenya_geoboundaries_adm3_reference.csv: expected 1452 unique boundary IDs")
if len(crosswalk) != 1452:
    errors.append(f"kenya_ward_crosswalk_geoboundaries_to_hdx.csv: expected 1452 rows, got {len(crosswalk)}")
if Counter(row["match_method"] for row in crosswalk) != Counter({"representative_point_in_hdx_polygon": 1444, "unique_normalized_name": 6, "unmatched": 2}):
    errors.append("ward crosswalk: unexpected match-method distribution")
if len(gazette) != 669:
    errors.append(f"Gazette enriched CSV: expected 669 rows, got {len(gazette)}")
if Counter(row["level"] for row in gazette) != Counter({"service_delivery_subcounty": 125, "service_delivery_sublocation": 314, "service_delivery_location": 171, "service_delivery_division": 59}):
    errors.append("Gazette enriched CSV: unexpected level distribution")
if len(ppra) != 98 or Counter(row["category"] for row in ppra) != Counter({"Waterworks": 71, "Building Materials": 27}):
    errors.append("PPRA construction reference: expected 27 building-material and 71 waterworks rows")
if any(row["currency_code"] != "KES" for row in ppra):
    errors.append("PPRA construction reference: non-KES row found")
if len(knbs) != 16 or any(row["period"] != "2026-Q2" or row["base_period"] != "2019-Q4=100" for row in knbs):
    errors.append("KNBS CIPI reference: expected 16 Q2-2026 rows with Q4 2019=100 base")

expected_hashes = {
    "ken_admin_boundaries.geojson.zip": "ee7c9f02eb91f902ac53aa3be63d9cd195fbfc60eb56a6cc9c240b4a39767d18",
    "geoboundaries-KEN-ADM3.geojson": "dab67459389bb7c4d93337ebd042d9b8c3e532223e01cf97d45748ca3e681db5",
    "kenya_wards_hdx.zip": "13e0dee1a1c731fbb2eb03f0c28468d202fdc174279a104064f05740cc281206",
    "ppra_mrg_april_2026.pdf": "9424f87508423b249c03d7f3c141ddaeec07a500a3e4fe61c9cb8e10ddb01a46",
}
for name, expected in expected_hashes.items():
    path = ROOT / name
    if not path.exists():
        errors.append(f"missing downloaded source: {name}")
        continue
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != expected:
        errors.append(f"{name}: hash changed; expected {expected}, got {digest}")

if errors:
    print("FAILED")
    for error in errors:
        print("-", error)
    raise SystemExit(1)

print("PASSED")
print("admin_units", len(admin), dict(Counter(row["level"] for row in admin)))
print("hdx_wards", len(wards))
print("geoboundaries_adm3", len(gb))
print("crosswalk", dict(Counter(row["match_method"] for row in crosswalk)))
print("gazette", len(gazette), dict(Counter(row["level"] for row in gazette)))
print("ppra_construction", len(ppra), dict(Counter(row["category"] for row in ppra)))
print("knbs_cipi", len(knbs))
print("manifest_sources", len(manifest.get("sources", [])))
