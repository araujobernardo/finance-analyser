# Tasks: FA-NW-001 — Asset and Liability Data Model

**Input**: Design documents from `specs/017-asset-liability-model/`  
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ quickstart.md ✅

**Tests**: No new test tasks — this is a schema-only migration. Existing test suite (607 tests) is the regression gate.

**Organization**: Tasks follow the user story priorities from spec.md. US1 (store asset) and US2 (store liability) are P1; US3 (account linking) and US4 (update value) are P2 — all are satisfied by schema changes to `src/db/schema.ts`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Foundational — Schema Updates

**Purpose**: All four user stories depend on changes to `src/db/schema.ts`. These must complete before migration can be generated.

**⚠️ Note on parallelism**: T001 and T002 modify the same file (`src/db/schema.ts`) — they must be done sequentially.

- [ ] T001 [US1] Add `updatedAt` column to the `assets` table definition in `src/db/schema.ts`: `updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()`
- [ ] T002 [US2] [US3] Add `linkedAccountId` FK and `updatedAt` column to the `liabilities` table definition in `src/db/schema.ts`: `linkedAccountId: uuid("linked_account_id").references(() => accounts.id, { onDelete: "set null" })` and `updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()`

**Checkpoint**: `src/db/schema.ts` now reflects the full target schema from `data-model.md`. TypeScript compiler will infer updated `Asset`, `Liability`, `NewAsset`, `NewLiability` types automatically — no manual type changes needed.

---

## Phase 2: Migration — Generate and Apply

**Purpose**: Materialise the schema changes into a versioned SQL migration and apply it to the live database.

- [ ] T003 Run `npm run db:generate` from the project root — Drizzle compares current schema.ts against the snapshot and generates `src/db/migrations/0003_*.sql` with three `ALTER TABLE` statements (one for assets, two for liabilities)
- [ ] T004 Run `npm run db:migrate` from the project root — applies `0003_*.sql` to the Supabase database; existing rows receive `updated_at = now()` as default; `linked_account_id` on existing liability rows is null

**Checkpoint**: Migration applied. New columns exist in the live database. Existing data is intact.

---

## Phase 3: Polish & Verification

**Purpose**: Confirm the migration is correct, types are sound, and existing functionality is unaffected.

- [ ] T005 Run `npm run typecheck` — must exit 0; confirm `Asset` and `Liability` inferred types now include `updatedAt`, and `Liability` / `NewLiability` include `linkedAccountId`
- [ ] T006 Run `npm run test` — all 607 existing tests must pass; 0 failures
- [ ] T007 Manual verification per `specs/017-asset-liability-model/quickstart.md` Steps 1–4: confirm columns exist in both tables, run the app, sign in, and confirm existing accounts and transactions load without error

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Schema)**: No dependencies — start immediately
- **Phase 2 (Migration)**: Depends on Phase 1 complete (T001 + T002 both merged)
- **Phase 3 (Verification)**: Depends on Phase 2 complete (T003 + T004 both done)

### User Story Coverage

| User Story                 | Tasks       | Status via schema                                                 |
| -------------------------- | ----------- | ----------------------------------------------------------------- |
| US1 (P1) — Store asset     | T001        | `updatedAt` added to assets                                       |
| US2 (P1) — Store liability | T002        | `updatedAt` added to liabilities                                  |
| US3 (P2) — Link to account | T002        | `linkedAccountId` FK added to liabilities (assets already had it) |
| US4 (P2) — Update value    | T001 + T002 | `updatedAt` on both tables enables mutation tracking              |

### Parallel Opportunities

T001 and T002 are in the same file — must be sequential.  
T005, T006, T007 can run in parallel after T004.

```bash
# After T004, run all verification tasks together:
npm run typecheck   # T005
npm run test        # T006
# + manual quickstart check (T007)
```

---

## Implementation Strategy

### MVP (Phase 1 + 2 only)

1. Complete T001 + T002 (schema changes)
2. Complete T003 + T004 (generate + apply migration)
3. **STOP and VALIDATE**: columns exist in database, existing data intact

### Full delivery

1. MVP above
2. T005 + T006 + T007 (verification)
3. Open PR

---

## Notes

- No new TypeScript type exports required — `Asset`, `NewAsset`, `Liability`, `NewLiability` already exist and Drizzle re-infers them automatically
- The generated migration file name (`0003_*.sql`) will have a random suffix assigned by Drizzle — this is expected
- `updatedAt` is NOT auto-updated by a database trigger — future API endpoints that mutate asset/liability values MUST explicitly set `updatedAt: new Date()` in update payloads
- Rollback procedure is documented in `specs/017-asset-liability-model/quickstart.md`
