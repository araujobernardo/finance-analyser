# Tasks: FA-BUDG-001 — Monthly Budget Data Model

**Input**: Design documents from `specs/027-budget-data-model/`
**Branch**: `027-budget-data-model`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to
- This feature touches `src/db/schema.ts` and `src/db/migrations/` only — no routes, no UI, no utilities

---

## Phase 2: Foundational — Migration File + Import (Blocking Prerequisites)

**Goal**: Add `integer` to the Drizzle import (required by all three table definitions) and create the SQL migration file that provisions all three tables in PostgreSQL. Both tasks must complete before any schema.ts table definitions are added.

**Independent Test**: Confirm `0007_budget_data_model.sql` exists and contains all three CREATE TABLE blocks, three FK constraints, two UNIQUE INDEXes, and four CHECK constraints. Run the migration against Postgres — it completes without error. `tsc --noEmit` passes after adding `integer` to the import.

- [ ] T001 Add `integer` to the `drizzle-orm/pg-core` import in `src/db/schema.ts` — the current import list is `boolean, date, index, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar`; add `integer` alphabetically so it reads `boolean, date, index, integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar`
- [ ] T002 Create `src/db/migrations/0007_budget_data_model.sql` — write exactly the SQL from `specs/027-budget-data-model/plan.md` Phase 1 Design → Migration SQL section: three `CREATE TABLE IF NOT EXISTS` blocks (`budgets`, `budget_defaults`, `user_preferences`), each followed by `CHECK` constraints inline; then three `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY` statements with `ON DELETE cascade`; then two `CREATE UNIQUE INDEX` statements for the composite unique constraints on `budgets` and `budget_defaults`; separate every statement with `--> statement-breakpoint` as seen in `src/db/migrations/0004_net_worth_snapshots.sql`

**Checkpoint**: `0007_budget_data_model.sql` exists and is correct. `integer` is imported in `src/db/schema.ts`. The feature is ready for table definitions.

---

## Phase 3: User Story 1 — Monthly Budget Record per Category (Priority: P1) 🎯 MVP

**Goal**: Add the `budgets` table definition and TypeScript types to `src/db/schema.ts`. The `budgets` table stores one spending limit per user per category per calendar month, with a composite unique constraint enforced at the DB level.

**Independent Test**: Use the Drizzle ORM to: (1) insert a budget `{userId, categoryName: "Groceries", year: 2026, month: 5, limitAmount: "500.00"}`; (2) read it back and confirm all fields; (3) update `limitAmount` to `"400.00"`; (4) attempt a second insert for the same user+category+year+month — expect a unique constraint violation; (5) insert the same category+month for a different user — expect success; (6) attempt `month: 0` — expect CHECK violation; (7) attempt `limitAmount: "-1"` — expect CHECK violation; (8) delete the record — confirm it no longer exists.

- [ ] T003 [US1] Add `budgets` table definition to `src/db/schema.ts` — add after the `goals` table, before `netWorthSnapshots`; use the exact Drizzle definition from `specs/027-budget-data-model/plan.md` Phase 1 Design → budgets table section: `pgTable("budgets", { id, userId (FK → users.id cascade), categoryName varchar(100), year integer, month integer, limitAmount numeric(15,2), createdAt timestamptz defaultNow, updatedAt timestamptz defaultNow }, (table) => ({ userCategoryMonthUniq: uniqueIndex("budgets_user_category_month_uniq").on(table.userId, table.categoryName, table.year, table.month) }))`; then append `export type Budget = typeof budgets.$inferSelect` and `export type NewBudget = typeof budgets.$inferInsert` to the type exports block at the bottom of the file
- [ ] T004 [P] [US1] Write integration tests for the budgets table in `src/db/__tests__/budgets.test.ts` — tests must verify: valid insert succeeds with correct field values; limitAmount and year/month stored accurately; UPDATE changes limitAmount without affecting other fields; DELETE removes only the targeted record; duplicate (same userId+categoryName+year+month) insert throws a unique constraint error; same category+month for different userId both coexist; month=0 throws a CHECK constraint error; month=13 throws a CHECK constraint error; limitAmount="-1.00" throws a CHECK constraint error; limitAmount="0.00" succeeds (zero is valid)

**Checkpoint**: `budgets` table definition is in `src/db/schema.ts`. `Budget` and `NewBudget` types are exported. All US1 integration tests pass.

---

## Phase 4: User Story 2 — Default Budget Configuration per Category (Priority: P2)

**Goal**: Add the `budget_defaults` table definition and TypeScript types to `src/db/schema.ts`. The `budget_defaults` table stores one standing spending limit per user per category, independent of any specific month.

**Independent Test**: Use the Drizzle ORM to: (1) insert a default `{userId, categoryName: "Groceries", limitAmount: "500.00"}`; (2) read it back; (3) update `limitAmount` to `"600.00"`; (4) attempt a second default for the same user+categoryName — expect unique constraint violation; (5) insert the same categoryName for a different user — expect success; (6) attempt `limitAmount: "-1.00"` — expect CHECK violation; (7) delete — confirm gone; (8) confirm the `budgets` records for the same user are unaffected by deleting a `budget_defaults` record.

- [ ] T005 [US2] Add `budgetDefaults` table definition to `src/db/schema.ts` — add after the `budgets` table; use the exact Drizzle definition from `specs/027-budget-data-model/plan.md` Phase 1 Design → budget_defaults table section: `pgTable("budget_defaults", { id, userId (FK → users.id cascade), categoryName varchar(100), limitAmount numeric(15,2), createdAt timestamptz defaultNow, updatedAt timestamptz defaultNow }, (table) => ({ userCategoryUniq: uniqueIndex("budget_defaults_user_category_uniq").on(table.userId, table.categoryName) }))`; then append `export type BudgetDefault = typeof budgetDefaults.$inferSelect` and `export type NewBudgetDefault = typeof budgetDefaults.$inferInsert` to the type exports block
- [ ] T006 [P] [US2] Write integration tests for the budget_defaults table in `src/db/__tests__/budgetDefaults.test.ts` — tests must verify: valid insert succeeds; limitAmount stored accurately; UPDATE changes limitAmount; DELETE removes only the targeted record; duplicate (same userId+categoryName) throws unique constraint error; same categoryName for different userId coexists; limitAmount="-0.01" throws CHECK error; limitAmount="0.00" succeeds; deleting a budget_default does not affect existing budgets records for the same user+categoryName

**Checkpoint**: `budgetDefaults` table definition is in `src/db/schema.ts`. `BudgetDefault` and `NewBudgetDefault` types are exported. All US2 integration tests pass.

---

## Phase 5: User Story 3 — Configurable Month Start Day per User (Priority: P3)

**Goal**: Add the `userPreferences` table definition and TypeScript types to `src/db/schema.ts`. The `user_preferences` table stores one row per user with a `monthStartDay` integer (1–28) that FA-BUDG-002 uses to compute budget period date ranges.

**Independent Test**: Use the Drizzle ORM to: (1) insert `{userId, monthStartDay: 15}` — confirm stored; (2) insert `{userId}` with no `monthStartDay` — confirm stored with value 1 (DB default); (3) update `monthStartDay` to 20; (4) attempt a second row for the same userId — expect unique constraint violation; (5) attempt `monthStartDay: 0` — expect CHECK violation; (6) attempt `monthStartDay: 29` — expect CHECK violation; (7) attempt `monthStartDay: 28` — expect success; (8) attempt `monthStartDay: 1` — expect success; (9) delete the row — confirm gone.

- [ ] T007 [US3] Add `userPreferences` table definition to `src/db/schema.ts` — add after the `budgetDefaults` table; use the exact Drizzle definition from `specs/027-budget-data-model/plan.md` Phase 1 Design → user_preferences table section: `pgTable("user_preferences", { id, userId (UNIQUE, FK → users.id cascade), monthStartDay integer notNull default(1), createdAt timestamptz defaultNow, updatedAt timestamptz defaultNow })`; note the single-column `.unique()` on userId (no table-level uniqueIndex needed); then append `export type UserPreferences = typeof userPreferences.$inferSelect` and `export type NewUserPreferences = typeof userPreferences.$inferInsert` to the type exports block
- [ ] T008 [P] [US3] Write integration tests for the user_preferences table in `src/db/__tests__/userPreferences.test.ts` — tests must verify: valid insert with explicit monthStartDay=15 succeeds; insert with no monthStartDay results in stored value of 1 (DB default); UPDATE changes monthStartDay; duplicate userId throws unique constraint error; monthStartDay=0 throws CHECK error; monthStartDay=29 throws CHECK error; monthStartDay=30 throws CHECK error; monthStartDay=28 succeeds; monthStartDay=1 succeeds; DELETE removes the row; deleting the user_preferences row does not affect budgets or budget_defaults rows for the same userId

**Checkpoint**: `userPreferences` table definition is in `src/db/schema.ts`. `UserPreferences` and `NewUserPreferences` types are exported. All US3 integration tests pass.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T009 [P] Run TypeScript type-check (`tsc --noEmit`) and lint (`npm run lint`) across `src/db/schema.ts` and any new test files — fix any type errors introduced by the new table definitions or type exports

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No external dependencies — start immediately
  - T001 (integer import) → T002 (migration SQL) can run in parallel; both are different parts of the same phase
  - T001 + T002 must complete before any Phase 3+ tasks
- **US1 (Phase 3)**: Depends on T001 (integer import) and T002 (migration applied)
  - T003 (schema.ts) → T004 [P] (tests) — tests can be written alongside T003 (different file)
- **US2 (Phase 4)**: Depends on T001; independent of US1 for schema.ts (different table definition)
  - T005 (schema.ts) → T006 [P] (tests)
- **US3 (Phase 5)**: Depends on T001; independent of US1/US2
  - T007 (schema.ts) → T008 [P] (tests)
- **Polish (Phase 6)**: Depends on T003 + T005 + T007 (all schema.ts edits must be complete before typecheck)

### Within Each Phase

- Schema.ts task (T003/T005/T007) before its corresponding test task — tests import the types
- T001 and T002 can run in parallel (different files: schema.ts import vs migration file)

### Parallel Opportunities

- T001 ∥ T002 (different files — schema.ts vs migrations/)
- T004 ∥ T003 (test file can be drafted alongside the schema definition)
- T006 ∥ T005 (same pattern)
- T008 ∥ T007 (same pattern)
- T003, T005, T007 can all run sequentially in any order — they're independent table definitions added to the same file; just don't conflict on the same file simultaneously

---

## Parallel Example: US1 Core Implementation

```
# After T001 + T002 complete:

# Run simultaneously:
T003 — add budgets table definition to src/db/schema.ts
T004 — write src/db/__tests__/budgets.test.ts

# Then US2 (T005 + T006) and US3 (T007 + T008) can follow in any order
```

---

## Implementation Strategy

### MVP (Phase 2 + Phase 3 only — US1)

1. Complete T001 + T002 (foundational)
2. Complete T003 + T004 (budgets table + tests)
3. **VALIDATE**: Run migration on DB; run tests; confirm uniqueness and CHECK constraints work
4. Ship — `budgets` table is live; FA-BUDG-002 can be built against it

### Incremental Delivery

1. Phase 2 (foundational) → migration file exists; `integer` imported ✅
2. Phase 3 (US1) → `budgets` table + types + tests ✅
3. Phase 4 (US2) → `budget_defaults` table + types + tests ✅
4. Phase 5 (US3) → `user_preferences` table + types + tests ✅
5. Phase 6 (polish) → typecheck + lint ✅

---

## Notes

- All three tables are created in a single migration file (`0007_budget_data_model.sql`) — the SQL must create all three tables even if you only wire up one in schema.ts per phase, since Postgres doesn't support partial migration files
- Drizzle returns `numeric` columns as strings — `limitAmount` will be `string` in TypeScript types; FA-BUDG-002 must `parseFloat()` before arithmetic
- CHECK constraints (month range, limitAmount >= 0, monthStartDay range) are enforced at the DB level only — schema.ts does not duplicate them; this is the established project pattern
- The `integer` import addition (T001) must happen before any `pgTable` call that uses `integer()` or TypeScript will fail
- `user_preferences.userId` uses column-level `.unique()` not `uniqueIndex()`— this is consistent with how `users.email` declares its uniqueness
- Do NOT run `drizzle-kit generate` — all migrations in this project are hand-written (confirmed: `meta/` snapshots only go to 0003)
