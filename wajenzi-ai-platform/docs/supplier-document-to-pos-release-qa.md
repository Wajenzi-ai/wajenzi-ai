# Supplier document-to-POS release QA

## Delivered operating path

This release extends the existing Wajenzi.AI semantic extraction and marketplace foundations rather than creating a competing product master or POS. A supplier or manufacturer source is received in managed object storage, normalized into supplier-owned semantic product evidence, matched to the existing Wajenzi canonical registry, and activated as a supplier-product relationship only after an accepted or explicitly approved match. The Master POS is a projection over active, approved supplier offers, grouped by canonical identifier.

| Stage | Controlled implementation |
| --- | --- |
| Source intake | Authenticated Supplier and Manufacturer uploads accept the approved source formats, calculate a SHA-256 checksum, return a prior source on an exact checksum duplicate, and assign a canonical document ID such as `WJ-DOC-00000001`. The original bytes are retained in managed storage rather than database fields. |
| Version and job state | A stable supplier-source key creates document versions and parent lineage. Persisted extraction and canonical-matching jobs retain queued, processing, completed, review, and failed states. Current work is executed in-request; a future queue worker can use the same job records. |
| Extraction and review | Existing deterministic parsing retains raw source evidence, supplier values, normalized values, field confidence, classification confidence, product status, and review readiness. The review screen performs an explicit canonical registry match and allows confirmation-backed approve, reject, or missing-evidence decisions. |
| Canonical governance | Existing canonical data from the public Wajenzi repository is cached server-side and copied only as a local reference record. Supplier data never modifies the canonical identity. Exact canonical identifiers and high-confidence titles can auto-accept; lower-confidence candidates remain reviewable. [1] [2] |
| Supplier POS | A canonical-approved product becomes one supplier-product record with a stable `WJ-SP` identifier. Price and stock observations are appended only when values change; a revised source with the same supplier SKU and canonical product updates the existing relationship rather than duplicating commercial identity. |
| Master POS and marketplace | The Master POS aggregates active Supplier POS offers only when their marketplace record is active. It is grouped by canonical product and surfaces approved-offer count, lowest current price, and available stock. Marketplace publication requires a ready semantic record, approved canonical mapping, active Supplier POS product, and explicit user confirmation. |
| Traceability | Immutable events are recorded for source upload, extraction start/completion/failure, matching completion, review decisions, Supplier POS activation, and marketplace visibility changes. These retain source document, correlation, actor, prior/next state, and evidence references. |
| Procurement AI | The procurement agent queries Master POS through the typed server procedure before model invocation. It receives canonical identifier, name, lowest approved offer, stock, and offer count; it must identify those records by `WJ-PROD` identifier and state when no approved offer was found. |

## Validation

| Check | Result |
| --- | --- |
| Automated regression suite | `pnpm test` passed: **14 test files and 44 tests**. Coverage includes canonical matching, explicit review decision persistence, Supplier POS activation, canonical-gated marketplace publication, Master POS projection query, semantic extraction normalization, and agent grounding. |
| Type and production validation | `pnpm check` and `pnpm build` passed. The build reports the pre-existing large-client-chunk advisory only. |
| Access boundary | Protected tRPC procedures enforce authenticated owner scope. Semantic source routes accept only Supplier or Manufacturer workspaces. The raw source endpoint rejects requests without an authenticated session. |
| Visual validation | Supplier and Manufacturer desktop workspaces render the retained-source, canonical-match, activation, and POS controls. The Architect workspace remains excluded. Manufacturer and Supplier initial mobile views were checked at 390×844. |

## Operational boundaries

> The release does not fabricate source products, marketplace offers, or pricing for demonstration. A real signed-in supplier or manufacturer should complete an upload, match, decision, activation, and marketplace publication acceptance test using a real authorized source before operational rollout.

The persistence model is owner-scoped and intentionally does **not** claim full multi-organization membership, project-scoped RBAC, supplier verification, external ERP synchronization, or asynchronous worker execution. The job, lineage, and event entities are in place so those capabilities can be added without replacing the document-to-POS model. Image-only documents without extractable text continue to require manual review.

## References

[1]: https://github.com/Wajenzi-ai/wajenzi-ai "Wajenzi canonical repository"
[2]: https://raw.githubusercontent.com/Wajenzi-ai/wajenzi-ai/main/ontology-registry/README.md "Wajenzi ontology registry documentation"

