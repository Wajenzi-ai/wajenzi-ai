# Wajenzi.ai

Role-based construction procurement frontend using Next.js App Router and Supabase.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example` and add your Supabase project values.

3. Ensure Supabase has a `profiles` table with:

```sql
id uuid primary key references auth.users(id) on delete cascade,
full_name text,
email text,
company_name text,
role text check (role in ('contractor', 'supplier', 'manufacturer', 'admin')),
created_at timestamptz default now()
```

4. Run locally:

```bash
npm run dev
```

## Cloudflare Pages

Set the build command to:

```bash
npm run build
```

Set the output directory to:

```bash
out
```

Add these environment variables in Cloudflare Pages:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## WAJENZI ontology and registry foundation

The [`ontology-registry/`](./ontology-registry/) directory contains the versioned WAJENZI ontology and ID-registry foundation, including the Kenya public-reference data layers, master canonical product catalogue bootstrap, supplier canonicalization contract, registry schemas, API contracts, diagrams, normalized seeds, raw source files, and validation scripts.

Begin with [`ontology-registry/README.md`](./ontology-registry/README.md), [`canonical-product-import.md`](./ontology-registry/docs/canonical-product-import.md), and [`public-data-gap-closure.md`](./ontology-registry/docs/public-data-gap-closure.md). The master catalogue is authoritative for initial product identity. Supplier submissions are retained as source evidence and attach to existing canonical products when matched; only an approved unmatched submission may create a new canonical product.
