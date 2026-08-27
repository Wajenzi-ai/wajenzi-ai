import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
source = ROOT / "ppra_mrg_april_2026.txt"
out = ROOT / "ppra_mrg_april_2026_items.csv"
lines = source.read_text(encoding="utf-8").splitlines()

number = re.compile(r"^(?:-|\d[\d,]*(?:\.\d+)?)$")
category_re = re.compile(r"^PPRA\d{3}\s*-\s*(.+)$", re.I)
row_re = re.compile(r"^(\d{5})\s+(.+?)\s*$")

def as_number(value):
    if value == "-":
        return ""
    return value.replace(",", "")

def is_price_token(value):
    return bool(number.match(value))

def parse_row(line, category):
    columns = re.split(r"\s{2,}", line.strip())
    if not columns or not columns[0].isdigit() or len(columns[0]) < 4:
        return None
    if len(columns) < 8:
        return None
    price_parts = columns[-6:]
    if not all(is_price_token(p) for p in price_parts):
        return None
    if category.lower() == "waterworks":
        item_name = columns[1].strip()
        specification = " ".join(columns[2:-6]).strip()
        unit = ""
        quantity = ""
    else:
        if len(columns) < 9 or not is_price_token(columns[-7]):
            return None
        item_name = columns[1].strip()
        unit = columns[-8].strip()
        quantity = as_number(columns[-7].strip())
        specification = ""
    if not item_name:
        return None
    return {
        "source_document": "PPRA Market Reference Guide April 2026",
        "source_url": "https://ppra.go.ke/mrg-april-2026/",
        "survey_start": "2026-02-16",
        "survey_end": "2026-03-08",
        "publication_period": "2026-04",
        "currency_code": "KES",
        "category": category,
        "item_code": columns[0],
        "item_name": item_name,
        "specification": specification,
        "unit_of_measure": unit,
        "quantity": quantity,
        "price_embu": as_number(price_parts[0]),
        "price_kisumu": as_number(price_parts[1]),
        "price_nakuru": as_number(price_parts[2]),
        "price_mombasa": as_number(price_parts[3]),
        "price_nairobi": as_number(price_parts[4]),
        "price_all": as_number(price_parts[5]),
        "price_status": "indicative_reference",
        "source_status": "official_public_reference",
    }

rows = []
category = ""
current = None
for raw in lines:
    line = raw.strip()
    if not line:
        continue
    match = category_re.match(line)
    if match:
        category = match.group(1).strip().title()
        current = None
        continue
    if line.startswith("Code") or line.startswith("SNo") or line.startswith("Base Period"):
        continue
    if line.startswith("Page ") or line in {"Materials", "Equipment", "Labour", "Transport, Fuels and Lubricants", "Transport and Fuel", "Building Cost Index", "Civil Engineering Cost Index"}:
        current = None
        continue
    parsed = parse_row(line, category)
    if parsed:
        rows.append(parsed)
        current = parsed
        continue
    # The PDF wraps item descriptions on indented continuation lines.
    if current and not line.startswith(("Weights", "Weight", "SNo", "PPRA")):
        if not any(ch.isdigit() for ch in line[:4]) and not line.endswith(":"):
            current["item_name"] = (current["item_name"] + " " + line).strip()

fields = [
    "source_document", "source_url", "survey_start", "survey_end", "publication_period", "currency_code",
    "category", "item_code", "item_name", "specification", "unit_of_measure", "quantity", "price_embu", "price_kisumu",
    "price_nakuru", "price_mombasa", "price_nairobi", "price_all", "price_status", "source_status"
]
with out.open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(rows)

from collections import Counter
print("wrote", out.name)
print("rows", len(rows))
print("categories", dict(Counter(row["category"] for row in rows)))
print("building_rows", sum(row["category"] == "Building Materials" for row in rows))
