# Quickstart: FA-NW-001 — Asset and Liability Data Model

## Prerequisites

- `DATABASE_URL` set in `.env` pointing at the Supabase PostgreSQL instance
- `npm run server:dev` not required for schema-only work

## Step 1 — Apply schema changes

```bash
npm run db:generate   # generates 0003_*.sql migration file
npm run db:migrate    # applies migration to the live database
```

Expected output from `db:migrate`:

```
Running migrations...
Migration applied: 0003_*.sql
Done!
```

## Step 2 — Verify columns were added

Connect to the database (via Drizzle Studio or psql) and confirm:

```sql
-- assets should now have updated_at
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'assets'
ORDER BY ordinal_position;

-- liabilities should now have linked_account_id and updated_at
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'liabilities'
ORDER BY ordinal_position;
```

Expected columns for **assets**: id, user_id, name, type, value, linked_account_id, created_at, **updated_at**

Expected columns for **liabilities**: id, user_id, name, type, value, **linked_account_id**, created_at, **updated_at**

## Step 3 — Verify TypeScript types

```bash
npm run typecheck
```

Must exit 0. `Asset` and `Liability` inferred types now include `updatedAt`. `NewLiability` now includes optional `linkedAccountId`.

## Step 4 — Verify existing data is intact

```bash
npm run server:dev
```

Sign in and confirm accounts and transactions load normally — the migration is additive only and should not affect existing data.

## Rollback

If needed, revert manually:

```sql
ALTER TABLE assets DROP COLUMN updated_at;
ALTER TABLE liabilities DROP COLUMN linked_account_id;
ALTER TABLE liabilities DROP COLUMN updated_at;
```

Then delete the generated `0003_*.sql` file and the corresponding entry in `__drizzle_migrations`.
