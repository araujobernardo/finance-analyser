# Feature Specification: FA-GOAL-003 — Goal Progress Auto-Calculation

**Feature Branch**: `025-goal-progress-auto-calc`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "FA-GOAL-003 — Goal progress auto-calculation from transaction data"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Savings Target Tracks Account Balance (Priority: P1)

A user has a "House Deposit" savings goal linked to their savings account. Every time they import new transactions, the goal's progress bar updates automatically to reflect the current account balance — no manual entry needed.

**Why this priority**: This is the most common goal type and the most direct connection between transaction data and goal progress. Delivering this alone makes the feature valuable.

**Independent Test**: Create a savings target goal linked to an account with known transactions. Open the Goals page and verify the progress bar reflects the account balance without any manual input.

**Acceptance Scenarios**:

1. **Given** a savings target goal linked to an account with a balance of $3,200, **When** the user opens the Goals page, **Then** the goal's current amount is $3,200 and the progress bar reflects the percentage of the target reached.
2. **Given** a savings target goal at $3,200 progress, **When** the user imports new transactions that bring the account balance to $4,500, **Then** the goal's current amount automatically updates to $4,500.
3. **Given** a savings target goal where current amount has reached the target amount, **When** progress is recalculated, **Then** the goal status is automatically set to "achieved".

---

### User Story 2 — Debt Payoff Tracks Remaining Balance Reduction (Priority: P2)

A user has a "Credit Card Payoff" goal linked to their credit card account. As they pay down their balance and import transactions, the progress towards zero debt is automatically updated.

**Why this priority**: Debt payoff is a high-motivation goal type. Seeing progress automatically encourages continued repayment behaviour.

**Independent Test**: Create a debt payoff goal linked to a credit card account. Import transactions representing payments and verify progress increases as the outstanding balance decreases.

**Acceptance Scenarios**:

1. **Given** a debt payoff goal linked to a credit card account with an outstanding balance of $5,000, **When** the user opens the Goals page, **Then** progress reflects how much the balance has been reduced from the balance at goal creation time.
2. **Given** a debt payoff goal with an initial debt of $5,000 and a current balance of $3,000, **When** progress is calculated, **Then** progress is shown as 40% ($2,000 paid off of $5,000 original debt).
3. **Given** a debt payoff goal where the linked account balance reaches zero or below, **When** progress is recalculated, **Then** the goal status is automatically set to "achieved".

---

### User Story 3 — Net Worth Milestone Shows Live Net Worth Progress (Priority: P3)

A user has a "Reach $100k Net Worth" milestone goal. No linked account is required — the goal automatically shows their current total net worth (assets minus liabilities) and how close they are to the target.

**Why this priority**: Net worth milestone goals require no linking setup and use data already computed by the app, making them easy wins once the calculation engine exists.

**Independent Test**: Create a net worth milestone goal with a target. Add assets and liabilities in the Net Worth page. Verify the goal's progress reflects total assets minus total liabilities.

**Acceptance Scenarios**:

1. **Given** a net worth milestone goal with a $100,000 target and a current net worth of $62,000, **When** the user opens the Goals page, **Then** progress is shown as 62% with a current amount of $62,000.
2. **Given** a net worth milestone goal, **When** the user adds a new asset or liability that changes the net worth, **Then** the goal progress updates to reflect the new net worth on the next page load.
3. **Given** a net worth milestone goal where net worth has reached or exceeded the target, **When** progress is recalculated, **Then** the goal status is automatically set to "achieved".

---

### User Story 4 — Spending Limit Shows Month-to-Date Category Spend (Priority: P4)

A user has a "Dining Out — $300/month" spending limit goal linked to the "Dining" category. As they import transactions throughout the month, the goal shows how much has been spent and whether they are on track.

**Why this priority**: Spending limits require category-level transaction aggregation, which is more complex than balance lookups. Delivered last as it depends on the category data model being consistent.

**Independent Test**: Create a spending limit goal for a category with a monthly cap. Import transactions in that category for the current month and verify the goal shows the correct month-to-date spend.

**Acceptance Scenarios**:

1. **Given** a spending limit goal for the "Dining" category with a $300 monthly cap, **When** the user has $210 of dining transactions in the current calendar month, **Then** progress is shown as 70% and the goal is "on track".
2. **Given** a spending limit goal with a $300 monthly cap, **When** monthly spend reaches $310, **Then** progress is shown as greater than 100% and the goal is marked as "over limit".
3. **Given** a spending limit goal, **When** the calendar month rolls over, **Then** the month-to-date spend resets and progress starts from zero for the new month.
4. **Given** a spending limit goal, **When** progress is recalculated, **Then** only transactions from the current calendar month are included.

---

### Edge Cases

- What happens when a goal has no linked account and requires one (savings target, debt payoff, spending limit)? Progress remains at zero and a hint is shown to link an account.
- What happens when the linked account has no transactions? Progress is zero; no error is shown.
- What if the account balance is negative for a savings target? Progress is shown as zero (not negative).
- What happens if a debt payoff goal's current balance exceeds the original balance at creation (debt grew)? Progress is shown as zero.
- What if `targetAmount` is zero on a goal? Division-by-zero must be guarded; progress shown as 0%.
- What if a spending limit goal's linked category has no transactions this month? Progress is 0% and shown as "on track".

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST calculate goal progress automatically for all four goal types (savings target, debt payoff, net worth milestone, spending limit) without requiring manual input from the user.
- **FR-002**: The system MUST recalculate progress for all goals when the user opens the Goals page.
- **FR-003**: The system MUST recalculate progress for all goals after transactions are imported or added to any account.
- **FR-004**: The system MUST recalculate progress for net worth milestone goals after net worth values change.
- **FR-005**: The system MUST write the calculated progress back to the `goals.currentAmount` field so that the progress bar in FA-GOAL-002 always reflects the latest value.
- **FR-006**: The system MUST automatically set a savings target goal's status to "achieved" when `currentAmount >= targetAmount`.
- **FR-007**: The system MUST automatically set a net worth milestone goal's status to "achieved" when `currentAmount >= targetAmount`.
- **FR-008**: The system MUST automatically set a debt payoff goal's status to "achieved" when the linked account balance reaches zero or below.
- **FR-009**: For a **savings target** goal, progress MUST equal the sum of all transactions in the linked account (the account's current balance).
- **FR-010**: For a **debt payoff** goal, progress MUST be calculated as the reduction from the account balance recorded at goal creation time. The linked account balance is treated as an absolute value (credit card accounts show negative balances as positive debt).
- **FR-011**: For a **net worth milestone** goal, progress MUST equal the user's current net worth (total assets minus total liabilities) as computed by the existing net worth calculation.
- **FR-012**: For a **spending limit** goal, progress MUST equal the total amount spent in the linked category during the current calendar month only. Transactions outside the current month MUST be excluded.
- **FR-013**: A spending limit goal where monthly spend exceeds the target MUST display progress above 100% (over limit state) — it is NOT automatically "achieved".
- **FR-014**: Goals that already have status "achieved" or "cancelled" MUST NOT have their status changed by auto-calculation (achieved state is terminal).
- **FR-015**: The system MUST guard against division-by-zero when `targetAmount` is zero; progress is shown as 0% in this case.

### Key Entities

- **Goal**: Has `goalType`, `targetAmount`, `currentAmount`, `status`, `linkedAccountId`, `categoryName`, and an `initialBalance` capturing the account balance at goal creation (used by debt payoff).
- **Transaction**: Belongs to an account; has `amount`, `date`, `category`, and `accountId`. Used to derive account balances and category spend.
- **Account Balance**: The sum of all transactions for a given `accountId`. Used by savings target and debt payoff goal types.
- **Net Worth**: Total assets minus total liabilities. Used by net worth milestone goals; sourced from the existing net worth calculation already in the app.
- **Monthly Category Spend**: Sum of transaction amounts in a given category during the current calendar month. Used by spending limit goals.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Goal progress updates are visible to the user within the same page load that triggers the recalculation — no additional user action required.
- **SC-002**: All four goal types display correct progress values when the Goals page is opened, verified by automated tests covering each calculation rule.
- **SC-003**: A goal's status transitions to "achieved" automatically with no manual action required from the user, within the same interaction that caused the threshold to be crossed.
- **SC-004**: Spending limit goals correctly isolate month-to-date spend — transactions from prior months are excluded from the calculation in 100% of automated test cases.
- **SC-005**: Recalculation completes fast enough that the Goals page feels instant — no perceptible delay between page open and progress bars reflecting current data.
- **SC-006**: Edge cases (no linked account, zero target, negative balance, debt growth) are handled gracefully with no error states shown to the user.

## Assumptions

- The `goals` table already has `currentAmount` and `categoryName` columns (delivered by FA-GOAL-001).
- The `goals` table already has a `status` field with values including `active`, `achieved`, and `cancelled` (delivered by FA-GOAL-001/FA-GOAL-002).
- Account balances are derived from the transactions table (sum of all transactions per account) — no separate balance field is needed.
- The net worth calculation (total assets minus total liabilities) already exists in the app and can be called or re-used without reimplementing it.
- Debt payoff goals require an `initialBalance` value captured when the goal is created. If this field does not yet exist in the schema, it must be added as part of this feature.
- Spending limit goals use the `categoryName` field on the goal to filter transactions by category.
- All calculation is synchronous and triggered by user actions — no background jobs, scheduled tasks, push notifications, or email alerts are in scope.
- Mobile support follows the same behaviour as desktop; no separate mobile-specific logic is required.
