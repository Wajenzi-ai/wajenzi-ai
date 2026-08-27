import csv
import json
import re
from numbers import Integral
from pathlib import Path

import shapefile
from shapely.geometry import Point, shape
from shapely.strtree import STRtree

ROOT = Path(__file__).resolve().parent
hdx_path = ROOT / "kenya_wards_hdx/Kenya_Wards/kenya_wards.shp"
gb_path = ROOT / "geoboundaries-KEN-ADM3.geojson"
out_path = ROOT / "kenya_ward_crosswalk_geoboundaries_to_hdx.csv"

def norm(value):
    value = value or ""
    value = value.upper().replace("–", "-").replace("—", "-")
    value = re.sub(r"[^A-Z0-9]+", " ", value)
    value = re.sub(r"\bWARD\b|\bSUB\s+COUNTY\b|\bSUBCOUNTY\b", " ", value)
    return re.sub(r"\s+", " ", value).strip()

reader = shapefile.Reader(str(hdx_path))
fields = [f[0] for f in reader.fields[1:]]
hdx = []
hdx_geoms = []
for sr in reader.iterShapeRecords():
    record = dict(zip(fields, list(sr.record)))
    geom = shape(sr.shape.__geo_interface__)
    hdx.append((record, geom))
    hdx_geoms.append(geom)

tree = STRtree(hdx_geoms)
geom_to_idx = {id(geom): idx for idx, geom in enumerate(hdx_geoms)}

geojson = json.loads(gb_path.read_text(encoding="utf-8"))
rows = []
for feature in geojson.get("features", []):
    props = feature.get("properties", {})
    geom = shape(feature.get("geometry"))
    point = geom.representative_point()
    candidates = tree.query(point)
    containing = []
    for candidate in candidates:
        if isinstance(candidate, Integral):
            idx = int(candidate)
            candidate_geom = hdx_geoms[idx]
        else:
            idx = geom_to_idx.get(id(candidate))
            candidate_geom = candidate
        if idx is not None and candidate_geom.contains(point):
            containing.append(idx)
    if len(containing) == 1:
        record = hdx[containing[0]][0]
        method = "representative_point_in_hdx_polygon"
        confidence = "high"
    elif len(containing) > 1:
        record = hdx[containing[0]][0]
        method = "ambiguous_point_in_polygon"
        confidence = "low"
    else:
        name = norm(props.get("shapeName"))
        name_matches = [record for record, _ in hdx if norm(record.get("ward")) == name]
        if len(name_matches) == 1:
            record = name_matches[0]
            method = "unique_normalized_name"
            confidence = "medium"
        else:
            record = {}
            method = "unmatched"
            confidence = "none"
    rows.append({
        "gb_boundary_id": props.get("shapeID", ""),
        "gb_boundary_name": props.get("shapeName", ""),
        "gb_boundary_type": props.get("shapeType", "ADM3"),
        "gb_release": "gbOpen",
        "gb_boundary_year": "2020",
        "hdx_uid": record.get("uid", ""),
        "hdx_cuid": record.get("cuid", ""),
        "hdx_scuid": record.get("scuid", ""),
        "hdx_gid": record.get("gid", ""),
        "hdx_county": record.get("county", ""),
        "hdx_subcounty": record.get("subcounty", ""),
        "hdx_ward": record.get("ward", ""),
        "match_method": method,
        "match_confidence": confidence,
        "source_gb": "geoBoundaries current gbOpen KEN ADM3 API release",
        "source_hdx": "HDX Administrative Wards in Kenya 1450",
    })

fields_out = list(rows[0].keys()) if rows else []
with out_path.open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fields_out)
    writer.writeheader()
    writer.writerows(rows)

from collections import Counter
print("wrote", out_path.name)
print("rows", len(rows))
print("match_methods", dict(Counter(row["match_method"] for row in rows)))
print("confidence", dict(Counter(row["match_confidence"] for row in rows)))
