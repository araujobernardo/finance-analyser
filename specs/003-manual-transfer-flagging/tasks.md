# Tasks: Manual Transfer Flagging

**Input**: Design documents from `specs/003-manual-transfer-flagging/`
**Branch**: `003-manual-transfer-flagging`
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1, US2)
- Exact file paths included in every task description

---

## Phase 1: Foundational — Data Model Extension

**Purpose**: Extend the `PfaTxn` type with `preFlagCategory`. All subsequent phases depend on this.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [ ] T001 Add `preFlagCategory?: string | null` to the `PfaTxn` interface in `src/types/pfa.ts`; run `npx tsc --noEmit` to confirm zero TypeScript errors

**Checkpoint**: TypeScript compiles cleanly. All existing tests still pass.

---

## Phase 2: User Story 1 — Flag a Transfer Pair (Priority: P1)

**Goal**: User can click a non-transfer transaction row, see a candidate picker filtered to same-day same-amount transactions, select one, and have both flagged as a transfer pair.

**Independent Test**: Open Transactions page with at least two same-day same-amount non-transfer transactions → click one → candidate picker appears with the other as an option → select it → both show "Transfer" tag and have `isTransfer: true`.

### Implementation for User Story 1

- [ ] T002 [US1] In `src/pages/TransactionsPage.tsx`, add state `flagMode: { initiatingId: string } | null` (default null); derive `candidates` when `flagMode` is non-null: filter `txns` to same `date`, same `Math.abs(amount)`, `!t.isTransfer`, and `t.id !== flagMode.initiatingId`
- [ ] T003 [US1] In `src/pages/TransactionsPage.tsx`, implement `handleFlag(initiatingId: string, candidateId: string)`: find both transactions; set `preFlagCategory = current category`, `category = "Savings & Transfers"`, `isTransfer = true` for each; call `onBulkCategoryChange(updatedTxns)`; clear `flagMode`
- [ ] T004 [US1] In `src/pages/TransactionsPage.tsx`, wire row-click routing: non-transfer row click when `flagMode` is null → set `flagMode = { initiatingId: t.id }`; non-transfer row click when `flagMode` is active and `t.id` is in candidates → call `handleFlag(flagMode.initiatingId, t.id)`; add `onKeyDown` / `useEffect` for Escape key to clear `flagMode`
- [ ] T005 [US1] In `src/pages/TransactionsPage.tsx`, render the flagging-mode UI: banner message at top of table showing "Select the matching transaction to complete the transfer pair — or press Escape to cancel" (or "No matching transactions found for this day and amount." when candidates is empty); highlight initiating row with accent left border + background tint (CSS class `txn-row-initiating`); highlight candidate rows with dashed accent border (CSS class `txn-row-candidate`); dim non-candidate non-initiating rows at 50% opacity (CSS class `txn-row-dimmed`)
- [ ] T006 [P] [US1] In `src/pages/TransactionsPage.css`, add styles for `.txn-row-initiating` (accent left border `3px solid var(--accent)`, background `color-mix(in srgb, var(--accent) 8%, transparent)`), `.txn-row-candidate` (border `1px dashed var(--accent)`, cursor pointer, hover background tint), `.txn-row-dimmed` (opacity 0.5), `.txn-flag-banner` (top banner bar using `var(--surface)` background, `var(--accent)` or `var(--muted)` text, padding, border-bottom); all colours via `var(--*)` tokens only

**Checkpoint**: Clicking a non-transfer row highlights it as initiating. Candidate rows are highlighted. Non-candidates are dimmed. Selecting a candidate flags both. Both rows disappear from default view (Show transfers unchecked).

---

## Phase 3: User Story 2 — Unflag a Transfer Pair (Priority: P1)

**Goal**: User can click a visible transfer row, confirm un-flag, and both transactions revert to their prior categories (or null for auto-detected).

**Independent Test**: Flag a pair (or have an auto-detected pair) → enable Show transfers → click one transfer row → confirmation appears → confirm → both transactions revert to previous categories and are no longer marked as transfers.

### Implementation for User Story 2

- [ ] T007 [US2] In `src/pages/TransactionsPage.tsx`, add state `unflagTarget: { txnId: string } | null` (default null); wire transfer row click to set `unflagTarget = { txnId: t.id }` instead of entering flag mode
- [ ] T008 [US2] In `src/pages/TransactionsPage.tsx`, implement `handleUnflag(txnId: string)`: find the transaction; find its partner (another `isTransfer` txn with same `date` and `Math.abs(amount)`, excluding itself — use first match); for each found transaction set `isTransfer = false`, `category = preFlagCategory ?? null`, `preFlagCategory = undefined`; call `onBulkCategoryChange(updatedTxns)`; clear `unflagTarget`
- [ ] T009 [US2] In `src/pages/TransactionsPage.tsx`, render the un-flag confirmation UI: when `unflagTarget` is set, show a confirmation panel (positioned at top of table as an overlay banner or inline below the clicked row) with text "Un-flag this transfer pair? Both transactions will revert to their previous categories." and two buttons: "Confirm" (calls `handleUnflag(unflagTarget.txnId)`) and "Cancel" (clears `unflagTarget`)
- [ ] T010 [P] [US2] In `src/pages/TransactionsPage.css`, add styles for `.txn-unflag-panel` (surface background, border, padding, flex row with text and buttons; confirm button uses `var(--accent)` bg; cancel button uses `var(--border)` bg; all colours via `var(--*)` tokens only)

**Checkpoint**: Clicking a transfer row (with Show transfers checked) shows confirmation. Confirm → both transactions restored. Cancel → nothing changes.

---

## Phase 4: Tests

**Purpose**: Unit tests covering all flag/unflag logic paths.

**File**: `src/pages/TransactionsPage.test.tsx` (new file)

- [ ] T011 [P] Write test: `handleFlag` sets `isTransfer: true` and `category: "Savings & Transfers"` on both transactions in `src/pages/TransactionsPage.test.tsx`
- [ ] T012 [P] Write test: `handleFlag` stores original categories in `preFlagCategory` for both transactions in `src/pages/TransactionsPage.test.tsx`
- [ ] T013 [P] Write test: `handleUnflag` sets `isTransfer: false` and restores `category` from `preFlagCategory` for both transactions in `src/pages/TransactionsPage.test.tsx`
- [ ] T014 [P] Write test: `handleUnflag` on auto-detected transfer (no `preFlagCategory`) sets `category: null` on both transactions in `src/pages/TransactionsPage.test.tsx`
- [ ] T015 [P] Write test: candidate filtering returns only same-day same-amount non-transfer transactions excluding the initiating transaction in `src/pages/TransactionsPage.test.tsx`
- [ ] T016 [P] Write test: candidate filtering returns empty array when no transactions match the criteria in `src/pages/TransactionsPage.test.tsx`

**Checkpoint**: All 6 test cases pass (`npx vitest run`). No existing tests regress.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Data Model — T001)
        │
        ▼
Phase 2 (US1 — T002–T006)   Phase 3 (US2 — T007–T010)
        │                              │
        └──────────────┬───────────────┘
                       ▼
              Phase 4 (Tests — T011–T016)
```

### Within Each Phase

- T002 must complete before T003 (flag state before flag handler)
- T003 must complete before T004 (handler before routing)
- T004 must complete before T005 (routing before UI render)
- T006 can run in parallel with T002–T005 (different file — CSS only)
- T007 must complete before T008 (unflag state before unflag handler)
- T008 must complete before T009 (handler before UI render)
- T010 can run in parallel with T007–T009 (different file — CSS only)
- T011–T016 can all run in parallel (same file, independent test cases)

### Parallel Opportunities

- T006 (CSS) can run in parallel with T002–T005 (different file)
- T010 (CSS) can run in parallel with T007–T009 (different file)
- T011–T016 can all be written in parallel (different test functions in same file)
- Phase 2 and Phase 3 can be implemented together (both modify `TransactionsPage.tsx`; careful merging needed)

---

## Implementation Strategy

### MVP (US1 + US2 together — Phases 1–3)

1. Phase 1: Extend `PfaTxn` type
2. Phase 2: Implement flag flow (US1)
3. Phase 3: Implement un-flag flow (US2)
4. Phase 4: Write and pass all tests
5. **VALIDATE**: End-to-end flag → show transfer → un-flag → verify restored categories

### Notes

- Tests ARE required per spec: "Write tests for the flag/unflag logic"
- `onBulkCategoryChange` in `App.tsx` already handles persisting `PfaTxn[]` to localStorage — do not duplicate this logic
- `isTransfer` flag (not category name) is the sole driver for transfer exclusion in dashboard and transaction list — setting `isTransfer: true` is sufficient to trigger all transfer behaviours
- localStorage key: `pfa-v3-transactions` (unchanged)
- No changes to `App.tsx`, `DashboardPage.tsx`, `Sidebar.tsx`, or any service/hook file
