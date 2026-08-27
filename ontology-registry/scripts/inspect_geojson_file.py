import json
import sys
from collections import Counter
from pathlib import Path

path = Path(sys.argv[1])
data = json.loads(path.read_text(encoding="utf-8"))
features = data.get("features", [])
key_counts = Counter()
geometry_types = Counter()
for feature in features:
    key_counts.update(feature.get("properties", {}).keys())
    geometry_types[feature.get("geometry", {}).get("type", "missing")] += 1
print("file:", path.name)
print("features:", len(features))
print("geometry_types:", dict(geometry_types))
print("properties:", sorted(key_counts))
for feature in features[:5]:
    print("sample:", feature.get("properties", {}))
