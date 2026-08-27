import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
source_path = ROOT / "kenya_gazette_2024_203_service_units.csv"
attached_path = Path("/home/ubuntu/upload/kenya_counties_subcounties.csv")
hdx_admin2_path = ROOT / "ken_admin_boundaries/ken_admin2.geojson"
out_path = ROOT / "kenya_gazette_2024_203_service_units_enriched.csv"

def norm(value):
    value = value or ""
    value = value.upper().replace("–", "-").replace("—", "-")
    value = re.sub(r"\s+SUB[- ]COUNTY$", "", value)
    value = re.sub(r"\s*\([^)]*\)", "", value)
    value = re.sub(r"\s*:\s*HEADQUARTERS\s*[-:]?.*$", "", value, flags=re.I)
    value = re.sub(r"[^A-Z0-9]+", " ", value)
    return re.sub(r"\s+", " ", value).strip()

county_candidates = {}
with attached_path.open(encoding="utf-8", newline="") as f:
    for row in csv.DictReader(f):
        key = norm(row["Sub_County"])
        county_candidates.setdefault(key, set()).add(row["County"])

admin2 = json.loads(hdx_admin2_path.read_text(encoding="utf-8"))
for feature in admin2.get("features", []):
    props = feature.get("properties", {})
    key = norm(props.get("adm2_name") or props.get("adm2_ref_name"))
    county = props.get("adm1_name") or props.get("adm1_ref_name") or ""
    if key and county:
        county_candidates.setdefault(key, set()).add(county)

rows = []
with source_path.open(encoding="utf-8", newline="") as f:
    for row in csv.DictReader(f):
        raw = row["name"]
        headquarters = ""
        rename_note = ""
        head_match = re.search(r":\s*Headquarters\s*[-:]?\s*(.*)$", raw, flags=re.I)
        if head_match:
            headquarters = head_match.group(1).strip()
        paren_match = re.search(r"\(([^)]*)\)", raw)
        if paren_match:
            rename_note = paren_match.group(1).strip()
        clean_name = re.sub(r"\s*:\s*Headquarters\s*[-:]?.*$", "", raw, flags=re.I).strip()
        clean_name = re.sub(r"\s*\([^)]*\)", "", clean_name).strip()
        candidate_names = [clean_name]
        if rename_note:
            candidate_names.append(re.sub(r"\s+renamed\s*$", "", rename_note, flags=re.I).strip())
        counties = set()
        for candidate in candidate_names:
            counties.update(county_candidates.get(norm(candidate), set()))
        row["raw_name"] = raw
        row["name"] = clean_name
        row["headquarters_name"] = headquarters
        row["rename_note"] = rename_note
        direct_parent = row.get("parent_county", "").strip()
        if direct_parent and row.get("publication_section") == "county_detail":
            row["parent_match_status"] = "gazette_context"
        else:
            row["parent_county"] = "; ".join(sorted(counties)) if len(counties) == 1 else ""
            row["parent_match_status"] = "matched_reference" if len(counties) == 1 else ("ambiguous_reference" if len(counties) > 1 else "unresolved")
        rows.append(row)

fieldnames = [
    "source_notice", "notice_date", "source_authority", "parent_county", "level", "name", "raw_name",
    "headquarters_name", "rename_note", "parent_name", "parent_level", "publication_section", "source_status",
    "activation_status", "effective_date", "parent_match_status"
]
with out_path.open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

from collections import Counter
print("wrote", out_path.name)
print("rows", len(rows))
print("parent_match_status", dict(Counter(row["parent_match_status"] for row in rows)))
print("top_subcounty_parent_matches", sum(row["publication_section"] == "top_subcounties" and row["parent_match_status"] == "matched_reference" for row in rows))
