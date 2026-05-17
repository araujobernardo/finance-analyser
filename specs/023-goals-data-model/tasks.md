# Tasks: Financial Goals Data Model (FA-GOAL-001)

**Input**: Design documents from `/specs/023-goals-data-model/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Scope**: Data layer only — two files, no API, no UI, no progress logic.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

## Phase 1: Setup

No new dependencies or project structure changes required. Skip.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The migration + schema update are the entire implementation. All user story verification depends on these two tasks.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 Create migration `src/db/migrations/0005_goals_schema_complete.sql` with three `ALTER TABLE goals ADD COLUMN` statements: `category_name varchar(100)`, `current_amount numeric(15,2)`, `updated_at timestamptz NOT NULL DEFAULT now()`
- [ ] T002 Update goals table in `src/db/schema.ts`: add `categoryName: varchar("category_name", { length: 100 })`, `currentAmount: numeric("current_amount", { precision: 15, scale: 2 })`, and `updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()` to the `pgTable` definition

**Checkpoint**: Foundation complete — both implementation tasks done. Proceed to user story verification.

---

## Phase 3: User Story 1 — Create a Savings Target Goal (Priority: P1) 🎯 MVP

**Goal**: Confirm the goals table stores all fields required for a savings target goal, including the `currentAmount` cache needed by FA-GOAL-003 to track progress against the linked account's transaction sum.

**Independent Test**: Inspect the `Goal` TypeScript type (via `$inferSelect`) and confirm it includes `linkedAccountId: string | null`, `currentAmount: string | null`, and `updatedAt: Date`. Also confirm `status` defaults to `"active"`.

- [ ] T003 [US1] Verify in `src/db/schema.ts` that the `Goal` inferred type includes `linkedAccountId`, `currentAmount`, and `updatedAt` — run `npx tsc --noEmit` to confirm no type errors after the schema update

**Checkpoint**: Savings target goal data model complete.

---

## Phase 4: User Story 2 — Create a Debt Payoff Goal (Priority: P1)

**Goal**: Confirm the goals table supports a debt payoff goal linked to an account, with `current_amount` available for FA-GOAL-003 to track the remaining balance via ABS(SUM of transactions).

**Independent Test**: Confirm `linkedAccountId` is nullable (FK set-null on account delete) and `currentAmount` is nullable (null until FA-GOAL-003 runs). Check the migration SQL for correct types.

- [ ] T004 [P] [US2] Verify in `src/db/migrations/0005_goals_schema_complete.sql` that `current_amount` is nullable (no NOT NULL constraint) and that `linked_account_id` already has SET NULL cascade (from the existing schema)

**Checkpoint**: Debt payoff goal data model complete.

---

## Phase 5: User Story 3 — Create a Net Worth Milestone Goal (Priority: P2)

**Goal**: Confirm a net worth milestone goal can be stored without a linked account (no `linkedAccountId`, no `categoryName`), and that the schema permits this.

**Independent Test**: Confirm `linkedAccountId` and `categoryName` are both nullable in the Drizzle schema — a goal with only `userId`, `name`, `type`, `targetAmount`, and `status` is valid.

- [ ] T005 [P] [US3] Verify in `src/db/schema.ts` that `linkedAccountId` and `categoryName` have no `.notNull()` call — both must be nullable

**Checkpoint**: Net worth milestone goal data model complete.

---

## Phase 6: User Story 4 — Create a Spending Limit Goal (Priority: P2)

**Goal**: Confirm the `categoryName` column exists to store the spending category for a spending limit goal, enabling FA-GOAL-003 to filter transactions by that category within the current month.

**Independent Test**: Confirm the `Goal` TypeScript type includes `categoryName: string | null` and the migration adds `category_name varchar(100)` (nullable, no default).

- [ ] T006 [P] [US4] Verify in `src/db/schema.ts` that `categoryName` is typed as `varchar("category_name", { length: 100 })` with no `.notNull()`, and in the migration that the column is added as nullable varchar(100)

**Checkpoint**: Spending limit goal data model complete.

---

## Phase 7: User Story 5 — Update Goal Status (Priority: P2)

**Goal**: Confirm `updatedAt` is present and server-defaulted so status transitions (active → achieved, active → abandoned) are automatically timestamped.

**Independent Test**: Confirm `updatedAt` is NOT NULL with `DEFAULT now()` in the migration, and `updatedAt: Date` (non-null) in the `Goal` TypeScript type.

- [ ] T007 [US5] Verify in `src/db/migrations/0005_goals_schema_complete.sql` that `updated_at` is declared `timestamptz NOT NULL DEFAULT now()`, and in `src/db/schema.ts` that `.notNull()` follows `.defaultNow()`

**Checkpoint**: Goal status transition data model complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T008 [P] Run `npx tsc --noEmit` from the project root to confirm all TypeScript types are valid after the schema update in `src/db/schema.ts`
- [ ] T009 Run `npx drizzle-kit check` (or equivalent) to validate the migration file is syntactically correct and consistent with the Drizzle schema

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
- **US phases (3–7)**: ALL depend on Phase 2 completion (T001 + T002)
  - Verification tasks T003–T007 can all run in parallel once T001 + T002 are done
- **Polish (Phase 8)**: Depends on all phase 3–7 checks passing

### User Story Dependencies

- **US1 (P1)** and **US2 (P1)**: Can start in parallel after Phase 2
- **US3, US4, US5 (P2)**: Can also start in parallel after Phase 2
- No cross-story dependencies — all share the same two foundational tasks

### Parallel Opportunities

Once T001 and T002 are done, T003–T007 can all run in parallel (they verify different aspects of the same two files).

---

## Parallel Example: User Story Verification

```bash
# After T001 + T002 complete, verify all user stories together:
Task T003: Savings target — check Goal type includes currentAmount + updatedAt
Task T004: Debt payoff — check current_amount nullable in migration
Task T005: Net worth — check linkedAccountId + categoryName nullable in schema
Task T006: Spending limit — check categoryName varchar(100) in schema + migration
Task T007: Status update — check updatedAt NOT NULL DEFAULT now() in migration
```

---

## Implementation Strategy

### MVP (Foundational only)

1. Complete Phase 2: T001 + T002 (the entire implementation is here)
2. **STOP and VALIDATE**: Run `npx tsc --noEmit`; confirm all 5 user story checks pass
3. No further implementation required for this feature — data layer is complete

### Incremental Delivery

N/A — this is a single additive migration. Both tasks (T001 + T002) must ship together; there is no meaningful partial delivery.

---

## Notes

- Migration naming: rename to `0006_goals_schema_complete.sql` if FA-NW-004's `0005_auto_sync_flag.sql` merges to main first
- `Goal` and `NewGoal` types update automatically via `$inferSelect`/`$inferInsert` — no manual type changes needed
- `currentAmount` is null by design until FA-GOAL-003 runs — do not treat null as zero
- `categoryName` is intended for `spending_limit` goals but is nullable and unrestricted at the DB level
