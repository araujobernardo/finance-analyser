# Quickstart: Database Setup and Migrations

## Prerequisites

- Node.js 18+
- A Supabase project (free tier at [supabase.com](https://supabase.com))
- The repo cloned and `npm install` run

## Step 1 — Get your Supabase connection string

1. Open your Supabase project → **Settings → Database → Connection string**
2. Select the **Direct connection** tab (port 5432 — not the pooler)
3. Copy the URI: `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`

## Step 2 — Create your `.env` file

```bash
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL` to the direct connection string from Step 1:

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
```

> **Never commit `.env`** — it is listed in `.gitignore`.

## Step 3 — Apply the initial migration

```bash
npm run db:migrate
```

This runs `src/db/migrate.ts` which applies all pending migrations from `src/db/migrations/` to your Supabase database. On a fresh database it creates all 7 tables plus the Drizzle migrations tracking table.

Expected output:

```
Applying migrations...
Migration applied: 0000_initial_schema.sql
Done.
```

## Step 4 — Verify in Supabase

Open your Supabase project → **Table Editor**. You should see:

- `users`
- `accounts`
- `transactions`
- `categories`
- `assets`
- `liabilities`
- `goals`
- `__drizzle_migrations` (internal tracking table)

## Useful Commands

| Command               | What it does                                                                        |
| --------------------- | ----------------------------------------------------------------------------------- |
| `npm run db:generate` | Generate a new SQL migration from schema changes (after editing `src/db/schema.ts`) |
| `npm run db:migrate`  | Apply all pending migrations to the database                                        |
| `npm run db:studio`   | Open Drizzle Studio — a browser UI to browse your database                          |

## Adding a new migration (future phases)

1. Edit `src/db/schema.ts` — add or modify table definitions
2. Run `npm run db:generate` — Drizzle Kit diffs the schema and generates a new SQL file in `src/db/migrations/`
3. Review the generated SQL file before committing
4. Run `npm run db:migrate` to apply it
5. Commit both `src/db/schema.ts` and the new migration file together

## Important: Server-side only

`src/db/` uses the `postgres` (postgres.js) driver which requires Node.js built-ins (`net`, `tls`). It **cannot** be imported from React components or any file that ends up in the browser bundle. The database layer is the foundation for a future Express API — React components will call that API, never the database directly.
