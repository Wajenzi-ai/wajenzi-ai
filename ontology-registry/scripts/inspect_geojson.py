import json
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parent / "ken_admin_boundaries"
for path in sorted(root.glob("*.geojson")):
    data = json.loads(path.read_text(encoding="utf-8"))
    features = data.get("features", [])
    keys = Counter()
    geometry_types = Counter()
    for feature in features:
        keys.update(feature.get("properties", {}).keys())
        geometry_types[feature.get("geometry", {}).get("type", "missing")] += 1
    print(path.name)
    print("  features:", len(features))
    print("  geometry_types:", dict(geometry_types))
    print("  properties:", sorted(keys))
    for feature in features[:2]:
        print("  sample:", feature.get("properties", {}))
