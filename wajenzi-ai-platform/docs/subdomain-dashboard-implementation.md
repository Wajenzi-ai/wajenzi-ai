# Wajenzi.AI subdomain dashboard implementation

## Scope

The existing Wajenzi.AI application remains one React/Vite frontend with one Express/tRPC backend, one managed database, one authentication system, and one ontology/product registry. The new subdomain layer adds entry-point behavior; it does not copy the application into separate role projects or create separate databases.

## Central configuration

`client/src/lib/subdomainRouting.ts` is the single role-to-subdomain registry. It defines the requested client, contractor, architect, engineer, QS, supplier, manufacturer, logistics, finance, project manager, site, developer, consultant, admin, and control environments. The `shared/permissions.ts` registry provides a common permission vocabulary and role presets while the existing server-side membership JSON remains authoritative for actual authorization decisions.

## Routing behavior

The public root domain continues to render the existing marketing homepage. `app.wajenzi.ai` enters the authenticated universal workspace chooser. A role hostname redirects to the matching existing `/app/:workspace` route. Unknown preview hosts continue to render the public homepage so Vercel preview URLs do not become blank. This routing is presentation and entry-point behavior only; subdomains do not grant authorization.

The shared `DashboardLayout` continues to provide authentication, organization and project selection, notifications, navigation, and responsive dashboard structure. Existing protected tRPC procedures and organization/project membership checks remain the security boundary. The role chooser explicitly states that backend authorization still applies.

## Data and identity boundaries

All environments use the existing user identity, organization memberships, projects, ontology, canonical product registry, supplier products, POS projections, documents, events, and audit data. No subdomain-specific user IDs or databases were introduced. Supplier and manufacturer document workflows remain restricted by their existing protected procedures.

## Deployment status

The Vercel project remains the unified Vite deployment linked to the existing GitHub repository and `wajenzi-ai-platform` root directory. The existing Vercel configuration continues to proxy `/api/*` to the managed backend and provide SPA fallback behavior. The frontend-only production build passed after the routing changes.

The Cloudflare connector was present in session configuration but its MCP server was unavailable to the sandbox during this implementation. Therefore no DNS records were created or altered. The requested subdomains require the existing domain owner to attach them to the unified Vercel project and create the corresponding DNS records; this report intentionally does not claim that those DNS records are configured.

## Validation

TypeScript checking passed. The complete Vitest suite passed with 16 files and 54 tests, including hostname normalization, role-to-subdomain mapping, environment classification, and centralized permission-registry tests. The frontend-only Vite build passed. Desktop screenshots confirmed the unchanged public homepage and the new universal workspace chooser without visible overflow.

## Remaining production actions

Before public use of role subdomains, configure the DNS records through the available Cloudflare account and attach each hostname to the unified Vercel project. Confirm cross-subdomain OAuth callback/session behavior with the production authentication provider. Keep admin and control access enforced server-side; the frontend hostname must never be treated as an authorization grant.
