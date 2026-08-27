import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
with (ROOT / "refined-ontology.json").open(encoding="utf-8") as f:
    ontology = json.load(f)

with (ROOT / "relationship-matrix.csv").open("w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["predicate", "domain_class", "range_class", "notes"])
    for predicate in ontology["predicates"]:
        note = "Explicit signature." if "signatures" in predicate else "Union signature; validate the concrete class pair at ingestion time."
        pairs = predicate.get("signatures")
        if pairs is None:
            pairs = [(domain_class, range_class) for domain_class in predicate["domain"] for range_class in predicate["range"]]
        for domain_class, range_class in pairs:
            writer.writerow([predicate["code"], domain_class, range_class, note])

print("wrote relationship-matrix.csv")
