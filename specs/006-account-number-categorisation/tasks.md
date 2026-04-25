# Tasks: Account Number-Based Categorisation

**Input**: Design documents from `specs/006-account-number-categorisation/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new project structure required — this feature modifies a single existing function.
No setup tasks needed beyond confirming the branch is current.

- [ ] T001 Confirm working branch is `006-account-number-categorisation` (run `git branch --show-current`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Expose `parseAccountName` so it can be unit-tested independently of the React app.

**⚠️ CRITICAL**: Must be complete before any user story work can begin.

- [ ] T002 Extract `parseAccountName` from `src/App.tsx` into `src/utils/accountParser.ts` as a named export, keeping the original call in `App.tsx` as an import (no behaviour change yet — extraction only)

**Checkpoint**: `parseAccountName` is importable from `src/utils/accountParser.ts` and all existing behaviour is preserved.

---

## Phase 3: User Story 1 — Distinct accounts with the same name are kept separate (Priority: P1) 🎯 MVP

**Goal**: Two CSVs with the same account name but different account numbers produce two distinct account keys.

**Independent Test**: Upload two CSV files — one for `0549256-53 (Savings On Call)` and one for `0549256-50 (Savings On Call)` — and verify that two separate accounts appear, each with only its own transactions.

### Tests for User Story 1

- [ ] T003 [P] [US1] Add unit test: two payloads with same name different numbers → two distinct `short` values, in `src/utils/accountParser.test.ts`
- [ ] T004 [P] [US1] Add unit test: CSV with number + name → `short` equals the account number, in `src/utils/accountParser.test.ts`
- [ ] T005 [P] [US1] Add unit test: CSV with name only (no number) → `short` equals the name, in `src/utils/accountParser.test.ts`

> Verify all three tests **FAIL** before proceeding to implementation.

### Implementation for User Story 1

- [ ] T006 [US1] In `src/utils/accountParser.ts`, change `const short = nick ?? num ?? ...` to `const short = num ?? nick ?? ...` so the account number is the primary key (data-model.md: Changed Logic section)

**Checkpoint**: T003–T005 now pass. Two same-named accounts imported from different CSVs are stored separately. User Story 1 is independently functional.

---

## Phase 4: User Story 2 — Re-importing the same account appends to the correct account (Priority: P2)

**Goal**: Re-importing a CSV for an existing account number appends to the correct account, not a new or wrong one.

**Independent Test**: Import a CSV for `0549256-53`, then import a second-month CSV for `0549256-53`; confirm transactions are appended to the same account and no duplicate account entry is created.

### Tests for User Story 2

- [ ] T007 [US2] Add unit test: same account number imported twice → `short` is identical both times → no new account created, in `src/utils/accountParser.test.ts`

> Verify test **FAILS** before implementation (will pass automatically after T006).

### Implementation for User Story 2

- [ ] T008 [US2] Verify that T006 satisfies US2 with no further code changes — `short` being stable across imports is sufficient; add a comment in `src/utils/accountParser.ts` documenting this invariant if the logic is non-obvious

**Checkpoint**: T007 passes. Re-importing the same account number always resolves to the same key.

---

## Phase 5: User Story 3 — Account number shown as a distinguishing label (Priority: P3)

**Goal**: When an account number is present, the display label shown to the user is `"Name (number)"`, making same-named accounts visually distinguishable.

**Independent Test**: After importing `0549256-53 (Savings On Call)` and `0549256-50 (Savings On Call)`, the account selector shows "Savings On Call (0549256-53)" and "Savings On Call (0549256-50)" as two distinct entries.

### Tests for User Story 3

- [ ] T009 [P] [US3] Add unit test: CSV with number + name → `display` equals `"Name (number)"` format, in `src/utils/accountParser.test.ts`
- [ ] T010 [P] [US3] Add unit test: CSV with name only → `display` equals the name alone, in `src/utils/accountParser.test.ts`
- [ ] T011 [P] [US3] Add unit test: CSV with no metadata → `display` equals `"Main Account"`, in `src/utils/accountParser.test.ts`

> Verify all three tests **FAIL** before implementation.

### Implementation for User Story 3

- [ ] T012 [US3] In `src/utils/accountParser.ts`, change `baseDisplay` from `` `${nick} ···${num.slice(-6)}` `` to `` `${nick} (${num})` `` (data-model.md: Changed Logic section)

**Checkpoint**: T009–T011 pass. Accounts with shared names display the full account number. All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T013 [P] Run the full Vitest suite (`npm test`) and confirm no regressions in `src/App.tsx` or related files
- [ ] T014 [P] Run TypeScript type-check (`npm run build` or `tsc --noEmit`) and confirm no type errors introduced by the extraction in T002
- [ ] T015 Update `specs/006-account-number-categorisation/checklists/requirements.md` — mark all items complete and note implementation is done

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user story phases**
- **Phase 3 (US1)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 3 (US2 is satisfied by the same fix as US1)
- **Phase 5 (US3)**: Depends on Phase 2 — can start in parallel with Phase 3 (different change in same file, coordinate on `src/utils/accountParser.ts`)
- **Phase 6 (Polish)**: Depends on Phases 3, 4, and 5

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2 — no dependency on other stories
- **US2 (P2)**: Effectively satisfied by US1 fix; T007 test added independently
- **US3 (P3)**: Starts after Phase 2 — independent of US1/US2 (different line in same file)

### Parallel Opportunities

- T003, T004, T005 (US1 tests) can be written in parallel before T006
- T009, T010, T011 (US3 tests) can be written in parallel before T012
- T013 and T014 (Polish checks) can run in parallel

---

## Parallel Example: User Story 1

```
# Write all US1 tests together:
Task T003: two-accounts-same-name test in src/utils/accountParser.test.ts
Task T004: number-takes-priority test in src/utils/accountParser.test.ts
Task T005: name-only fallback test in src/utils/accountParser.test.ts

# Then implement:
Task T006: flip short priority in src/utils/accountParser.ts
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1: Confirm branch
2. Complete Phase 2: Extract `parseAccountName` to `src/utils/accountParser.ts`
3. Complete Phase 3: Write failing tests → implement fix → confirm tests pass
4. **STOP and VALIDATE**: Import two same-named, different-numbered CSVs → confirm two separate accounts
5. Ship as MVP — the core data-integrity bug is fixed

### Incremental Delivery

1. Phase 2 → extract function
2. Phase 3 → account number deduplication works (US1 + US2 satisfied)
3. Phase 5 → display labels updated (US3 satisfied)
4. Phase 6 → polish and validation

---

## Notes

- All three user stories are addressed by changes to `parseAccountName` alone — a two-line logic change and a two-line display change
- Extracting the function (T002) is the only structural change; it enables unit testing without mounting a React component
- No localStorage schema changes — existing data is unaffected
- [P] tasks within a phase may be executed in parallel
