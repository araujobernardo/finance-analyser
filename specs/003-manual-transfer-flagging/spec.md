# Feature Specification: Manual Transfer Flagging

**Feature Branch**: `003-manual-transfer-flagging`
**Created**: 2026-04-24
**Status**: Ready

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Flag a Transfer Pair (Priority: P1)

A user notices that two transactions on the Transactions page should be treated as a transfer between their own accounts (e.g., a credit-card payment). They click one transaction row to enter "flag as transfer" mode, see a list of candidate transactions from the same day with the same absolute amount, select the matching leg, and both transactions are immediately marked as transfers — excluded from totals and shown with a "Transfer" tag.

**Why this priority**: This is the core action. Without it, no other story delivers value.

**Independent Test**: Open Transactions page with two same-day same-amount transactions from different categories → click one row → candidate picker appears → select the matching leg → both show "Transfer" tag and disappear from regular totals.

**Acceptance Scenarios**:

1. **Given** the Transactions page is shown, **When** a user clicks a non-transfer transaction row, **Then** the app enters "flag as transfer" mode with that row highlighted as the initiating leg.
2. **Given** "flag as transfer" mode is active, **Then** all other transactions on the same day with the same absolute amount are displayed as selectable candidates; transactions that do not meet both criteria are not shown as candidates.
3. **Given** a candidate is selected, **When** the user confirms the pairing, **Then** both transactions receive `isTransfer: true` and `category: "Savings & Transfers"`, and their previous categories are stored in `preFlagCategory` for later restoration.
4. **Given** both transactions are now flagged as transfers, **Then** they behave identically to auto-detected transfers: excluded from dashboard totals, shown with a "Transfer" tag, hidden by default in the Transactions list, visible when "Show transfers" is toggled.
5. **Given** the candidate picker is open, **When** the user presses Escape or clicks outside, **Then** flagging mode is cancelled and no transactions are modified.

---

### User Story 2 — Unflag a Transfer Pair (Priority: P1)

A user realises a previously flagged transfer (manually or auto-detected) was incorrectly marked. They show transfers in the Transactions view, click on a transfer row to open the "un-flag" action, confirm, and both transactions in the pair revert to their prior state.

**Why this priority**: Reversibility is required for correctness; a flag operation without undo creates permanent data corruption.

**Independent Test**: Flag a pair → enable "Show transfers" → click one of the flagged rows → confirm un-flag → both transactions show original categories and are no longer marked as transfers.

**Acceptance Scenarios**:

1. **Given** a transfer row is visible (Show transfers is checked), **When** a user clicks a transfer transaction row, **Then** the app presents an "un-flag transfer" confirmation prompt.
2. **Given** the user confirms un-flagging, **When** the pair was manually flagged, **Then** both transactions have `isTransfer` set to `false` and `category` restored to the value stored in `preFlagCategory`; `preFlagCategory` is cleared.
3. **Given** the user confirms un-flagging, **When** the pair was auto-detected (no `preFlagCategory`), **Then** both transactions have `isTransfer` set to `false` and `category` set to `null` (uncategorised).
4. **Given** un-flagging completes, **Then** both restored transactions appear normally in the transactions list (no longer filtered by the Show-transfers gate).

---

### Edge Cases

- What happens if no candidates exist for the selected transaction? The system shows an empty candidate list with a message such as "No matching transactions found for this day and amount."
- What happens if the user clicks a transaction that is already a transfer? The system opens the un-flag flow, not the flag flow.
- What happens if one of the pair has been deleted or is no longer in the dataset? The un-flag operation applies only to the transactions that remain; no error is thrown.
- What if there are more than two candidates (e.g., three transactions with the same date and amount)? All qualifying transactions are shown as candidates; the user selects exactly one. Only the initiating transaction and the chosen candidate are flagged.
- What happens if the user tries to flag a transaction with itself? The initiating transaction is excluded from the candidate list.

---

## Requirements _(mandatory)_

### Functional Requirements

**Flagging**

- **FR-001**: Clicking a non-transfer transaction row on the Transactions page MUST initiate "flag as transfer" mode for that row.
- **FR-002**: In flagging mode, the system MUST display ONLY transactions that share the same calendar date AND have the same absolute amount as the initiating transaction (excluding the initiating transaction itself).
- **FR-003**: Validation for a valid pair MUST require: same calendar date AND same absolute amount. No other validation is required.
- **FR-004**: On confirming a pair, BOTH transactions MUST have `isTransfer` set to `true` and `category` set to `"Savings & Transfers"`.
- **FR-005**: Before setting `isTransfer: true`, the system MUST store each transaction's current `category` value in a new `preFlagCategory` field so it can be restored on un-flag.
- **FR-006**: Flagged transfers MUST behave identically to auto-detected transfers: excluded from dashboard totals and spend calculations, shown with a read-only "Transfer" tag, hidden by default and shown at 65% opacity when "Show transfers" is toggled.
- **FR-007**: Manually-flagged transfers MUST be visually identical to auto-detected transfers — no distinction is shown in the UI.

**Un-flagging**

- **FR-008**: Clicking a transfer row (when transfers are visible) MUST present the user with an un-flag option.
- **FR-009**: On confirming un-flag, BOTH transactions in the pair MUST have `isTransfer` set to `false`.
- **FR-010**: On un-flag, each transaction's `category` MUST be restored from `preFlagCategory` if that field is non-null; otherwise `category` MUST be set to `null` (uncategorised).
- **FR-011**: After un-flagging, `preFlagCategory` MUST be cleared (set to `undefined` or removed).
- **FR-012**: Un-flagging MUST work for both manually-flagged and auto-detected transfer pairs.

**Data**

- **FR-013**: The `PfaTxn` interface MUST be extended with an optional `preFlagCategory?: string | null` field.
- **FR-014**: Changes to `isTransfer`, `category`, and `preFlagCategory` MUST be propagated via the existing `onBulkCategoryChange` callback and persisted to localStorage under the `pfa-v3-transactions` key.

### Key Entities

- **PfaTxn** (extended): adds `preFlagCategory?: string | null` — stores the category value at the moment of flagging, enabling category restoration on un-flag.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can complete the flag-a-transfer workflow (click initiating row → select candidate → confirm) in under 5 seconds for a list of 200 transactions.
- **SC-002**: After flagging, both transactions disappear from the default transaction view (Show transfers unchecked) immediately — no page reload required.
- **SC-003**: After un-flagging, both transactions appear in the default transaction view with their original categories restored immediately.
- **SC-004**: The candidate picker shows zero false positives — only transactions matching both date and amount criteria are displayed.
- **SC-005**: All transfer-flagging state changes survive a page reload (data is persisted to local storage).

---

## Assumptions

- The app is a single-page TypeScript + React application with no backend; all state lives in localStorage.
- A "transfer pair" is always exactly two transactions; the feature does not support grouping more than two.
- The `detectTransfers` auto-detection logic in `App.tsx` is not modified by this feature.
- The "same day" constraint uses the `date` field (ISO `YYYY-MM-DD` string) on `PfaTxn`.
- The "same absolute amount" constraint uses `Math.abs(amount)` comparison.
- Finding the partner transaction on un-flag: since both transactions share the same `date` and `Math.abs(amount)`, the system finds the partner by looking for another `isTransfer` transaction with the same date and absolute amount (excluding itself). If multiple candidates match, the first is used — this is an acceptable trade-off given the rarity of the edge case.
- No migration is needed for existing `PfaTxn` records — the `preFlagCategory` field is optional and defaults to `undefined` (absent from existing JSON).
