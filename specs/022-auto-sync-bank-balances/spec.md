# Feature Specification: Auto-Sync Bank Account Balances into Net Worth

**Feature Branch**: `022-auto-sync-bank-balances`  
**Created**: 2026-05-17  
**Status**: Draft  
**Input**: User description: "FA-NW-004 — Auto-sync bank account balances into net worth"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Link Account to Asset and See Balance Sync (Priority: P1)

A user links a savings or cheque bank account to an asset record. The asset's value immediately updates to reflect the current balance derived from the account's transaction history, without the user typing a number manually.

**Why this priority**: This is the core value proposition — eliminating the double-entry problem for the most common account-to-asset mapping (savings/cheque → asset).

**Independent Test**: Can be fully tested by creating an asset, linking a bank account to it, and verifying the asset value equals the sum of the account's transactions.

**Acceptance Scenarios**:

1. **Given** an asset with no linked account and a manual value of $5,000, **When** the user links a savings account that has transactions summing to $3,200, **Then** the asset value updates to $3,200 and an "Auto-synced" badge appears next to the value field.
2. **Given** an asset linked to an account with transactions summing to $1,500, **When** the user views the asset, **Then** the value input is read-only (not editable while auto-sync is active).
3. **Given** an asset linked to an overdrawn account with transactions summing to −$200, **When** the sync runs, **Then** the asset value is set to $0 and an amber warning indicator is displayed.

---

### User Story 2 - Link Credit Card Account to Liability (Priority: P1)

A user links a credit card bank account to a liability record. The liability's value automatically reflects the outstanding balance (absolute value of the running balance), since credit card transactions typically yield a negative running total.

**Why this priority**: Equal priority to asset sync — it solves the other half of the double-entry problem and follows the same core sync mechanism.

**Independent Test**: Can be fully tested by creating a liability, linking a credit card account, and verifying the liability value equals the absolute value of the account's transaction sum.

**Acceptance Scenarios**:

1. **Given** a liability linked to a credit card account whose transactions sum to −$850 (typical negative running balance), **When** the sync runs, **Then** the liability value is set to $850.
2. **Given** a liability linked to a credit card account whose transactions sum to $0 (fully paid off), **When** the sync runs, **Then** the liability value is set to $0 with no warning.

---

### User Story 3 - Transactions Auto-Trigger Value Update (Priority: P2)

When the user imports a bank statement or manually adds a transaction to a linked account, all connected assets and liabilities update automatically — no separate "refresh" action required.

**Why this priority**: Without this, the user still needs two steps whenever transactions change; it is what makes the sync feel seamless.

**Independent Test**: Can be fully tested by adding a transaction to an account linked to an asset, then confirming the asset value changed without any additional user action.

**Acceptance Scenarios**:

1. **Given** an asset linked to a savings account with a current synced value of $1,000, **When** a new transaction of +$500 is added to that account, **Then** the asset value updates to $1,500 automatically.
2. **Given** a liability linked to a credit card account with a synced value of $300, **When** a transaction of −$50 is deleted from that account, **Then** the liability value updates to $250 automatically.
3. **Given** a bank statement import adds 10 transactions to a linked account, **When** the import completes, **Then** all assets and liabilities linked to that account reflect the new balance.

---

### User Story 4 - Manual Override Suspends Auto-Sync (Priority: P2)

A user manually edits the value of an asset or liability that is currently auto-synced. The system accepts the manual value, suspends auto-sync for that record, and displays a "Manual override" badge to make the suspension visible.

**Why this priority**: Manual override is essential for flexibility — users may need to adjust values for reasons the transaction data can't capture (e.g., pending corrections).

**Independent Test**: Can be fully tested by editing the value of an auto-synced asset, then confirming a "Manual override" badge appears and subsequent transaction changes no longer update the value.

**Acceptance Scenarios**:

1. **Given** an asset with autoSync enabled and a synced value of $2,000, **When** the user manually sets the value to $2,100, **Then** auto-sync is suspended and a "Manual override" badge replaces the "Auto-synced" badge.
2. **Given** an asset in manual override with value $2,100, **When** a new transaction is added to the linked account, **Then** the asset value remains $2,100 (auto-sync does not override the manual value).

---

### User Story 5 - Re-Enable Auto-Sync After Manual Override (Priority: P3)

A user who previously manually overrode an asset or liability value can re-enable auto-sync. The system immediately recomputes the value from the linked account balance and resumes automatic updates.

**Why this priority**: Completes the override lifecycle; without it, a manual override is permanent with no recovery path.

**Independent Test**: Can be fully tested by clicking "Re-enable auto-sync" on a manually-overridden record and verifying the value updates to the current account balance.

**Acceptance Scenarios**:

1. **Given** an asset in manual override with value $2,100 and a linked account balance of $1,950, **When** the user clicks "Re-enable auto-sync", **Then** autoSync is set to true, the value updates to $1,950, and the "Auto-synced" badge reappears.

---

### Edge Cases

- What happens when a linked account has no transactions? → Balance is treated as $0; asset/liability value is set to $0.
- What happens when the computed balance is negative (overdrawn cheque, net negative credit card)? → Value is clamped to $0 and an amber warning indicator is shown.
- What happens when a linked account is unlinked (linkedAccountId removed) while autoSync is true? → AutoSync remains true but has no account to sync from; value stays at last synced amount until user manually updates or re-links.
- What happens when the same account is linked to multiple assets or liabilities? → Each linked record is independently synced.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST store an `autoSync` boolean flag on every asset and liability record, defaulting to `true`.
- **FR-002**: When an asset has a linked account and `autoSync = true`, the asset's value MUST equal `max(0, sum of all transactions for that account)`.
- **FR-003**: When a liability has a linked account and `autoSync = true`, the liability's value MUST equal `max(0, abs(sum of all transactions for that account))`.
- **FR-004**: The sync computation MUST trigger automatically whenever a transaction is created, updated, or deleted on a linked account.
- **FR-005**: When a user submits a manual value change for an asset or liability, the system MUST set `autoSync = false` on that record automatically.
- **FR-006**: When `autoSync = false`, the asset or liability MUST display a "Manual override" visual indicator.
- **FR-007**: When `autoSync = true` and a linked account exists, the asset or liability MUST display an "Auto-synced" visual indicator and the value field MUST be read-only.
- **FR-008**: Users MUST be able to re-enable `autoSync` via a "Re-enable auto-sync" action, which immediately triggers a sync.
- **FR-009**: When a computed balance is clamped to zero (i.e., the raw computed value was negative), the system MUST display an amber warning indicator on the affected record.
- **FR-010**: The sync MUST run for all assets and liabilities linked to an account whenever transactions change, not just the most recently modified record.
- **FR-011**: Auto-sync computations are based solely on transaction data already stored in the app; no external feeds or APIs are involved.

### Key Entities _(include if feature involves data)_

- **Asset**: Represents something the user owns. Key fields: `value` (numeric, non-negative), `linkedAccountId` (optional FK to bank account), `autoSync` (boolean, default true). When `linkedAccountId` is set and `autoSync` is true, `value` is computed, not user-entered.
- **Liability**: Represents something the user owes. Same fields as Asset; balance computation uses `abs()` to handle credit cards' negative running totals.
- **BankAccount**: The source of truth for balance. Linked to assets/liabilities via `linkedAccountId`.
- **Transaction**: Belongs to a BankAccount. Has an `amount` (positive for credits, negative for debits). The sum of all transactions for an account is the running balance.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: When a bank account is linked to an asset or liability, the value updates to reflect the current balance within the same user action (no separate refresh required).
- **SC-002**: When a transaction is added, updated, or deleted, all assets and liabilities linked to that account reflect the updated balance within the same request cycle.
- **SC-003**: An auto-synced record and a manually-overridden record are visually distinguishable at a glance without any additional interaction.
- **SC-004**: A user can re-enable auto-sync on a manually-overridden record in a single action, and the value immediately reflects the current account balance.
- **SC-005**: No asset or liability ever displays a negative value as a result of auto-sync computation.
- **SC-006**: 100% of assets and liabilities linked to an account are updated when transactions on that account change (no linked record is skipped).

## Assumptions

- The `linkedAccountId` field already exists on both assets and liabilities tables (introduced in FA-NW-001); only the new `autoSync` flag needs to be added.
- Bank accounts are classified by type (savings, cheque, credit card) sufficient to determine the correct balance computation; the existing account type field is used.
- The sync is synchronous within the same server request — no background jobs or queues are required for this scope.
- All transaction amounts are stored as numbers in the database; the sum can be computed with a SQL aggregate.
- Mobile/responsive layout is handled by the existing modal framework; no separate mobile design is needed.
- Soft-delete or archived transactions (if any) follow the existing query conventions; this feature does not change transaction lifecycle rules.
