import csv
import json
import re
from pathlib import Path

ROOT = Path('/home/ubuntu/wajenzi-foundation')
products_path = ROOT / 'canonical_products_seed.csv'
ppra_path = ROOT / 'ppra_mrg_april_2026_construction_reference.csv'

with products_path.open(encoding='utf-8', newline='') as f:
    products = list(csv.DictReader(f))

terms = re.compile(r'\b(cement|concrete|mortar|screed)\b', re.I)
cement_products = []
for row in products:
    searchable = ' '.join([
        row.get('canonical_name', ''), row.get('product_family_external', ''), row.get('categories', ''),
        row.get('tags', ''), row.get('masterformat_code', ''), row.get('omniclass_code', '')
    ])
    if terms.search(searchable):
        cement_products.append(row)

ppra_rows = []
if ppra_path.exists():
    with ppra_path.open(encoding='utf-8', newline='') as f:
        ppra_rows = list(csv.DictReader(f))
ppra_cement = [row for row in ppra_rows if terms.search(' '.join(row.values()))]

# The foundation package contains schemas and seed data, but no operational supplier,
# facility, offer, project-site, price-observation, or availability-observation records.
operational_files = {
    'supplier_organizations': sorted(str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.is_file() and re.search(r'(supplier|organization)', p.name, re.I)),
    'offers': sorted(str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.is_file() and re.search(r'(offer|listing)', p.name, re.I)),
    'price_observations': sorted(str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.is_file() and re.search(r'price_observation', p.name, re.I)),
    'availability_observations': sorted(str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.is_file() and re.search(r'(availability|stock_observation)', p.name, re.I)),
    'project_sites': sorted(str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.is_file() and re.search(r'(project|site)', p.name, re.I)),
}

# Do not treat schema files, templates, or public market-reference data as operational facts.
for key in operational_files:
    operational_files[key] = [p for p in operational_files[key] if not re.search(r'(schema|template|ontology|documentation|\.md$)', p, re.I)]

result = {
    'query': 'Find the cheapest cement supplier within 50km of Nairobi project site with verified stock',
    'semantic_parameters': {
        'product_intent': 'cement product or cement-compatible product; exact specification required before final selection',
        'anchor': 'project site geometry; not substituted with Nairobi centroid',
        'radius_m': 50000,
        'price_objective': 'lowest comparable current price per normalized unit and currency',
        'stock_requirement': 'availability observation explicitly verified by an accepted verification status/evidence',
        'freshness_requirement': 'must be supplied by caller or policy; no silent real-time assumption'
    },
    'ontology_hops': [
        'Project → Site → Geometry/Address',
        'Site → spatial distance → Facility',
        'Facility → Organization',
        'Product/ProductVariant → ProductOffer → SupplierOrganization',
        'ProductOffer → PriceObservation',
        'ProductOffer → AvailabilityObservation → verification evidence/status'
    ],
    'loaded_data': {
        'canonical_product_roots': len(products),
        'cement_candidate_canonical_roots': len(cement_products),
        'cement_candidate_sample': [
            {'id': row['canonical_entity_id'], 'source_row_id': row['source_row_id'], 'name': row['canonical_name'], 'family': row['product_family_external'], 'unit': row['unit_of_measure_external'], 'pack': row['pack_size_text_external']}
            for row in cement_products[:20]
        ],
        'ppra_reference_rows_containing_cement': len(ppra_cement),
        'ppra_reference_is_supplier_offer': False,
        'operational_record_file_indicators': operational_files
    },
    'gate_results': {
        'canonical_product_resolution': 'PASS' if cement_products else 'FAIL',
        'project_site_anchor': 'FAIL: no project/site geometry supplied; Nairobi centroid must not be silently substituted',
        'supplier_offer_resolution': 'FAIL: no supplier organizations/offers loaded',
        'price_observation_resolution': 'FAIL: no supplier-specific price observations loaded',
        'distance_filter': 'NOT_EXECUTED: requires project-site and facility geometries',
        'verified_stock_filter': 'FAIL: no availability observations loaded and no explicit observation verification status is present in the current schema',
        'cheapest_supplier_result': 'NOT_ANSWERABLE_WITH_CURRENT_DATA'
    },
    'interpretation': 'The ontology contains the required conceptual path, and the canonical catalogue contains cement candidates, but the current package cannot return a cheapest supplier because operational supplier offers, facility coordinates, project-site coordinates, supplier-specific price observations, and verified availability evidence are not loaded.'
}

out = ROOT / 'cheapest_cement_query_test.json'
out.write_text(json.dumps(result, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps({
    'canonical_product_resolution': result['gate_results']['canonical_product_resolution'],
    'canonical_product_roots': result['loaded_data']['canonical_product_roots'],
    'cement_candidate_canonical_roots': result['loaded_data']['cement_candidate_canonical_roots'],
    'ppra_reference_rows_containing_cement': result['loaded_data']['ppra_reference_rows_containing_cement'],
    'supplier_offer_resolution': result['gate_results']['supplier_offer_resolution'],
    'distance_filter': result['gate_results']['distance_filter'],
    'verified_stock_filter': result['gate_results']['verified_stock_filter'],
    'cheapest_supplier_result': result['gate_results']['cheapest_supplier_result']
}, indent=2))
print('test_written', out)
