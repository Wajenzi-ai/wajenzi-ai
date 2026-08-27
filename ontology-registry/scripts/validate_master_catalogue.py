import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
errors = []

def read_csv(name):
    with (ROOT / name).open(encoding='utf-8', newline='') as f:
        return list(csv.DictReader(f))

products = read_csv('canonical_products_seed.csv')
variants = read_csv('canonical_variants_seed.csv')
manifest = json.loads((ROOT / 'master-catalogue-manifest.json').read_text(encoding='utf-8'))
summary = json.loads((ROOT / 'canonical_seed_summary.json').read_text(encoding='utf-8'))
analysis = json.loads((ROOT / 'master_canonical_analysis.json').read_text(encoding='utf-8'))

if len(products) != 12663:
    errors.append(f'canonical_products_seed.csv expected 12663 rows, got {len(products)}')
if len(variants) != 517:
    errors.append(f'canonical_variants_seed.csv expected 517 rows, got {len(variants)}')
if len({row['canonical_entity_id'] for row in products}) != len(products):
    errors.append('canonical product bootstrap IDs are not unique')
if len({row['canonical_variant_entity_id'] for row in variants}) != len(variants):
    errors.append('canonical variant bootstrap IDs are not unique')
if any(row['source_system'] != 'wajenzi-master-catalogue-v1' for row in products + variants):
    errors.append('source system namespace mismatch')
product_source_ids = {row['source_row_id'] for row in products}
if len(product_source_ids) != len(products):
    errors.append('product source-row IDs are not unique')
if any(row['parent_product_source_row_id'] not in product_source_ids for row in variants):
    errors.append('variant parent source-row ID is missing from product roots')
if Counter(row['parent_resolution_method'] for row in variants) != Counter({'unique_parent_sku': 448, 'source_row_id_fallback': 69}):
    errors.append('unexpected parent-resolution method counts')
if any(row['canonical_status'] != 'master_canonical' for row in products + variants):
    errors.append('a master seed row is not marked master_canonical')
if summary.get('variants_review_required') != 0:
    errors.append('canonical_seed_summary reports review-required variants')
if analysis.get('parent_reference_resolution') != {'resolved_by_unique_sku': 448, 'resolved_by_source_row_id': 69}:
    errors.append('analysis parent resolution changed unexpectedly')
expected_hash = 'a2dce190d71fc428b11c11419828cac133d852f2f0d26aedef83859bdcb930a1'
if manifest.get('source_file_sha256') != expected_hash:
    errors.append('master catalogue manifest hash mismatch')
if errors:
    print('FAILED')
    for error in errors:
        print('-', error)
    raise SystemExit(1)
print('PASSED')
print('products', len(products))
print('variants', len(variants))
print('parent_resolution', dict(Counter(row['parent_resolution_method'] for row in variants)))
print('all_variants_have_parent', all(row['parent_product_source_row_id'] for row in variants))
print('source_hash', expected_hash)
