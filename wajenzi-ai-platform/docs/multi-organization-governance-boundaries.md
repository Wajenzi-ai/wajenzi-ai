# Multi-Organization Governance Boundaries

**Scope.** This release introduces formal organization and project membership context for authenticated dashboard work. The selected organization and project IDs persist locally, flow through a shared dashboard context, and are supplied when a role work item is created. The server accepts a context-bound work item only when the caller has an active organization membership and, where supplied, an active membership in the selected project within that organization.

| Capability | Implemented boundary | Explicit limitation |
|---|---|---|
| Organization membership | Organization owners are created with active membership and baseline organization, project, and member management permissions. Project creation recognizes either the `project.manage` permission or the authorized legacy workspace roles. | Supplier semantic source, Supplier POS, and Master POS data remain owner-scoped until supplier organization identity is migrated and enforced across those procedures. |
| Project membership | New projects create an active project-owner membership and role-work items validate organization-to-project membership. | Existing role-work listing remains owner-scoped; it is not yet a full organization-wide task feed. |
| Supplier verification | Each organization can configure a minimum score and named evidence requirements. A verification or rejection requires an explicit confirmation flag. A verified decision must meet the configured score and include all configured evidence keys. | No regulatory, legal, or commercial verification requirements are pre-populated or implied. Supplier-profile administration UI remains outside this release. |
| ERP integration | A provider-neutral `custom` configuration records direction and resource mappings. The boundary is organization-scoped and auditable through connection and run records. | There are no credentials in these records, no selected ERP provider, no webhook, no outbound call, and no scheduled synchronization. |
| Processing jobs | Existing document-processing job records remain available for request-triggered extraction. | No daemon, timer, queue worker, or scheduled retry service was introduced. |

## Validation record

The Supplier and Contractor workspaces were rendered at desktop resolution after the shared context change. The Contractor view retained readable organization and project selectors in the global toolbar. The Supplier extraction workspace retained its dense review-table behavior with horizontal containment, and the new governance controls remained inside the supplier-only semantic-extraction surface. A mobile 390 × 844 Supplier rendering retained the stack without viewport overflow; wide product and POS data stay in their intentional scrollable table containers.

The automated contract suite includes cases for allowed organization/project work, rejected organization nonmembership, rejected project mismatch, and rejected project-without-organization. It also verifies that verification-policy and ERP-boundary configuration remain organization-scoped and that ERP configuration returns `outboundCallsEnabled: false`.
