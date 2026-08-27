import csv
from collections import defaultdict
from pathlib import Path

path = Path(__file__).resolve().parent / "kenya_hdx_wards_reference.csv"
groups = defaultdict(list)
with path.open(encoding="utf-8", newline="") as f:
    for row in csv.DictReader(f):
        groups[row["dhis2_uid"]].append(row)
for key, rows in groups.items():
    if len(rows) > 1:
        print("UID", repr(key), "count", len(rows))
        for row in rows:
            print(" ", row["gid"], row["county_name"], row["subcounty_name"], row["ward_name"])
