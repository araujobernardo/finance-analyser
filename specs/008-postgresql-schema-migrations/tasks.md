# Tasks: PostgreSQL Database Provisioning and Schema Migrations

**Branch**: `008-postgresql-schema-migrations`
**Input**: `specs/008-postgresql-schema-migrations/` — plan.md, spec.md, data-model.md, research.md, quickstart.md
**Format**: `[ID] [P?] [Story?] Description with file path`

- **[P]** — parallelisable (different files, no dependency on incomplete tasks)
- **[USn]** — maps to user story n from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure scaffolding required before any source files can be written.

- [ ] T001 Install runtime dependencies drizzle-orm and postgres: `npm install drizzle-orm postgres`
- [ ] T002 Install dev dependencies drizzle-kit and tsx: `npm install -D drizzle-kit tsx`
- [ ] T003 [P] Add `db:generate`, `db:migrate`, and `db:studio` scripts to `package.json` (see plan.md Task 6)
- [ ] T004 [P] Add `DATABASE_URL` placeholder to `.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Drizzle Kit configuration must exist before any schema file can be generated into migrations.

**⚠️ CRITICAL**: T005 must complete before T009 can run.

- [ ] T005 Create `drizzle.config.ts` at project root with `schema: './src/db/schema.ts'`, `out: './src/db/migrations'`, `dialect: 'postgresql'`, and `dbCredentials.url` from `process.env.DATABASE_URL` (see plan.md Task 2)

**Checkpoint**: Foundation ready — schema and migration files can now be created.

---

## Phase 3: User Story 1 — Run migrations on a fresh environment (Priority: P1) 🎯 MVP

**Goal**: A single `npm run db:migrate` creates all 7 tables plus the migrations tracking table on a blank Supabase database in under 30 seconds.

**Independent Test**: Point `DATABASE_URL` at a fresh Supabase project, run `npm run db:migrate`, open Table Editor and confirm all 7 tables and `__drizzle_migrations` exist. Run again — confirm no error and no changes.

- [ ] T006 [US1] Create `src/db/schema.ts` with all 7 table definitions (`users`, `accounts`, `categories`, `transactions`, `assets`, `liabilities`, `goals`) including all columns, FK references, UUID PKs, and `$inferSelect`/`$inferInsert` type exports — follow `specs/008-postgresql-schema-migrations/data-model.md` exactly
- [ ] T007 [US1] Create `src/db/index.ts` — postgres.js client singleton and Drizzle `db` instance with schema; add server-side-only comment (see plan.md Task 4)
- [ ] T008 [P] [US1] Create `src/db/migrate.ts` — migration runner using `drizzle-orm/postgres-js/migrator`; opens one connection (`max: 1`), runs migrate, closes connection (see plan.md Task 5)
- [ ] T009 [US1] Run `npm run db:generate` to produce `src/db/migrations/0000_initial_schema.sql` and `src/db/migrations/meta/` files; review the generated SQL to confirm FK constraints, UUID columns, and NUMERIC(15,2) precision match `data-model.md`
- [ ] T010 [US1] Run `npm run db:migrate` against a Supabase database; verify all 7 tables and `__drizzle_migrations` appear in Supabase Table Editor; run a second time and confirm it exits cleanly with no changes (idempotency check)

**Checkpoint**: US1 complete — fresh-environment migration works end-to-end. ✅

---

## Phase 4: User Story 2 — Developer adds a new migration (Priority: P2)

**Goal**: Demonstrate that a second migration file is picked up automatically, applied once, and tracked — without touching already-applied migrations.

**Independent Test**: After US1 completes, add a second migration, run `npm run db:migrate`, check `__drizzle_migrations` shows two rows, run again and confirm only two rows (no duplicate).

- [ ] T011 [US2] Add a composite index on `transactions(user_id, date)` to `src/db/schema.ts` using Drizzle's `index()` helper — this is a genuine performance addition needed for user-scoped transaction queries
- [ ] T012 [US2] Run `npm run db:generate` to produce `src/db/migrations/0001_transaction_user_date_index.sql`; review the SQL; run `npm run db:migrate` and confirm only the new migration is applied; verify `__drizzle_migrations` contains exactly two rows; run again to confirm idempotency

**Checkpoint**: US2 complete — incremental migration system proven. ✅

---

## Phase 5: User Story 3 — Data isolated per user (Priority: P3)

**Goal**: Every non-user table has a `user_id` FK with CASCADE delete. The schema structurally prevents orphaned cross-user records.

**Independent Test**: Review `src/db/schema.ts` and `src/db/migrations/0000_initial_schema.sql` — confirm every non-users table declares `user_id` referencing `users.id` with `ON DELETE CASCADE`, and that `transactions.account_id` references `accounts.id`.

- [ ] T013 [US3] Audit `src/db/schema.ts` against the FK requirements in `data-model.md`: every table except `users` must have `user_id` → `users.id` CASCADE; `transactions` must have `account_id` → `accounts.id` CASCADE; `assets.linked_account_id` and `goals.linked_account_id` must use SET NULL — fix any gaps
- [ ] T014 [US3] Run `tsc --noEmit` and confirm zero TypeScript errors; run `npx drizzle-kit check` and confirm no schema drift between `src/db/schema.ts` and the migration snapshots

**Checkpoint**: US3 complete — user isolation enforced at schema level. ✅

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T015 [P] Update `docs/architecture.md`: add Drizzle ORM and Supabase PostgreSQL to the tech stack table; add a note that `src/db/` is server-side only and must not be imported from React components or the Vite browser bundle
- [ ] T016 Commit all files together: `src/db/`, `drizzle.config.ts`, updated `package.json`, `.env.example`, `docs/architecture.md`, and the generated `src/db/migrations/` directory

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Requires Phase 1 complete (needs tsx + drizzle-kit installed)
- **Phase 3 (US1)**: Requires Phase 2 complete (needs drizzle.config.ts before `db:generate` runs)
- **Phase 4 (US2)**: Requires Phase 3 complete (needs initial schema and first migration to exist)
- **Phase 5 (US3)**: Can run in parallel with Phase 4 (schema audit is independent of incremental migration test)
- **Phase 6 (Polish)**: Requires all phases complete

### Within Phase 3

- T006 (`schema.ts`) must complete before T007 (`index.ts`) and T009 (`db:generate`)
- T007 and T008 can run in parallel (different files)
- T009 (`db:generate`) must follow T006
- T010 (manual migration run) must follow T009

### Parallel Opportunities

```
# Phase 1 — T003 and T004 can run in parallel:
Task T003: Add npm scripts to package.json
Task T004: Add DATABASE_URL to .env.example

# Phase 3 — T007 and T008 can run in parallel after T006:
Task T007: Create src/db/index.ts
Task T008: Create src/db/migrate.ts

# Phase 6 — T015 runs in parallel with final commit staging:
Task T015: Update docs/architecture.md
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (T006 → T007+T008 parallel → T009 → T010)
4. **STOP and VALIDATE**: Run `npm run db:migrate` on a fresh Supabase project
5. All 7 tables visible in Table Editor → MVP complete

### Full Delivery

1. MVP above → foundation proven
2. Phase 4 (US2): Incremental migration proof → migration system verified
3. Phase 5 (US3): Schema audit + type check → user isolation confirmed
4. Phase 6: Docs + final commit

---

## Summary

| Phase          | Story                 | Tasks     | Parallelisable |
| -------------- | --------------------- | --------- | -------------- |
| 1 Setup        | —                     | T001–T004 | T003, T004     |
| 2 Foundational | —                     | T005      | —              |
| 3 US1 (P1) 🎯  | Fresh migration       | T006–T010 | T007, T008     |
| 4 US2 (P2)     | Incremental migration | T011–T012 | —              |
| 5 US3 (P3)     | User isolation        | T013–T014 | T013, T014     |
| 6 Polish       | —                     | T015–T016 | T015           |

**Total**: 16 tasks across 6 phases
