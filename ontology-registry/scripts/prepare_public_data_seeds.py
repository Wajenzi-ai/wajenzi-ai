import csv
import json
from pathlib import Path

import shapefile

ROOT = Path(__file__).resolve().parent

# 1. HDX COD-AB Admin 0–2 reference units.
admin_rows = []
for level, filename, name_key, parent_key, code_key in [
    (0, "ken_admin0.geojson", "adm0_name", None, "adm0_pcode"),
    (1, "ken_admin1.geojson", "adm1_name", "adm0_pcode", "adm1_pcode"),
    (2, "ken_admin2.geojson", "adm2_name", "adm1_pcode", "adm2_pcode"),
]:
    data = json.loads((ROOT / "ken_admin_boundaries" / filename).read_text(encoding="utf-8"))
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        level_code = props.get(code_key) or props.get("adm0_pcode")
        parent_code = props.get(parent_key) if parent_key else ""
        name = props.get(name_key) or props.get(name_key.replace("_name", "_ref_name")) or ""
        admin_rows.append({
            "source_code": "HDX_COD_AB_KE",
            "source_record_id": level_code,
            "level": f"admin{level}",
            "name": name,
            "source_pcode": level_code,
            "parent_source_pcode": parent_code or "",
            "valid_on": props.get("valid_on", ""),
            "valid_to": props.get("valid_to", ""),
            "version": props.get("version", ""),
            "area_sqkm": props.get("area_sqkm", ""),
            "center_lat": props.get("center_lat", ""),
            "center_lon": props.get("center_lon", ""),
            "geometry_file": filename,
            "source_status": "reference_baseline",
        })

admin_fields = list(admin_rows[0].keys())
with (ROOT / "kenya_cod_ab_units.csv").open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=admin_fields)
    writer.writeheader()
    writer.writerows(admin_rows)

# 2. HDX wards, preserving source identifiers and census population field.
ward_path = ROOT / "kenya_wards_hdx/Kenya_Wards/kenya_wards.shp"
reader = shapefile.Reader(str(ward_path))
fields = [field[0] for field in reader.fields[1:]]
ward_rows = []
for shape_record in reader.iterShapeRecords():
    record = dict(zip(fields, list(shape_record.record)))
    ward_rows.append({
        "source_code": "HDX_ARC_WARDS_1450",
        "source_record_id": record.get("uid", "") or f"gid:{record.get('gid', '')}",
        "gid": record.get("gid", ""),
        "ward_name": record.get("ward", ""),
        "county_name": record.get("county", ""),
        "subcounty_name": record.get("subcounty", ""),
        "dhis2_uid": record.get("uid", ""),
        "dhis2_cuid": record.get("cuid", ""),
        "dhis2_scuid": record.get("scuid", ""),
        "population_2009": record.get("pop2009", ""),
        "vintage": "2016-03-31",
        "modified_at": "2019-04-12",
        "source_status": "historical_crosswalk_baseline",
    })
ward_fields = list(ward_rows[0].keys())
with (ROOT / "kenya_hdx_wards_reference.csv").open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=ward_fields)
    writer.writeheader()
    writer.writerows(ward_rows)

# 3. geoBoundaries open ADM3 ward reference.
gb = json.loads((ROOT / "geoboundaries-KEN-ADM3.geojson").read_text(encoding="utf-8"))
gb_rows = []
for feature in gb.get("features", []):
    props = feature.get("properties", {})
    gb_rows.append({
        "source_code": "GBO_OPEN_KEN_ADM3",
        "source_record_id": props.get("shapeID", ""),
        "boundary_id": props.get("shapeID", ""),
        "ward_name": props.get("shapeName", ""),
        "boundary_type": props.get("shapeType", "ADM3"),
        "shape_group": props.get("shapeGroup", "KEN"),
        "boundary_year": "2020",
        "license": "CC BY 4.0",
        "source_status": "open_supplementary_layer",
    })
gb_fields = list(gb_rows[0].keys())
with (ROOT / "kenya_geoboundaries_adm3_reference.csv").open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=gb_fields)
    writer.writeheader()
    writer.writerows(gb_rows)

# 4. Construction-relevant PPRA market-reference rows only.
with (ROOT / "ppra_mrg_april_2026_items.csv").open(encoding="utf-8", newline="") as f:
    ppra_rows = [row for row in csv.DictReader(f) if row["category"] in {"Building Materials", "Waterworks"}]
with (ROOT / "ppra_mrg_april_2026_construction_reference.csv").open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(ppra_rows[0].keys()))
    writer.writeheader()
    writer.writerows(ppra_rows)

summary = {
    "admin_units": len(admin_rows),
    "hdx_wards": len(ward_rows),
    "geoboundaries_adm3": len(gb_rows),
    "ppra_construction_reference_rows": len(ppra_rows),
}
(ROOT / "public_seed_summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
print(json.dumps(summary, indent=2))
