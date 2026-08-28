# Vercel Deployment Diagnosis

## Observed deployment

The provided deployment URL, `https://wajenzi-ai-webapp-epx32adlg-boss-projects-d4875947.vercel.app`, was inspected after successful account authentication. It rendered a large block of JavaScript source beginning with `server/_core/index.ts` and schema types such as `workspace_members` and `registry_entities`; it did not render the Wajenzi.AI React marketing page or dashboard interface.

## Finding

The deployed content belongs to the repository’s pre-existing `wajenzi-ai-webapp` implementation. It is not the isolated `wajenzi-ai-platform` export added for the current frontend. The deployment URL’s project name also aligns with that existing application directory.

## Verified intended deployment

The separate Vercel project at `https://wajenzi-ai-platform.vercel.app` renders the intended Wajenzi.AI public frontend, including the construction hero and marketplace route. The marketplace completed its initial loading state and displayed **13,100 products** with supplier-linked product cards. This confirms the Vercel frontend is using the existing product data service successfully through the `/api/*` proxy.

## Correct Vercel project settings

| Setting | Required value |
|---|---|
| Git repository | `Wajenzi-ai/wajenzi-ai` |
| Root Directory | `wajenzi-ai-platform` |
| Framework preset | `Vite` |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build:frontend` |
| Output directory | `dist/public` |
| Branch | `main` |

The Vercel project currently associated with the supplied URL must be changed to the `wajenzi-ai-platform` root directory, or a separate Vercel project should be created from that root directory. No ontology, canonical product data, or marketplace database data needs to be copied; the committed `vercel.json` proxies `/api/*` to the existing Wajenzi.AI managed backend.
