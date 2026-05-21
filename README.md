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
role text check (role in ('contractor', 'supplier', 'manufacturer')),
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
