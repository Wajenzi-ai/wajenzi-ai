import csv
import re
from pathlib import Path

source = Path(__file__).resolve().parent / "kenya_gazette_2024_203_raw.txt"
out = Path(__file__).resolve().parent / "kenya_gazette_2024_203_service_units.csv"
text = source.read_text(encoding="utf-8")
start = text.find("GAZETTE NOTICE NO. 15341")
end = text.find("GAZETTE NOTICE NO. 15342", start)
if start < 0 or end < 0:
    raise SystemExit("Gazette Notice span not found")
lines = [line.strip() for line in text[start:end].splitlines()]

rows = []
current_county = None
current_subcounty = None
current_category = None
in_top_subcounties = False

def normalize_name(value):
    value = re.sub(r"\s+", " ", value).strip(" .")
    value = value.replace("–", "-").replace("—", "-")
    return value

def add_row(level, name, parent_name, parent_level, section, source_status):
    name = normalize_name(name)
    if not name or name.lower() in {"locations", "sub-locations", "divisions"}:
        return
    rows.append({
        "source_notice": "Gazette Notice No. 15341 of 2024",
        "notice_date": "2024-11-22",
        "source_authority": "Kenya Law / Government of Kenya",
        "parent_county": current_county or "",
        "level": level,
        "name": name,
        "parent_name": parent_name or "",
        "parent_level": parent_level or "",
        "publication_section": section,
        "source_status": source_status,
        "activation_status": "unconfirmed",
        "effective_date": "2024-11-22",
    })

for line in lines:
    if not line:
        continue
    if line in {"Sub-counties", "DIVISIONS, LOCATIONS AND SUB-LOCATIONS"}:
        in_top_subcounties = line == "Sub-counties"
        current_category = None
        continue
    county_match = re.match(r"^[A-Z]{1,3}\.\s+(.+?\s+COUNTY)$", line, re.I)
    if county_match:
        current_county = normalize_name(county_match.group(1))
        current_subcounty = None
        current_category = None
        in_top_subcounties = False
        continue
    if in_top_subcounties:
        top_item = re.match(r"^\d+\.\s+(.+)$", line)
        if top_item:
            add_row("service_delivery_subcounty", top_item.group(1), None, "country_or_county_unresolved", "top_subcounties", "proposed_administrative_units")
            continue

    subcounty_match = re.match(r"^(\d+)\.\s+(.+?\s+SUB[-–]COUNTY)\s*$", line, re.I)
    if subcounty_match:
        raw = normalize_name(subcounty_match.group(2))
        current_subcounty = raw
        section = "top_subcounties" if in_top_subcounties else "county_detail"
        status = "proposed_administrative_units" if in_top_subcounties else "listed_service_delivery_unit"
        add_row("service_delivery_subcounty", raw, current_county, "county", section, status)
        current_category = None
        continue
    category_match = re.match(r"^(Divisions?|Locations?|Sub[-–]locations?)\s*:\s*$", line, re.I)
    if category_match:
        category = category_match.group(1).lower().replace("–", "-")
        if category.startswith("division"):
            current_category = "service_delivery_division"
        elif category.startswith("sub-"):
            current_category = "service_delivery_sublocation"
        else:
            current_category = "service_delivery_location"
        in_top_subcounties = False
        continue
    if current_category and current_subcounty:
        item_match = re.match(r"^\d+[\.)]\s*(.+)$", line)
        if item_match:
            add_row(current_category, item_match.group(1), current_subcounty, "service_delivery_subcounty", "county_detail", "listed_service_delivery_unit")

# Try to attach top-level proposed names to a unique county-detail spelling when possible.
def match_key(value):
    value = normalize_name(value)
    value = re.sub(r"\s+SUB[-–]COUNTY$", "", value, flags=re.I)
    value = re.sub(r"\s*\([^)]*\)", "", value)
    return value.strip()

for row in rows:
    if row["publication_section"] != "top_subcounties":
        continue
    matches = [detail for detail in rows if detail["publication_section"] == "county_detail" and detail["level"] == "service_delivery_subcounty" and match_key(detail["name"]) == match_key(row["name"])]
    if len(matches) == 1:
        row["parent_county"] = matches[0]["parent_county"]
        row["parent_name"] = matches[0]["parent_name"]
        row["parent_level"] = matches[0]["parent_level"]

# De-duplicate exact records while preserving order.
seen = set()
deduped = []
for row in rows:
    key = tuple(row.items())
    if key not in seen:
        seen.add(key)
        deduped.append(row)

fieldnames = [
    "source_notice", "notice_date", "source_authority", "parent_county", "level", "name",
    "parent_name", "parent_level", "publication_section", "source_status", "activation_status", "effective_date"
]
with out.open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(deduped)

from collections import Counter
print("wrote", out.name)
print("rows", len(deduped))
print("levels", dict(Counter(row["level"] for row in deduped)))
print("counties", len({row["parent_county"] for row in deduped if row["parent_county"]}))
print("top subcounties", sum(row["publication_section"] == "top_subcounties" for row in deduped))
