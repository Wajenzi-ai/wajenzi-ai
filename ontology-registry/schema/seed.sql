-- WAJENZI Foundation seed taxonomy v2026.1
-- Deliberately small seed for identity and relationship testing.

INSERT INTO ontology_class (class_code, label, description) VALUES
('organization', 'Organization', 'Legal or operating business entity'),
('organization_role', 'Organization Role', 'Role played by an organization in the ecosystem'),
('person', 'Person', 'Human actor associated with an account, organization, or project'),
('product', 'Product', 'Canonical master-catalog product'),
('product_listing', 'Product Listing', 'Supplier-specific representation of a product'),
('category', 'Category', 'Navigational or semantic taxonomy node'),
('product_type', 'Product Type', 'Specific product-class concept'),
('brand', 'Brand', 'Commercial brand'),
('material', 'Material', 'Material or substance'),
('unit', 'Unit', 'Measurement unit'),
('attribute_definition', 'Attribute Definition', 'Defined property or characteristic'),
('location', 'Location', 'Geographic or operating location'),
('application', 'Application', 'Use case for a product or material'),
('project', 'Project', 'Built-environment project'),
('project_phase', 'Project Phase', 'Phase of construction work'),
('standard', 'Standard', 'Construction, regulatory, or manufacturer standard'),
('document', 'Document', 'Evidence artifact'),
('relationship_assertion', 'Relationship Assertion', 'Sourced typed claim connecting entities')
ON CONFLICT (class_code) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    updated_at = now();

INSERT INTO ontology_predicate (predicate_code, label, description, is_symmetric, is_transitive) VALUES
('has_parent', 'Has parent', 'Places a taxonomy node under a parent node', false, true),
('classified_as', 'Classified as', 'Assigns an entity to a taxonomy node', false, false),
('has_product_type', 'Has product type', 'Connects a product to a product type', false, false),
('has_brand', 'Has brand', 'Connects a product to a brand', false, false),
('manufactured_by', 'Manufactured by', 'Connects a product to its manufacturer', false, false),
('has_material', 'Has material', 'Connects a product to a material', false, false),
('has_attribute', 'Has attribute', 'Connects an entity to an attribute definition', false, false),
('offered_as', 'Offered as', 'Connects a supplier listing to a canonical product', false, false),
('listed_by', 'Listed by', 'Connects a supplier listing to an organization', false, false),
('compatible_with', 'Compatible with', 'States that two items can work together in context', true, false),
('alternative_to', 'Alternative to', 'States that one item may substitute for another in context', true, false),
('requires', 'Requires', 'Expresses a procurement or installation dependency', false, false),
('used_for', 'Used for', 'Connects an item to an application or phase', false, false),
('applicable_standard', 'Applicable standard', 'Connects an item or project to a standard', false, false),
('installed_with', 'Installed with', 'Connects a product to installation items', false, false),
('available_in', 'Available in', 'Connects an entity to a location', false, false),
('evidenced_by', 'Evidenced by', 'Links a claim to a document', false, false)
ON CONFLICT (predicate_code) DO UPDATE SET
    label = EXCLUDED.label,
    description = EXCLUDED.description,
    is_symmetric = EXCLUDED.is_symmetric,
    is_transitive = EXCLUDED.is_transitive,
    updated_at = now();

-- Root and subcategory entities.
INSERT INTO registry_entity (entity_id, entity_type, canonical_name, status) VALUES
('00000000-0000-4000-8000-000000000001', 'category', 'Structural Materials', 'active'),
('00000000-0000-4000-8000-000000000002', 'category', 'Roofing', 'active'),
('00000000-0000-4000-8000-000000000003', 'category', 'Electrical', 'active'),
('00000000-0000-4000-8000-000000000004', 'category', 'Plumbing', 'active'),
('00000000-0000-4000-8000-000000000005', 'category', 'Finishes', 'active'),
('00000000-0000-4000-8000-000000000006', 'category', 'Doors and Windows', 'active'),
('00000000-0000-4000-8000-000000000007', 'category', 'Outdoor Products', 'active'),
('00000000-0000-4000-8000-000000000011', 'category', 'Cement', 'active'),
('00000000-0000-4000-8000-000000000012', 'category', 'Reinforcement Steel', 'active'),
('00000000-0000-4000-8000-000000000013', 'category', 'Blocks', 'active'),
('00000000-0000-4000-8000-000000000014', 'category', 'Aggregates', 'active'),
('00000000-0000-4000-8000-000000000015', 'category', 'Roofing Sheets', 'active'),
('00000000-0000-4000-8000-000000000016', 'category', 'Tiles', 'active'),
('00000000-0000-4000-8000-000000000017', 'category', 'Cables', 'active'),
('00000000-0000-4000-8000-000000000018', 'category', 'Switches', 'active'),
('00000000-0000-4000-8000-000000000019', 'category', 'Pipes', 'active'),
('00000000-0000-4000-8000-000000000020', 'category', 'Fittings', 'active'),
('00000000-0000-4000-8000-000000000021', 'category', 'Paint', 'active'),
('00000000-0000-4000-8000-000000000022', 'category', 'Flooring', 'active'),
('00000000-0000-4000-8000-000000000023', 'category', 'Wooden Doors', 'active'),
('00000000-0000-4000-8000-000000000024', 'category', 'Aluminum Windows', 'active'),
('00000000-0000-4000-8000-000000000025', 'category', 'Fencing', 'active'),
('00000000-0000-4000-8000-000000000026', 'category', 'Paving', 'active')
ON CONFLICT (entity_id) DO NOTHING;

INSERT INTO taxonomy_node (entity_id, taxonomy_kind, taxonomy_version, code, parent_entity_id, sort_order) VALUES
('00000000-0000-4000-8000-000000000001', 'category', '2026.1', 'structural-materials', NULL, 10),
('00000000-0000-4000-8000-000000000002', 'category', '2026.1', 'roofing', NULL, 20),
('00000000-0000-4000-8000-000000000003', 'category', '2026.1', 'electrical', NULL, 30),
('00000000-0000-4000-8000-000000000004', 'category', '2026.1', 'plumbing', NULL, 40),
('00000000-0000-4000-8000-000000000005', 'category', '2026.1', 'finishes', NULL, 50),
('00000000-0000-4000-8000-000000000006', 'category', '2026.1', 'doors-windows', NULL, 60),
('00000000-0000-4000-8000-000000000007', 'category', '2026.1', 'outdoor-products', NULL, 70),
('00000000-0000-4000-8000-000000000011', 'subcategory', '2026.1', 'cement', '00000000-0000-4000-8000-000000000001', 10),
('00000000-0000-4000-8000-000000000012', 'subcategory', '2026.1', 'reinforcement-steel', '00000000-0000-4000-8000-000000000001', 20),
('00000000-0000-4000-8000-000000000013', 'subcategory', '2026.1', 'blocks', '00000000-0000-4000-8000-000000000001', 30),
('00000000-0000-4000-8000-000000000014', 'subcategory', '2026.1', 'aggregates', '00000000-0000-4000-8000-000000000001', 40),
('00000000-0000-4000-8000-000000000015', 'subcategory', '2026.1', 'roofing-sheets', '00000000-0000-4000-8000-000000000002', 10),
('00000000-0000-4000-8000-000000000016', 'subcategory', '2026.1', 'tiles', '00000000-0000-4000-8000-000000000002', 20),
('00000000-0000-4000-8000-000000000017', 'subcategory', '2026.1', 'cables', '00000000-0000-4000-8000-000000000003', 10),
('00000000-0000-4000-8000-000000000018', 'subcategory', '2026.1', 'switches', '00000000-0000-4000-8000-000000000003', 20),
('00000000-0000-4000-8000-000000000019', 'subcategory', '2026.1', 'pipes', '00000000-0000-4000-8000-000000000004', 10),
('00000000-0000-4000-8000-000000000020', 'subcategory', '2026.1', 'fittings', '00000000-0000-4000-8000-000000000004', 20),
('00000000-0000-4000-8000-000000000021', 'subcategory', '2026.1', 'paint', '00000000-0000-4000-8000-000000000005', 10),
('00000000-0000-4000-8000-000000000022', 'subcategory', '2026.1', 'flooring', '00000000-0000-4000-8000-000000000005', 20),
('00000000-0000-4000-8000-000000000023', 'subcategory', '2026.1', 'wooden-doors', '00000000-0000-4000-8000-000000000006', 10),
('00000000-0000-4000-8000-000000000024', 'subcategory', '2026.1', 'aluminum-windows', '00000000-0000-4000-8000-000000000006', 20),
('00000000-0000-4000-8000-000000000025', 'subcategory', '2026.1', 'fencing', '00000000-0000-4000-8000-000000000007', 10),
('00000000-0000-4000-8000-000000000026', 'subcategory', '2026.1', 'paving', '00000000-0000-4000-8000-000000000007', 20)
ON CONFLICT (entity_id) DO NOTHING;

-- First product-type concepts.
INSERT INTO registry_entity (entity_id, entity_type, canonical_name, status) VALUES
('00000000-0000-4000-8000-000000000101', 'product_type', 'Portland Cement', 'active'),
('00000000-0000-4000-8000-000000000102', 'product_type', 'Reinforcement Bar', 'active'),
('00000000-0000-4000-8000-000000000103', 'product_type', 'Metal Roofing Sheet', 'active'),
('00000000-0000-4000-8000-000000000104', 'product_type', 'PVC Water Pipe', 'active'),
('00000000-0000-4000-8000-000000000105', 'product_type', 'Architectural Paint', 'active')
ON CONFLICT (entity_id) DO NOTHING;

INSERT INTO taxonomy_node (entity_id, taxonomy_kind, taxonomy_version, code, parent_entity_id, sort_order) VALUES
('00000000-0000-4000-8000-000000000101', 'product_type', '2026.1', 'portland-cement', '00000000-0000-4000-8000-000000000011', 10),
('00000000-0000-4000-8000-000000000102', 'product_type', '2026.1', 'reinforcement-bar', '00000000-0000-4000-8000-000000000012', 10),
('00000000-0000-4000-8000-000000000103', 'product_type', '2026.1', 'metal-roofing-sheet', '00000000-0000-4000-8000-000000000015', 10),
('00000000-0000-4000-8000-000000000104', 'product_type', '2026.1', 'pvc-water-pipe', '00000000-0000-4000-8000-000000000019', 10),
('00000000-0000-4000-8000-000000000105', 'product_type', '2026.1', 'architectural-paint', '00000000-0000-4000-8000-000000000021', 10)
ON CONFLICT (entity_id) DO NOTHING;

-- Measurement units required for the first catalog tests.
INSERT INTO registry_entity (entity_id, entity_type, canonical_name, status) VALUES
('00000000-0000-4000-8000-000000000201', 'unit', 'Bag', 'active'),
('00000000-0000-4000-8000-000000000202', 'unit', 'Kilogram', 'active'),
('00000000-0000-4000-8000-000000000203', 'unit', 'Metre', 'active'),
('00000000-0000-4000-8000-000000000204', 'unit', 'Piece', 'active'),
('00000000-0000-4000-8000-000000000205', 'unit', 'Litre', 'active')
ON CONFLICT (entity_id) DO NOTHING;

INSERT INTO unit (entity_id, unit_code, dimension, conversion_to_base, base_unit_code) VALUES
('00000000-0000-4000-8000-000000000201', 'bag', 'count', 1, 'piece'),
('00000000-0000-4000-8000-000000000202', 'kg', 'mass', 1, 'kg'),
('00000000-0000-4000-8000-000000000203', 'm', 'length', 1, 'm'),
('00000000-0000-4000-8000-000000000204', 'piece', 'count', 1, 'piece'),
('00000000-0000-4000-8000-000000000205', 'l', 'volume', 1, 'l')
ON CONFLICT (entity_id) DO NOTHING;
