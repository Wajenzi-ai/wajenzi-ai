import csv
import hashlib
import json
import uuid
from pathlib import Path

SOURCE = Path('/home/ubuntu/upload/WAJENZI_EXTERNAL_SOURCE_ENRICHED_PRODUCTS.csv')
ROOT = Path('/home/ubuntu/wajenzi-foundation')
PRODUCT_OUT = ROOT / 'canonical_products_seed.csv'
VARIANT_OUT = ROOT / 'canonical_variants_seed.csv'
TEMPLATE_OUT = ROOT / 'supplier_product_submission_template.csv'

NAMESPACE = uuid.UUID('d2b6fcb2-0c1b-4aef-9d6d-1b1d4b8fbf48')

def stable_id(kind, source_id):
    return str(uuid.uuid5(NAMESPACE, f'master-catalogue/v1/{kind}/{source_id}'))

def clean(value):
    return (value or '').strip()

def source_hash(row):
    payload = json.dumps(row, sort_keys=True, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(payload).hexdigest()

def parent_resolution(parent_ref, rows_by_sku, rows_by_id):
    matches = rows_by_sku.get(parent_ref, [])
    if len(matches) == 1:
        return matches[0], 'unique_parent_sku'
    if not matches and parent_ref.lower().startswith('id:'):
        source_id = parent_ref.split(':', 1)[1].strip()
        if source_id in rows_by_id:
            return rows_by_id[source_id], 'source_row_id_fallback'
    return None, 'review_required'

with SOURCE.open(encoding='utf-8-sig', newline='') as f:
    rows = list(csv.DictReader(f))

rows_by_id = {clean(row.get('ID')): row for row in rows if clean(row.get('ID'))}
roots = [row for row in rows if clean(row.get('Type')).lower() in {'simple', 'variable'}]
variants = [row for row in rows if clean(row.get('Type')).lower() == 'variation']
rows_by_sku = {}
for row in roots:
    sku = clean(row.get('SKU'))
    if sku:
        rows_by_sku.setdefault(sku, []).append(row)

product_fields = [
    'canonical_entity_id', 'canonical_entity_type', 'canonical_status', 'source_system', 'source_row_id', 'source_sku',
    'source_type', 'canonical_name', 'published', 'catalog_visibility', 'tax_status', 'source_in_stock',
    'canonical_brand_external', 'product_family_external', 'categories', 'tags', 'unit_of_measure_external',
    'pack_size_value_external', 'pack_size_unit_external', 'pack_size_text_external', 'weight_kg', 'length_cm',
    'width_cm', 'height_cm', 'thickness_mm', 'diameter_value', 'diameter_unit', 'omniclass_code',
    'masterformat_code', 'uniformat_code', 'etim_code', 'icms_code', 'source_content_hash'
]
product_rows = []
for row in roots:
    source_id = clean(row.get('ID'))
    product_rows.append({
        'canonical_entity_id': stable_id('product', source_id),
        'canonical_entity_type': 'Product',
        'canonical_status': 'master_canonical',
        'source_system': 'wajenzi-master-catalogue-v1',
        'source_row_id': source_id,
        'source_sku': clean(row.get('SKU')),
        'source_type': clean(row.get('Type')),
        'canonical_name': clean(row.get('Name')),
        'published': clean(row.get('Published')),
        'catalog_visibility': clean(row.get('Visibility in catalog')),
        'tax_status': clean(row.get('Tax status')),
        'source_in_stock': clean(row.get('In stock?')),
        'canonical_brand_external': clean(row.get('canonical_brand_external')),
        'product_family_external': clean(row.get('product_family_external')),
        'categories': clean(row.get('Categories')),
        'tags': clean(row.get('Tags')),
        'unit_of_measure_external': clean(row.get('unit_of_measure_external')),
        'pack_size_value_external': clean(row.get('pack_size_value_external')),
        'pack_size_unit_external': clean(row.get('pack_size_unit_external')),
        'pack_size_text_external': clean(row.get('pack_size_text_external')),
        'weight_kg': clean(row.get('normalized_weight_kg_external')) or clean(row.get('Weight (kg)')),
        'length_cm': clean(row.get('normalized_length_cm_external')) or clean(row.get('Length (cm)')),
        'width_cm': clean(row.get('normalized_width_cm_external')) or clean(row.get('Width (cm)')),
        'height_cm': clean(row.get('normalized_height_cm_external')) or clean(row.get('Height (cm)')),
        'thickness_mm': clean(row.get('thickness_mm_external')),
        'diameter_value': clean(row.get('diameter_value_external')),
        'diameter_unit': clean(row.get('diameter_unit_external')),
        'omniclass_code': clean(row.get('omniclass_table_23_code')),
        'masterformat_code': clean(row.get('masterformat_code')),
        'uniformat_code': clean(row.get('uniformat_code')),
        'etim_code': clean(row.get('etim_code')),
        'icms_code': clean(row.get('icms_code')),
        'source_content_hash': source_hash(row),
    })

variant_fields = [
    'canonical_variant_entity_id', 'canonical_entity_type', 'canonical_status', 'source_system', 'source_row_id',
    'source_sku', 'source_parent_ref', 'parent_resolution_method', 'parent_product_entity_id', 'parent_product_source_row_id',
    'canonical_name', 'attribute_1_name', 'attribute_1_value', 'attribute_2_name', 'attribute_2_value',
    'unit_of_measure_external', 'pack_size_value_external', 'pack_size_unit_external', 'pack_size_text_external',
    'weight_kg', 'length_cm', 'width_cm', 'height_cm', 'thickness_mm', 'diameter_value', 'diameter_unit',
    'omniclass_code', 'masterformat_code', 'uniformat_code', 'etim_code', 'icms_code', 'source_content_hash'
]
variant_rows = []
for row in variants:
    source_id = clean(row.get('ID'))
    parent_ref = clean(row.get('Parent'))
    parent, method = parent_resolution(parent_ref, rows_by_sku, rows_by_id)
    parent_source_id = clean(parent.get('ID')) if parent else ''
    variant_rows.append({
        'canonical_variant_entity_id': stable_id('variant', source_id),
        'canonical_entity_type': 'ProductVariant',
        'canonical_status': 'master_canonical' if parent else 'canonicalization_review',
        'source_system': 'wajenzi-master-catalogue-v1',
        'source_row_id': source_id,
        'source_sku': clean(row.get('SKU')),
        'source_parent_ref': parent_ref,
        'parent_resolution_method': method,
        'parent_product_entity_id': stable_id('product', parent_source_id) if parent_source_id else '',
        'parent_product_source_row_id': parent_source_id,
        'canonical_name': clean(row.get('Name')),
        'attribute_1_name': clean(row.get('Attribute 1 name')),
        'attribute_1_value': clean(row.get('Attribute 1 value(s)')),
        'attribute_2_name': clean(row.get('Attribute 2 name')),
        'attribute_2_value': clean(row.get('Attribute 2 value(s)')),
        'unit_of_measure_external': clean(row.get('unit_of_measure_external')),
        'pack_size_value_external': clean(row.get('pack_size_value_external')),
        'pack_size_unit_external': clean(row.get('pack_size_unit_external')),
        'pack_size_text_external': clean(row.get('pack_size_text_external')),
        'weight_kg': clean(row.get('normalized_weight_kg_external')) or clean(row.get('Weight (kg)')),
        'length_cm': clean(row.get('normalized_length_cm_external')) or clean(row.get('Length (cm)')),
        'width_cm': clean(row.get('normalized_width_cm_external')) or clean(row.get('Width (cm)')),
        'height_cm': clean(row.get('normalized_height_cm_external')) or clean(row.get('Height (cm)')),
        'thickness_mm': clean(row.get('thickness_mm_external')),
        'diameter_value': clean(row.get('diameter_value_external')),
        'diameter_unit': clean(row.get('diameter_unit_external')),
        'omniclass_code': clean(row.get('omniclass_table_23_code')),
        'masterformat_code': clean(row.get('masterformat_code')),
        'uniformat_code': clean(row.get('uniformat_code')),
        'etim_code': clean(row.get('etim_code')),
        'icms_code': clean(row.get('icms_code')),
        'source_content_hash': source_hash(row),
    })

with PRODUCT_OUT.open('w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=product_fields)
    writer.writeheader()
    writer.writerows(product_rows)
with VARIANT_OUT.open('w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=variant_fields)
    writer.writeheader()
    writer.writerows(variant_rows)

submission_fields = [
    'supplier_source_system', 'supplier_submission_id', 'supplier_organization_id', 'supplier_sku',
    'title', 'brand', 'manufacturer_part_number', 'gtin_upc_ean_isbn', 'product_type', 'category_path',
    'unit_of_sale', 'pack_size_value', 'pack_size_unit', 'specification_json', 'weight_kg', 'length_cm',
    'width_cm', 'height_cm', 'thickness_mm', 'diameter_value', 'diameter_unit', 'country_code',
    'facility_id', 'price_amount', 'currency_code', 'tax_basis', 'stock_quantity', 'stock_unit',
    'lead_time_json', 'evidence_document_uri', 'supplier_claimed_wajenzi_product_id', 'submission_status'
]
with TEMPLATE_OUT.open('w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=submission_fields)
    writer.writeheader()

summary = {
    'master_rows': len(rows),
    'canonical_product_roots': len(product_rows),
    'canonical_variants': len(variant_rows),
    'variants_master_canonical': sum(row['canonical_status'] == 'master_canonical' for row in variant_rows),
    'variants_review_required': sum(row['canonical_status'] == 'canonicalization_review' for row in variant_rows),
    'variant_parent_methods': {},
    'supplier_template_columns': len(submission_fields),
}
from collections import Counter
summary['variant_parent_methods'] = dict(Counter(row['parent_resolution_method'] for row in variant_rows))
(ROOT / 'canonical_seed_summary.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
print(json.dumps(summary, indent=2))
