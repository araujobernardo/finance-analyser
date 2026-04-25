# Feature Specification: Filter Uncategorised Transactions

**Feature Branch**: `004-filter-uncategorised-transactions`
**Created**: 2026-04-24
**Status**: Draft

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Filter to Uncategorised Transactions (Priority: P1)

A user wants to quickly find all transactions that haven't been assigned a category yet — perhaps to do a categorisation sweep. They open the Transactions page, select "Uncategorised" from the category filter dropdown, and immediately see only the transactions that still need a category. They can combine this with the month and account filters to narrow the list further.

**Why this priority**: This is the entire value of the feature. Without this story there is nothing to deliver.

**Independent Test**: Open Transactions page with a mix of categorised and uncategorised transactions → select "Uncategorised" from the category dropdown → verify only transactions with no category are shown; all categorised transactions are hidden.

**Acceptance Scenarios**:

1. **Given** the Transactions page is open, **When** the user opens the category filter dropdown, **Then** an "Uncategorised" option is visible alongside "All categories" and the named categories.
2. **Given** the user selects "Uncategorised" from the category dropdown, **Then** only transactions with no category assigned are displayed in the list.
3. **Given** "Uncategorised" is selected, **Then** transactions that have a named category assigned are not shown.
4. **Given** "Uncategorised" is selected and the month filter is also active, **Then** only uncategorised transactions within the selected month are shown (filters combine with AND logic).
5. **Given** "Uncategorised" is selected and the account filter is also active (multi-account view), **Then** only uncategorised transactions for the selected account are shown.
6. **Given** "Uncategorised" is selected and the user types in the search box, **Then** results are further narrowed to uncategorised transactions whose payee or memo matches the search term.
7. **Given** "Uncategorised" is selected, **Then** transfer transactions are governed solely by the "Show transfers" toggle and do not appear in the uncategorised list regardless of their category field value.

---

### Edge Cases

- What if there are no uncategorised transactions when the filter is active? The existing empty state ("No transactions found.") is displayed — no special handling required.
- What if the user assigns a category to a transaction while "Uncategorised" is selected? The newly categorised transaction disappears from the filtered list immediately, consistent with existing filter behaviour.
- Are transfer transactions considered uncategorised? No — transfers are excluded by the existing transfer-visibility gate before the category filter is applied. They must not appear in the "Uncategorised" filter even if their internal category field is null.
- Where does "Uncategorised" appear in the dropdown? Immediately after "All categories" and before the first named category, so it is always accessible at the top of the list.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The category filter dropdown on the Transactions page MUST include an "Uncategorised" option positioned immediately after "All categories" and before any named categories.
- **FR-002**: When "Uncategorised" is selected, the transaction list MUST display ONLY transactions whose category field is null, undefined, or an empty string.
- **FR-003**: Transfer transactions MUST NOT appear in the "Uncategorised" filter results, regardless of their category field value. The existing transfer-visibility gate (Show transfers toggle) continues to govern their visibility independently.
- **FR-004**: The "Uncategorised" filter MUST combine with all other active filters (month, account, search text) using AND logic — the same composition behaviour as named category filters.
- **FR-005**: When a transaction is assigned a category while "Uncategorised" is selected, it MUST disappear from the filtered list immediately without requiring a page reload.
- **FR-006**: Selecting "All categories" from the dropdown MUST reset the category filter to its default state, showing transactions of all categories (subject to other active filters).

### Key Entities

- **Transaction (PfaTxn)**: Existing entity. The `category` field (string | null | undefined) determines whether a transaction is uncategorised. No schema changes are required — the feature is purely a filter-layer addition.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can isolate all uncategorised transactions in a single dropdown selection — no multi-step workflow required.
- **SC-002**: When "Uncategorised" is selected, zero transactions with a named category appear in the visible list.
- **SC-003**: The "Uncategorised" filter correctly combines with all other active filters — month, account, and search text — producing an AND-intersected result set.
- **SC-004**: Transfer transactions never appear in the "Uncategorised" filtered view, regardless of their internal category value.
- **SC-005**: The row count displayed beneath the filters accurately reflects the number of uncategorised (and otherwise matching) transactions.

---

## Assumptions

- A transaction is considered "uncategorised" if its `category` field is `null`, `undefined`, or an empty string `""`. All three are treated identically.
- Transfer transactions are excluded before the category filter is evaluated — this preserves the existing layered filter architecture and requires no changes to transfer-handling logic.
- No new data is persisted; this is a purely presentational filter change with no effect on localStorage or any transaction record.
- The "Uncategorised" option label matches the existing in-row dropdown label ("Uncategorised") for consistency.
- No changes are required to the Dashboard page or any other page — this feature is scoped to the Transactions page filter bar only.
