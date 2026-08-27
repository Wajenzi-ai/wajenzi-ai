import csv
from pathlib import Path

path = Path('/home/ubuntu/upload/WAJENZI_EXTERNAL_SOURCE_ENRICHED_PRODUCTS.csv')
with path.open(encoding='utf-8-sig', newline='') as f:
    rows = list(csv.DictReader(f))

sku_to_root = {}
for row in rows:
    if row.get('Type', '').lower() in {'simple', 'variable'} and row.get('SKU', '').strip():
        sku_to_root.setdefault(row['SKU'].strip(), []).append(row)

parent_counts = {}
for row in rows:
    if row.get('Type', '').lower() == 'variation':
        parent_counts.setdefault(row.get('Parent', '').strip(), []).append(row.get('ID', '').strip())

print('UNRESOLVED_PARENT_REFERENCES')
for parent, ids in sorted(parent_counts.items()):
    if parent not in sku_to_root:
        print(parent, len(ids), ','.join(ids))
print('VARIABLE_ROOTS_WITHOUT_VARIATIONS')
for row in rows:
    if row.get('Type', '').lower() != 'variable':
        continue
    sku = row.get('SKU', '').strip()
    if not parent_counts.get(sku):
        print(row.get('ID', ''), sku, row.get('Name', ''))
