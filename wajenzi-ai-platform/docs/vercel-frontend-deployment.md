# Vercel Frontend Deployment

## Deployment model

This repository can deploy the **Wajenzi.AI frontend only** from the `wajenzi-ai-platform` directory on Vercel. The static React/Vite application is served by Vercel, while the existing Wajenzi.AI managed deployment remains the API and data service. This preserves the current ontology-backed product identity and the marketplace/Master POS data rather than copying database records or credentials into Vercel.

> The frontend does not embed the canonical ontology or product database. Public catalogue, GitHub-canonical catalogue, and Master POS reads continue through the existing `/api/trpc` service, proxied at the Vercel site’s own `/api/*` paths.

| Concern | Production boundary |
|---|---|
| Frontend hosting | Vercel serves the Vite build from `dist/public`. |
| Application API | `vercel.json` forwards `/api/*` to `https://wajenziai-fxhv7ppu.manus.space/api/*`; the frontend can keep its existing relative tRPC endpoint. |
| Ontology and canonical product identity | The existing server continues to read the public Wajenzi GitHub canonical catalogue and retains its authoritative matching boundary. |
| Marketplace and Master POS offers | The existing managed API continues to query the present database. No product rows are exported into the client bundle. |
| Authentication and protected dashboards | Requests stay on the Vercel site’s `/api/*` paths through the proxy. The OAuth redirect URI must also be registered for the final Vercel domain before relying on sign-in. |
| Secrets | Do not copy `DATABASE_URL`, storage keys, JWT secrets, or server forge keys to Vercel. The frontend uses only public `VITE_*` build variables. |

## Vercel configuration

Create a Vercel project from `Wajenzi-ai/wajenzi-ai`, then set **Root Directory** to `wajenzi-ai-platform`. Vercel’s Vite guidance supports a static Vite build and recommends a rewrite to `index.html` for single-page application deep links. The committed `vercel.json` includes that fallback as well as the API proxy. [1]

| Vercel field | Value |
|---|---|
| Framework preset | Vite |
| Root Directory | `wajenzi-ai-platform` |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm build:frontend` |
| Output Directory | `dist/public` |
| Production branch | `main` |

Add these **public** build variables from the current application configuration; do not place their values in Git:

| Variable | Purpose |
|---|---|
| `VITE_APP_ID` | Identifies the existing OAuth application to the frontend. |
| `VITE_OAUTH_PORTAL_URL` | OAuth sign-in portal base URL. |
| `VITE_ANALYTICS_ENDPOINT` | Optional existing analytics endpoint. |
| `VITE_ANALYTICS_WEBSITE_ID` | Optional existing analytics site identifier. |

Before enabling sign-in for the Vercel domain, register `https://<your-vercel-domain>/api/oauth/callback` as an approved redirect URI for the existing OAuth application. Test a public marketplace/catalogue page first, then a complete sign-in and protected-dashboard flow. The API proxy intentionally points at the current managed backend so that public products and the canonical ontology remain exactly the established server-side sources.

## Scope and operating limits

This configuration does **not** move Express, tRPC, MySQL/TiDB, document storage, semantic extraction, or AI calls to Vercel. Those components remain on the current Wajenzi.AI managed service, which avoids placing credentials and writable commercial data in a static frontend deployment. If a future migration requires Vercel-hosted backend functionality, it should be handled as a separate authenticated server migration rather than by exposing database credentials in browser variables.

## Verification

Run `pnpm build:frontend` locally or in Vercel. Test `/`, `/marketplace`, and a deep-linked application route after deployment. The SPA fallback is necessary because Vite SPA deep links are not served automatically without an index rewrite. [1]

## References

[1]: https://vercel.com/docs/frameworks/frontend/vite "Vercel: Vite on Vercel"
