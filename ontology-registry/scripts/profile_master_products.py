import csv
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

path = Path('/home/ubuntu/upload/WAJENZI_EXTERNAL_SOURCE_ENRICHED_PRODUCTS.csv')
with path.open('r', encoding='utf-8-sig', newline='') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames or []
    rows = list(reader)

summary = {
    'file': str(path),
    'rows': len(rows),
    'columns': len(fieldnames),
    'fields': fieldnames,
    'type_counts': dict(Counter(row.get('Type', '') for row in rows)),
    'published_counts': dict(Counter(row.get('Published', '') for row in rows)),
    'visibility_counts': dict(Counter(row.get('Visibility in catalog', '') for row in rows)),
    'featured_counts': dict(Counter(row.get('Is featured?', '') for row in rows)),
    'in_stock_counts': dict(Counter(row.get('In stock?', '') for row in rows)),
}

for key in ['ID', 'SKU', 'Name', 'Parent', 'Brands', 'Categories', 'omniclass_table_23_code', 'masterformat_code', 'uniformat_code']:
    values = [row.get(key, '') for row in rows]
    nonempty = [value for value in values if value.strip()]
    summary[f'{key}_nonempty'] = len(nonempty)
    summary[f'{key}_unique_nonempty'] = len(set(nonempty))
    duplicates = [(value, count) for value, count in Counter(nonempty).items() if count > 1]
    summary[f'{key}_duplicate_value_count'] = len(duplicates)
    summary[f'{key}_top_duplicates'] = sorted(duplicates, key=lambda x: (-x[1], x[0]))[:20]

parent_rows = [row for row in rows if row.get('Parent', '').strip()]
parent_refs = Counter(row.get('Parent', '').strip() for row in parent_rows)
id_set = {row.get('ID', '').strip() for row in rows if row.get('ID', '').strip()}
missing_parents = sorted({parent for parent in parent_refs if parent not in id_set})
summary['rows_with_parent'] = len(parent_rows)
summary['unique_parent_refs'] = len(parent_refs)
summary['missing_parent_ref_count'] = len(missing_parents)
summary['missing_parent_refs'] = missing_parents[:100]

# Separate variable/variation relationships.
variables = [row for row in rows if row.get('Type', '').lower() == 'variable']
variations = [row for row in rows if row.get('Type', '').lower() == 'variation']
summary['variable_count'] = len(variables)
summary['variation_count'] = len(variations)
summary['simple_count'] = sum(row.get('Type', '').lower() == 'simple' for row in rows)
summary['variation_parent_counts'] = dict(Counter(row.get('Parent', '').strip() for row in variations))
summary['variation_without_parent'] = sum(not row.get('Parent', '').strip() for row in variations)
summary['variables_without_variation'] = sorted(
    row.get('ID', '') for row in variables
    if not any(v.get('Parent', '').strip() == row.get('ID', '').strip() for v in variations)
)[:100]

# Category and brand tokenization for WooCommerce-style comma-separated taxonomy fields.
def tokens(value):
    return [token.strip() for token in value.split(',') if token.strip()]

category_counts = Counter()
brand_counts = Counter()
tag_counts = Counter()
for row in rows:
    category_counts.update(tokens(row.get('Categories', '')))
    brand_counts.update(tokens(row.get('Brands', '')))
    tag_counts.update(tokens(row.get('Tags', '')))
summary['category_count'] = len(category_counts)
summary['top_categories'] = category_counts.most_common(100)
summary['brand_count'] = len(brand_counts)
summary['top_brands'] = brand_counts.most_common(100)
summary['tag_count'] = len(tag_counts)
summary['top_tags'] = tag_counts.most_common(100)

# Identifier quality and suspicious collisions.
summary['blank_id_count'] = sum(not row.get('ID', '').strip() for row in rows)
summary['blank_sku_count'] = sum(not row.get('SKU', '').strip() for row in rows)
summary['blank_name_count'] = sum(not row.get('Name', '').strip() for row in rows)
summary['sku_collisions'] = sorted(
    ((value, count) for value, count in Counter(row.get('SKU', '').strip() for row in rows if row.get('SKU', '').strip()).items() if count > 1),
    key=lambda x: (-x[1], x[0])
)[:100]

# Exact canonical-name collisions among simple/variable products.
name_groups = defaultdict(list)
for row in rows:
    if row.get('Type', '').lower() in {'simple', 'variable'}:
        name = re.sub(r'\s+', ' ', row.get('Name', '').strip()).lower()
        if name:
            name_groups[name].append(row.get('ID', '').strip())
summary['canonical_name_collision_groups'] = sorted(
    ((name, ids) for name, ids in name_groups.items() if len(ids) > 1),
    key=lambda x: (-len(x[1]), x[0])
)[:100]

# Attribute field inventory.
attribute_fields = [field for field in fieldnames if field.lower().startswith('attribute ')]
attr_nonempty = {}
for field in attribute_fields:
    attr_nonempty[field] = sum(bool(row.get(field, '').strip()) for row in rows)
summary['attribute_fields'] = attr_nonempty

# Produce a compact sample with high-value fields only.
sample_fields = ['ID', 'Type', 'SKU', 'Name', 'Parent', 'Brands', 'Categories', 'Attribute 1 name', 'Attribute 1 value(s)', 'Attribute 2 name', 'Attribute 2 value(s)', 'omniclass_table_23_code', 'masterformat_code', 'uniformat_code']
summary['sample_rows'] = [{field: row.get(field, '') for field in sample_fields if field in fieldnames} for row in rows[:10]]

out = Path('/home/ubuntu/wajenzi-foundation/master_product_profile.json')
out.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps({key: summary[key] for key in ['rows', 'columns', 'type_counts', 'rows_with_parent', 'variation_without_parent', 'blank_id_count', 'blank_sku_count', 'blank_name_count', 'category_count', 'brand_count', 'sku_collisions', 'missing_parent_ref_count']}, indent=2))
print('profile_written', out)
