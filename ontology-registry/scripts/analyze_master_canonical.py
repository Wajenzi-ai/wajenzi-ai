import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

SOURCE = Path('/home/ubuntu/upload/WAJENZI_EXTERNAL_SOURCE_ENRICHED_PRODUCTS.csv')
OUT = Path('/home/ubuntu/wajenzi-foundation/master_canonical_analysis.json')

with SOURCE.open(encoding='utf-8-sig', newline='') as f:
    rows = list(csv.DictReader(f))

def clean(value):
    return re.sub(r'\s+', ' ', (value or '').strip()).lower()

def tokens(value):
    return [part.strip() for part in (value or '').split(',') if part.strip()]

def normalized_key(row):
    fields = [
        row.get('Name', ''),
        row.get('canonical_brand_external', ''),
        row.get('product_family_external', ''),
        row.get('unit_of_measure_external', ''),
        row.get('pack_size_text_external', ''),
        row.get('thickness_mm_external', ''),
        row.get('diameter_value_external', ''),
        row.get('diameter_unit_external', ''),
        row.get('masterformat_code', ''),
    ]
    return '|'.join(clean(value) for value in fields)

ids = {row.get('ID', '').strip() for row in rows}
id_to_root = {}
sku_to_rows = defaultdict(list)
for row in rows:
    if row.get('Type', '').lower() in {'simple', 'variable'} and row.get('ID', '').strip():
        id_to_root[row.get('ID', '').strip()] = row
    sku = row.get('SKU', '').strip()
    if sku:
        sku_to_rows[sku].append(row)

variations = [row for row in rows if row.get('Type', '').lower() == 'variation']
roots = [row for row in rows if row.get('Type', '').lower() in {'simple', 'variable'}]
variables = [row for row in rows if row.get('Type', '').lower() == 'variable']
parent_refs = Counter(row.get('Parent', '').strip() for row in variations)
parent_by_sku = {}
parent_resolution = Counter()
missing_parent_refs = []
ambiguous_parent_refs = []
for ref in sorted(parent_refs):
    matches = sku_to_rows.get(ref, [])
    resolution_method = None
    if len(matches) == 1:
        resolution_method = 'resolved_by_unique_sku'
        resolved_id = matches[0].get('ID', '').strip()
    elif len(matches) == 0 and ref.lower().startswith('id:'):
        source_id = ref.split(':', 1)[1].strip()
        if source_id in id_to_root:
            resolution_method = 'resolved_by_source_row_id'
            resolved_id = source_id
    if resolution_method:
        parent_resolution[resolution_method] += parent_refs[ref]
        parent_by_sku[ref] = resolved_id
    elif len(matches) == 0:
        parent_resolution['unresolved'] += parent_refs[ref]
        missing_parent_refs.append(ref)
    else:
        parent_resolution['ambiguous_sku'] += parent_refs[ref]
        ambiguous_parent_refs.append({'parent': ref, 'matching_ids': [m.get('ID', '').strip() for m in matches]})

variable_variation_counts = {}
for variable in variables:
    variable_id = variable.get('ID', '').strip()
    variable_sku = variable.get('SKU', '').strip()
    count = 0
    for variation in variations:
        ref = variation.get('Parent', '').strip()
        if ref == variable_sku or parent_by_sku.get(ref) == variable_id:
            count += 1
    variable_variation_counts[variable_id] = count

field_metrics = {}
for field in [
    'canonical_brand_external', 'product_family_external', 'unit_of_measure_external',
    'pack_size_value_external', 'pack_size_unit_external', 'pack_size_text_external',
    'normalized_weight_kg_external', 'normalized_length_cm_external', 'normalized_width_cm_external',
    'normalized_height_cm_external', 'thickness_mm_external', 'diameter_value_external',
    'description_source_url_external', 'description_confidence_external'
]:
    values = [row.get(field, '').strip() for row in roots if row.get(field, '').strip()]
    field_metrics[field] = {'nonempty': len(values), 'unique': len(set(values))}

classification_fields = ['omniclass_table_23_code', 'masterformat_code', 'uniformat_code', 'etim_code', 'icms_code', 'dks_3015_code']
classification_metrics = {}
for field in classification_fields:
    values = [row.get(field, '').strip() for row in roots if row.get(field, '').strip()]
    confidence_field = field.replace('_code', '_confidence')
    classification_metrics[field] = {
        'nonempty': len(values),
        'unique': len(set(values)),
        'confidence_counts': dict(Counter(row.get(confidence_field, '').strip() for row in roots if row.get(confidence_field, '').strip()))
    }

sku_duplicates = {
    sku: [row.get('ID', '').strip() for row in sku_rows]
    for sku, sku_rows in sku_to_rows.items()
    if len(sku_rows) > 1
}

name_key_groups = defaultdict(list)
for row in roots:
    key = normalized_key(row)
    if key.strip('|'):
        name_key_groups[key].append(row.get('ID', '').strip())
matching_key_collision_groups = [
    {'key': key, 'ids': ids_for_key}
    for key, ids_for_key in name_key_groups.items()
    if len(ids_for_key) > 1
]

brand_tokens = Counter()
family_tokens = Counter()
category_tokens = Counter()
for row in roots:
    brand_tokens.update(tokens(row.get('canonical_brand_external', '')))
    family_tokens.update(tokens(row.get('product_family_external', '')))
    category_tokens.update(tokens(row.get('Categories', '')))

summary = {
    'source_file': str(SOURCE),
    'source_file_id_policy': 'ID is retained as source-record identifier; WAJENZI canonical IDs are newly assigned opaque IDs.',
    'row_count': len(rows),
    'canonical_root_count': len(roots),
    'canonical_product_count': sum(row.get('Type', '').lower() == 'simple' for row in rows),
    'canonical_product_family_count': len(variables),
    'canonical_variant_count': len(variations),
    'type_counts': dict(Counter(row.get('Type', '') for row in rows)),
    'parent_reference_resolution': dict(parent_resolution),
    'unique_variation_parent_refs': len(parent_refs),
    'missing_parent_refs_by_sku': missing_parent_refs,
    'ambiguous_parent_refs_by_sku': ambiguous_parent_refs,
    'variables_with_variation_counts': variable_variation_counts,
    'variables_without_variations_by_sku_count': sum(count == 0 for count in variable_variation_counts.values()),
    'variables_without_variations_by_id': [row.get('ID', '').strip() for row in variables if variable_variation_counts.get(row.get('ID', '').strip()) == 0],
    'identifier_quality': {
        'id_nonempty_unique': len(ids) == len(rows),
        'sku_nonempty': sum(bool(row.get('SKU', '').strip()) for row in rows),
        'sku_unique_nonempty': len(sku_to_rows),
        'sku_duplicate_group_count': len(sku_duplicates),
        'sku_duplicate_groups_sample': dict(list(sku_duplicates.items())[:50]),
        'gtin_nonempty': sum(bool(row.get('GTIN, UPC, EAN, or ISBN', '').strip()) for row in rows),
        'blank_sku_rows': sum(not row.get('SKU', '').strip() for row in rows),
    },
    'field_metrics_on_canonical_roots': field_metrics,
    'classification_metrics_on_canonical_roots': classification_metrics,
    'top_canonical_brands_external': brand_tokens.most_common(50),
    'top_product_families_external': family_tokens.most_common(50),
    'top_categories': category_tokens.most_common(80),
    'matching_key': {
        'definition': 'normalized Name + canonical brand + product family + unit + pack size + thickness + diameter + MasterFormat code',
        'root_collision_group_count': len(matching_key_collision_groups),
        'root_collision_groups_sample': matching_key_collision_groups[:100],
        'warning': 'The key is a candidate match signal, not an automatic merge key. Supplier evidence, manufacturer part number, barcode, specification, unit, pack, and steward approval remain required.'
    },
    'sample_rows': [
        {field: row.get(field, '') for field in ['ID', 'Type', 'SKU', 'Name', 'Parent', 'canonical_brand_external', 'product_family_external', 'unit_of_measure_external', 'pack_size_text_external', 'masterformat_code', 'code_mapping_confidence']}
        for row in rows[:20]
    ]
}
OUT.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps({
    'row_count': summary['row_count'],
    'canonical_root_count': summary['canonical_root_count'],
    'canonical_product_count': summary['canonical_product_count'],
    'canonical_product_family_count': summary['canonical_product_family_count'],
    'canonical_variant_count': summary['canonical_variant_count'],
    'parent_reference_resolution': summary['parent_reference_resolution'],
    'sku_duplicate_group_count': summary['identifier_quality']['sku_duplicate_group_count'],
    'blank_sku_rows': summary['identifier_quality']['blank_sku_rows'],
    'matching_key_collision_group_count': summary['matching_key']['root_collision_group_count']
}, indent=2))
print('analysis_written', OUT)
