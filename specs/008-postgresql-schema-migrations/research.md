# Research: PostgreSQL Database Provisioning and Schema Migrations

**Branch**: `008-postgresql-schema-migrations` | **Date**: 2026-05-05

---

## Decision 1 — PostgreSQL Driver

**Decision**: `postgres` (postgres.js) as the Drizzle adapter, not `pg` (node-postgres).

**Rationale**: postgres.js is the first-class driver in Drizzle's documentation for PostgreSQL. It is promise-native, has better TypeScript types out of the box, and is significantly lighter than `pg`. Supabase's own JavaScript client uses it internally. No callback-style API to wrap.

**Alternatives considered**:

- `pg` (node-postgres) — mature but callbacks-based, heavier, slightly worse TS types. Drizzle supports it but recommends postgres.js.
- `@neondatabase/serverless` — Neon-specific HTTP driver, not appropriate for Supabase.

---

## Decision 2 — Primary Key Type

**Decision**: UUID v4 (`uuid().defaultRandom().primaryKey()`) for all tables.

**Rationale**: Sequential integer IDs leak record counts and creation order when exposed in API responses or URLs (e.g., `/users/3` tells an attacker there are at least 3 users). UUIDs are non-guessable. Supabase's PostgreSQL has the `uuid-ossp` extension available; Drizzle's `defaultRandom()` uses `gen_random_uuid()` which is built into PostgreSQL 13+.

**Alternatives considered**:

- `serial` / `integer` auto-increment — simpler, faster joins, but unsuitable once IDs are exposed externally. The app is heading toward a multi-user web app where IDs will appear in URLs.
- ULID / CUID — sortable and non-guessable but require additional libraries and are non-standard.

---

## Decision 3 — Supabase Connection Mode

**Decision**: Direct connection (port 5432) for migrations via `DATABASE_URL`. Future API layer should use the Transaction Pooler (port 6543) via a separate `DATABASE_URL_POOLED` variable.

**Rationale**: Drizzle's migration runner executes DDL statements in sequence. Supabase's PgBouncer pooler runs in transaction-mode by default, which does not support DDL or prepared statements reliably across pool hops. The direct connection has a hard limit of ~100 simultaneous connections on the free tier — acceptable for a migration script that opens one connection, applies migrations, and closes. The Supabase dashboard shows both connection strings; the direct one is labelled "Direct connection".

**Alternatives considered**:

- Transaction Pooler for migrations — unreliable with DDL; officially not recommended by Supabase for migrations.
- Session Pooler — works but wastes a long-lived connection slot on a free-tier project.

---

## Decision 4 — `transactions.category` as Free Text (Not FK)

**Decision**: `category` column in `transactions` is `varchar(100)`, nullable, not a foreign key to the `categories` table.

**Rationale**: The existing account-number-based categorisation feature (branch `006`) assigns string category names directly to transactions. Introducing a FK at this stage would require every category string to exist in the `categories` table before any transaction can be inserted — creating a migration ordering dependency that doesn't exist yet. A future migration can add a `category_id` FK column and backfill it once the category management API is built.

**Alternatives considered**:

- FK to `categories.id` from day one — cleaner relational model, but breaks the existing categorisation flow until categories are seeded.
- Enum column — too rigid, categories are user-defined.

---

## Decision 5 — Migration Script Runner

**Decision**: `tsx --env-file=.env src/db/migrate.ts` as the `db:migrate` npm script.

**Rationale**: `tsx` runs TypeScript directly without a build step. The `--env-file` flag (available in tsx 4+) loads `.env` without requiring `dotenv` as a runtime dependency. The migration script stays in the same TypeScript codebase and benefits from full type checking. `drizzle-kit push` is explicitly ruled out — it bypasses migration files and is not safe for production.

**Alternatives considered**:

- Compile to JS first, then run with Node — adds a build step with no benefit for a CLI script.
- `dotenv/config` import — works but adds a runtime dependency for a dev-only script.
- `drizzle-kit push` — pushes schema directly without generating migration files; not reviewable, not committable, not safe for production.

---

## Decision 6 — `src/db/` Is Server-Side Only

**Decision**: Nothing in `src/db/` is imported by any React component or Vite browser bundle.

**Rationale**: `postgres` (postgres.js) uses Node.js built-ins (`net`, `tls`, `crypto`). Vite will fail to bundle it for the browser. The database layer is the foundation for a future API server (Express or similar). React components will eventually call that API — they will never call the database directly.

**Implication**: The `src/db/` directory is effectively inert from the browser's perspective until the API layer is added in a future feature. This is intentional and correct.
