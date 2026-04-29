# Tasks: Filter Uncategorised Transactions

**Input**: Design documents from `specs/004-filter-uncategorised-transactions/`
**Branch**: `004-filter-uncategorised-transactions`
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1)
- Exact file paths included in every task description

---

## Phase 1: Foundational — Clear Pre-existing ESLint Errors

**Purpose**: Move module-level utility functions out of the page component file so the pre-commit lint hook passes on any future commit touching `TransactionsPage.tsx`. This MUST be done before any user story work is committed.

**⚠️ CRITICAL**: The pre-commit hook (`lint-staged`) will fail on any commit that touches `src/pages/TransactionsPage.tsx` while `fmt`, `fmtMonth`, and `getCatColor` remain in that file (three `react-refresh/only-export-components` ESLint errors). This phase resolves that prerequisite.

- [ ] T001 Create `src/utils/transactionFormatters.ts`: move `fmt`, `fmtMonth`, and `getCatColor` verbatim from `src/pages/TransactionsPage.tsx` into this new file, adding `import type { PfaCategory } from "../types/pfa"` at the top, and exporting all three functions; then in `TransactionsPage.tsx` delete the three function bodies and add `import { fmt, fmtMonth, getCatColor } from "../utils/transactionFormatters"`. Run `npx tsc --noEmit` (must exit 0) and `npx eslint src/pages/TransactionsPage.tsx` (must show zero errors) to confirm.

**Checkpoint**: TypeScript compiles cleanly. ESLint reports zero errors on `TransactionsPage.tsx`. All existing tests still pass (`npx vitest run`).

---

## Phase 2: User Story 1 — Add Uncategorised Filter Option (Priority: P1) 🎯 MVP

**Goal**: The category filter dropdown gains an "Uncategorised" option that, when selected, shows only transactions with no category assigned (`category` is `null`, `undefined`, or `""`).

**Independent Test**: Open Transactions page with a mix of categorised and uncategorised transactions → select "Uncategorised" from the category dropdown → verify that only uncategorised transactions are shown and the row count decreases accordingly.

### Implementation for User Story 1

- [x] T002 [US1] In `src/pages/TransactionsPage.tsx`, add `<option value="__uncategorised__">Uncategorised</option>` as the second child of the category filter `<select>`, immediately after `<option value="all">All categories</option>` and before the `{categories.map(...)}` block
- [x] T003 [US1] In `src/pages/TransactionsPage.tsx`, replace the single-line category filter condition (`if (filterCat !== "all" && t.category !== filterCat) return false;`) with the following two-branch block: `if (filterCat === "__uncategorised__") { if (t.category) return false; } else if (filterCat !== "all" && t.category !== filterCat) { return false; }` — the `if (t.category)` check treats `null`, `undefined`, and `""` as uncategorised (all falsy)

**Checkpoint**: Selecting "Uncategorised" in the dropdown shows only uncategorised transactions. Categorised transactions are hidden. Transfer transactions are unaffected (governed by the existing Show transfers toggle). Switching back to "All categories" restores the full list. Row count updates correctly.

---

## Phase 3: Tests

**Purpose**: Unit tests for the uncategorised filter logic and UI.

**File**: `src/pages/TransactionsPage.test.tsx` (extend or create)

- [x] T004 [P] [US1] In `src/pages/TransactionsPage.test.tsx`, write test: when the category filter select is changed to `"__uncategorised__"`, only transactions with `category` equal to `null`, `undefined`, or `""` appear in the rendered list
- [x] T005 [P] [US1] In `src/pages/TransactionsPage.test.tsx`, write test: when the category filter is `"__uncategorised__"`, transactions with a non-empty `category` string (e.g., `"Groceries"`) are not rendered
- [x] T006 [P] [US1] In `src/pages/TransactionsPage.test.tsx`, write test: transfer transactions (`isTransfer: true`) are absent from the rendered list when the category filter is `"__uncategorised__"` — even with `showTransfers` enabled (the transfer gate runs before the category gate)
- [x] T007 [P] [US1] In `src/pages/TransactionsPage.test.tsx`, write test: when both `"__uncategorised__"` and a specific month are selected, only uncategorised transactions whose `month` matches the selected month appear (AND composition)
- [x] T008 [P] [US1] In `src/pages/TransactionsPage.test.tsx`, write test: when `"__uncategorised__"` is selected and a search term is entered, only uncategorised transactions whose `payee` or `memo` matches the search term appear
- [x] T009 [P] [US1] In `src/pages/TransactionsPage.test.tsx`, write test: after selecting `"__uncategorised__"` and then switching back to `"all"`, all non-transfer transactions appear again (full list restored)

**Checkpoint**: All 6 test cases pass (`npx vitest run`). No existing tests regress.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Foundational — T001)
        │
        ▼
Phase 2 (US1 — T002, T003)
        │
        ▼
Phase 3 (Tests — T004–T009)
```

### Within Each Phase

- T002 must complete before T003 (dropdown option must exist before filter logic references its value)
- T004–T009 can all be written in parallel (independent test functions in the same file)

### Parallel Opportunities

- T004–T009 are all marked [P] — write all test cases in one pass or launch them together

---

## Implementation Strategy

### MVP (Single story — Phases 1–2)

1. Phase 1: Move formatters to utils, clear ESLint errors
2. Phase 2: Add dropdown option + update filter logic
3. Phase 3: Write and pass all tests
4. **VALIDATE**: End-to-end — select "Uncategorised" → only uncategorised rows visible → row count correct → switch to "All categories" → full list restored

### Notes

- The `"__uncategorised__"` sentinel must never appear in the `categories` array (user-defined category names from settings) — no collision possible.
- The `fmt`, `fmtMonth`, `getCatColor` move (T001) must be committed in the same commit as or before any change to `TransactionsPage.tsx`, otherwise the pre-commit hook will block the commit.
- No changes to `App.tsx`, `DashboardPage.tsx`, `Sidebar.tsx`, any service, hook, or type file.
- localStorage schema is unchanged — no migration needed.
