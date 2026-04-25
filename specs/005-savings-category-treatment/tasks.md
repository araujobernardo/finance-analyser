# Tasks: Savings Category — Rename and Visual Treatment

**Input**: Design documents from `specs/005-savings-category-treatment/`
**Branch**: `005-savings-category-treatment`
**Prerequisites**: plan.md ✅, spec.md ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1, US2)
- Exact file paths included in every task description

---

## Phase 1: Foundational — CSS Design Token

**Purpose**: Introduce the `--colour-savings` token that all subsequent phases reference. No user story work can begin until this token exists.

**⚠️ CRITICAL**: All phases depend on this token being defined.

- [ ] T001 Add `--colour-savings: #10b981;` inside the `:root` block in `src/index.css`; run `npx tsc --noEmit` to confirm zero TypeScript errors

**Checkpoint**: Token defined. All subsequent tasks can reference `var(--colour-savings)`.

---

## Phase 2: User Story 2 — Category Renamed from "Savings & Transfers" to "Savings" (Priority: P1)

> **Note**: US2 (rename) is implemented before US1 (green treatment) because the rename is the foundational change that all visual tasks build on.

**Goal**: Every occurrence of the string `"Savings & Transfers"` in application logic is replaced with `"Savings"`, and existing stored data is normalised on load.

**Independent Test**: Open the app with existing localStorage data containing `category: "Savings & Transfers"` → the Transactions page must display "Savings" for those rows with no visible "Savings & Transfers" anywhere in the UI.

### Implementation for User Story 2

- [ ] T002 [US2] In `src/App.tsx`, update `DEFAULT_CATEGORIES`: change the entry `{ name: "Savings & Transfers", color: "#475569" }` to `{ name: "Savings", color: "#10b981" }`
- [ ] T003 [US2] In `src/App.tsx`, update `detectTransfers`: change the string `"Savings & Transfers"` to `"Savings"` on the line that sets `category` for detected transfer pairs
- [ ] T004 [US2] In `src/App.tsx`, add load-time normalisation: in the `useState` initialiser for `txns` (where transactions are read from localStorage), after parsing, apply `.map(t => t.category === "Savings & Transfers" ? { ...t, category: "Savings" } : t)` so legacy records display correctly
- [ ] T005 [P] [US2] In `src/utils/transferFlagging.ts` (introduced by feature #003 — update when that branch is merged or if the file exists), change the string `"Savings & Transfers"` to `"Savings"` in the `handleFlag` implementation
- [ ] T006 [P] [US2] In `src/pages/TransactionsPage.test.tsx` (introduced by feature #003), update all occurrences of `"Savings & Transfers"` to `"Savings"` in test fixtures and assertions

**Checkpoint**: `npx vitest run` passes. No occurrence of `"Savings & Transfers"` remains in any source file.

---

## Phase 3: User Story 1 — Savings Transactions Appear Green (Priority: P1)

**Goal**: Every transaction with category "Savings" is rendered in green — category badge, row accent, and dashboard category breakdown — using `var(--colour-savings)`.

**Independent Test**: Open Transactions page with at least one "Savings" transaction → category badge is green, row accent is green, not the expense colour (red/orange). Open Dashboard → category breakdown entry for "Savings" shows in green.

### Implementation for User Story 1

- [ ] T007 [US1] In `src/components/SpendByCategory.tsx`, add `"Savings": "#10b981"` to the `CATEGORY_COLOURS` record and remove any existing `"Savings & Transfers"` key
- [ ] T008 [P] [US1] In `src/pages/TransactionsPage.css` (or the relevant transaction row/badge CSS), add a rule that applies `color: var(--colour-savings)` and `border-color: var(--colour-savings)` to the category badge when the category is "Savings"; use the `.category-badge--savings` modifier class or an equivalent scoped selector
- [ ] T009 [P] [US1] In `src/pages/TransactionsPage.tsx` (or wherever the transaction row/badge class is applied), conditionally add the `category-badge--savings` CSS modifier class when `transaction.category === "Savings"`

**Checkpoint**: Savings transactions are visually green in both the transaction list and the dashboard category breakdown. No hardcoded hex values in TSX files.

---

## Phase 4: Tests

**Purpose**: Unit tests covering the rename, normalisation, and green colour treatment.

- [ ] T010 [P] Write test: `detectTransfers` sets `category: "Savings"` (not `"Savings & Transfers"`) on detected pairs — add to `src/App.test.tsx` (create if it does not exist)
- [ ] T011 [P] Write test: load-time normalisation maps a stored transaction with `category: "Savings & Transfers"` to `category: "Savings"` in memory — add to `src/App.test.tsx`
- [ ] T012 [P] Write test: `SpendByCategory` renders the "Savings" entry in green (`#10b981`) — add to `src/components/SpendByCategory.test.tsx`
- [ ] T013 [P] Write test: no occurrence of the literal string `"Savings & Transfers"` appears in any rendered output (text content assertion on the full transaction list render) — add to `src/pages/TransactionsPage.test.tsx`

**Checkpoint**: All 4 test cases pass (`npx vitest run`). No existing tests regress.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (CSS Token — T001)
        │
        ▼
Phase 2 (Rename — T002–T006)
        │
        ▼
Phase 3 (Green Treatment — T007–T009)
        │
        ▼
Phase 4 (Tests — T010–T013)
```

### Within Each Phase

- T002 must complete before T003 and T004 (DEFAULT_CATEGORIES updated before downstream logic)
- T003 and T004 can run in parallel (different functions in same file — careful editing)
- T005 and T006 can run in parallel with T002–T004 (different files)
- T007 must complete before T008 and T009 (colour map before badge/row classes)
- T008 and T009 can run in parallel (CSS vs TSX — different files)
- T010–T013 can all run in parallel (independent test functions)

### Parallel Opportunities

- T005 (transferFlagging.ts) and T006 (TransactionsPage.test.tsx) can run in parallel with T002–T004
- T008 (CSS) and T009 (TSX) can run in parallel
- T010–T013 (all tests) can run in parallel

---

## Implementation Strategy

### MVP (US2 first — rename ships before visual)

1. Phase 1: Add CSS token (T001)
2. Phase 2: Rename "Savings & Transfers" → "Savings" everywhere (T002–T006)
3. **VALIDATE**: Zero occurrences of old string in UI
4. Phase 3: Apply green treatment (T007–T009)
5. Phase 4: Write and pass all tests (T010–T013)
6. **VALIDATE**: End-to-end — open app, verify old data displays as "Savings" in green

### Notes

- T005 and T006 depend on feature #003 files (`src/utils/transferFlagging.ts`, `src/pages/TransactionsPage.test.tsx`). If #003 is not merged, those tasks are deferred until merge or handled via merge conflict resolution — in both cases, the developer adopts `"Savings"` as the canonical string.
- The `DEFAULT_CATEGORIES` array in `App.tsx` uses hex colour strings (not CSS tokens) because they are passed as JavaScript data to chart components. The hex `#10b981` matches `--colour-savings` exactly.
- No new localStorage keys are introduced. The normalisation in T004 is in-memory only; writes still use the updated `"Savings"` string naturally.
