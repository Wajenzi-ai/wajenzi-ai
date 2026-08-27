import csv
from pathlib import Path

path = Path(__file__).resolve().parent / "kenya_ward_crosswalk_geoboundaries_to_hdx.csv"
with path.open(encoding="utf-8", newline="") as f:
    rows = list(csv.DictReader(f))
for row in rows:
    if row["match_confidence"] == "none":
        print(row)
