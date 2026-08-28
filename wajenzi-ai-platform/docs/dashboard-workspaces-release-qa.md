# Wajenzi.AI Role Workspace Release QA

## Scope

This verification covers the dashboard-only modernization release. The public Wajenzi.AI landing page remains outside this scope. Internal workspaces retain the established **Inter** body font and **Space Grotesk** display font while using the scoped black, charcoal, and teal operating-environment visual system.

## Implemented workspace coverage

| Area | Evidence |
| --- | --- |
| Role-aware routes | Client/homeowner, contractor, developer, architect, engineer, quantity surveyor, project manager, supplier, manufacturer, logistics provider, financier, institutional client, configurable organization role, AI procurement, project intelligence, escrow, finance and risk, marketplace intelligence, administration, operations, and supplier onboarding are represented in the shared workspace registry. |
| Work surfaces | The new professional and operational roles use role-specific queue labels, KPIs, typed persistent work items, registry/ontology context, traceability information, and applicable secure document uploads. Each action opens a governed form requesting a workflow-specific reference plus supporting evidence, readiness, ownership, or review details before it can be created. Existing core workspaces retain their implemented BOQ, RFQ, marketplace, delivery, finance, and onboarding controls. |
| Controlled actions | Actions that indicate approval, publication, funding, settlement, valuation, risk, or issue decisions open an explicit confirmation dialog before an authenticated typed work item is created. Work is classified as project, BOQ, procurement, document, approval, delivery, finance, registry, or task. The dialog does not claim to release funds or perform a financial transaction. |
| Context handoff | The shared shell retains organization and project selectors. A role-aware AI call to action stores the active workspace context and opens AI Procurement so users can continue with a project-specific question. |
| Command centre | The shared shell offers a `Ctrl/Cmd + K` keyboard shortcut and search dialog that filters all registered workspace routes and navigates to the selected role workspace. Browser verification opened the dialog and filtered it to the Wajenzi operations result. |

## Automated validation

| Check | Result |
| --- | --- |
| `pnpm check` | Passed after the final role-action and command-centre updates. |
| Database migration | Reviewed and applied non-destructive migration `0004_sad_xorn.sql`, which adds the `roleWorkItems` table and owner, workspace, project, and status indexes. |
| `pnpm test` | Passed: 12 test files and 31 tests. Includes authenticated creation, retrieval, and status transition coverage for typed quantity-surveyor work, confirmation safeguards, route-registry uniqueness coverage, and governed work-detail configuration coverage. |
| Desktop role screenshots | Captured for developer, architect, quantity surveyor, manufacturer, financier, operations, and custom organization role at 1280 × 720. |
| Mobile role screenshots | Captured for architect, manufacturer, and custom organization role at 390 × 844. KPI stacks, work queues, input controls, and the dark visual system remained readable. |

## Browser-session note

The unauthenticated preview correctly exposes role routes, reads the active organization/project context, and opened/filtered the command-centre dialog. A successful record still requires a real signed-in session. Browser automation intermittently returned stale element references while attempting the confirmation control, so no unauthenticated or fabricated success event was recorded.

## Explicit remaining scope

The release does not yet introduce full database-backed organization selection, project-scoped RBAC, document revision entities, dedicated approval tables, or transaction execution. Those are the next schema-and-server milestones needed for strict tenant enforcement and fully transactional workflows.
