# Feature Specification: FA-BUDG-002 — Budget vs Actual Spend Comparison View

**Feature Branch**: `028-budget-vs-actual`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "FA-BUDG-002 — Budget vs actual spend comparison view"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Budget Overview for Current Month (Priority: P1)

A user opens the Budget page after paying their monthly bills. They immediately see all their budgeted categories for the current month — each row shows the category name, the spending limit they set, how much they've actually spent so far, how much is left, what percentage of the limit has been used, and a colour-coded status indicator: green when well within the limit, amber when getting close, red when at or over the limit. The spend figures are calculated from their transaction data and respect their configured month start day.

**Why this priority**: This is the core value of the feature — giving the user an at-a-glance view of where they stand against their budgets without having to do any manual arithmetic. Everything else is secondary to this working correctly.

**Independent Test**: Set up budgets for three categories (one well under limit, one near the limit, one over) with matching transactions in the current budget period. Open the Budget page — each category shows the correct limit, actual spend, remaining amount, percentage used, and the correct status colour. Verify that transfer transactions and income transactions are excluded from the spend totals. Verify that transactions outside the budget period (before the month start day or after the period end) are not counted.

**Acceptance Scenarios**:

1. **Given** a user has budgets set for several categories in the current month and matching transactions, **When** they open the Budget page, **Then** each budget row shows: category name, spending limit, actual spend to date, amount remaining (limit minus actual spend), percentage used, and a status indicator.
2. **Given** a budget category where actual spend is less than 80% of the limit, **When** the Budget page renders, **Then** the status indicator for that row is green ("On Track").
3. **Given** a budget category where actual spend is between 80% and 99% of the limit (inclusive), **When** the Budget page renders, **Then** the status indicator is amber ("Approaching Limit").
4. **Given** a budget category where actual spend equals or exceeds the spending limit, **When** the Budget page renders, **Then** the status indicator is red ("Limit Exceeded").
5. **Given** a user has transactions marked as transfers in a budgeted category, **When** actual spend is calculated, **Then** those transfer transactions are excluded — only expense transactions (negative amounts that are not transfers) are counted.
6. **Given** a user's month start day is the 15th, **When** the Budget page calculates actual spend for the May budget, **Then** only transactions dated 2026-05-15 through 2026-06-14 are included; transactions on 2026-05-14 or earlier and 2026-06-15 or later are excluded.
7. **Given** a budget category with a zero spending limit, **When** any expense transaction exists in that category for the period, **Then** the status indicator is red (any spend against a zero limit is exceeded).
8. **Given** a budget exists for a category but no transactions exist in that category for the period, **When** the Budget page renders, **Then** the row shows 0 actual spend, the full limit as remaining, 0% used, and a green status.

---

### User Story 2 — Create, Edit, and Delete Budgets (Priority: P2)

A user wants to start tracking a new spending category, increase a limit that turns out to be too tight, or remove a budget for a category they no longer want to monitor. From the Budget page they can add a new budget for any category and month, change the spending limit on an existing one, and delete a budget they no longer need — all without leaving the page.

**Why this priority**: Without budget management the page is read-only and users cannot correct mistakes or add new categories. However, it depends on the overview (US1) being in place first — you need to see the budgets before you can manage them.

**Independent Test**: On the Budget page, create a new budget for "Dining" with a limit of $300 for the current month — the new row appears immediately. Edit that limit to $400 — the row updates. Delete the "Dining" budget — the row disappears. Attempt to create a second budget for "Dining" in the same month — the system prevents the duplicate.

**Acceptance Scenarios**:

1. **Given** a user is on the Budget page, **When** they create a new budget for a category (specifying category name, spending limit, and month), **Then** the new budget row appears in the list with 0 actual spend and the correct limit.
2. **Given** a user has an existing budget for "Groceries" at $500, **When** they edit the limit to $600, **Then** the row updates to show the new limit and the remaining amount and percentage recalculate accordingly.
3. **Given** a user deletes an existing budget, **When** the deletion is confirmed, **Then** the row is removed from the Budget page; the budget data is permanently removed.
4. **Given** a user already has a budget for "Groceries" in May 2026, **When** they attempt to create a second budget for "Groceries" in May 2026, **Then** the system prevents the creation and informs the user that a budget already exists for that category and month.
5. **Given** a user creates a budget for a past month, **When** they navigate to that past month, **Then** the budget row appears with the correct historical actual spend for that period.

---

### User Story 3 — Historical Month Navigation (Priority: P3)

A user wants to review how their Groceries spending compared to their $500 limit last month, or check whether they stayed within budget in January. From the Budget page they can step backward (and forward) through months to see the budget vs actual comparison for any past month with budget data.

**Why this priority**: Historical navigation adds significant value for retrospective analysis but is not essential to the core budget-checking experience. Users can get value from the feature viewing only the current month.

**Independent Test**: With budgets and transactions in both the current month and the previous month, open the Budget page and navigate back one month — the page shows the previous month's budgets with their historical actual spend (not the current month's). Navigate forward to return to the current month — the current month's data reappears.

**Acceptance Scenarios**:

1. **Given** a user is viewing the Budget page for the current month, **When** they navigate to the previous month, **Then** the page shows the budgets (and actual spend calculated from transactions) for that prior month.
2. **Given** a user is on a past month's view, **When** they navigate forward, **Then** they return toward the current month.
3. **Given** a user navigates to a month with no budgets set, **When** that month renders, **Then** an empty state is shown with a prompt to create a budget.
4. **Given** a user is viewing the current month, **When** they attempt to navigate forward past the current month, **Then** future navigation is disabled or restricted — there is no useful data to show for months that have not yet occurred.

---

### User Story 4 — Default Budget Configuration (Priority: P4)

A user spends roughly $500 on Groceries and $200 on Dining every month. Instead of re-entering those limits each month, they can set default budgets for those categories. When a new month is accessed on the Budget page, those defaults automatically create monthly budget records so the user sees their standing limits without any extra steps.

**Why this priority**: Defaults are a quality-of-life improvement. The feature is fully functional without them — users can create monthly budgets manually.

**Independent Test**: Set a default budget of $500 for "Groceries". Navigate to a future month that has no existing "Groceries" budget — the page automatically shows a "Groceries" budget row with $500 limit. Update the default to $600 — new months going forward use $600, but already-created monthly budgets are unaffected. Delete the "Groceries" default — months already created retain their budgets; new months show no "Groceries" row.

**Acceptance Scenarios**:

1. **Given** a default budget of $500 exists for "Groceries", **When** the user opens the Budget page for a month that has no explicit "Groceries" budget, **Then** a "Groceries" budget is automatically created at $500 for that month and displayed in the list.
2. **Given** an explicit monthly budget already exists for "Groceries" in May 2026 at $400, **When** the default for "Groceries" is $500, **Then** the explicit budget takes precedence — the May row shows $400, not $500.
3. **Given** a user updates the default for "Groceries" from $500 to $600, **When** they view a month where a budget was already auto-created at $500, **Then** that existing budget retains $500 — only future months without an existing budget pick up the $600 default.
4. **Given** a user deletes the default for "Groceries", **When** they view a past month where a budget was already created from the default, **Then** that month's budget still shows $500 — deleting a default does not delete previously-created monthly budgets.
5. **Given** a user sets a default for "Dining" at $200, **When** they view the list of defaults, **Then** the "Dining" default at $200 is shown; they can update or delete it independently of any monthly budgets.

---

### User Story 5 — Month Start Day Configuration (Priority: P5)

A user who receives their salary on the 15th considers their personal month to run from the 15th of one month to the 14th of the next. They configure their month start day to 15 so that every budget period and spend calculation in the app aligns with their pay cycle.

**Why this priority**: This affects the correctness of spend calculations for users whose financial month does not align with the calendar month. However, users who start on the 1st (the default) are unaffected and the feature works without this configuration.

**Independent Test**: Set the month start day to 15. Open the Budget page for May 2026 — only transactions from 2026-05-15 to 2026-06-14 are counted in the spend totals. Reset to 1 — May 2026 now counts transactions from 2026-05-01 to 2026-05-31.

**Acceptance Scenarios**:

1. **Given** a user has no month start day configured (default = 1), **When** the Budget page calculates actual spend, **Then** the period runs from the 1st of the selected month to the last day of that calendar month.
2. **Given** a user sets their month start day to 15, **When** the Budget page calculates actual spend for May 2026, **Then** only transactions from 2026-05-15 to 2026-06-14 are included.
3. **Given** a user updates their month start day from 15 to 20, **When** the Budget page recalculates, **Then** the period for May 2026 becomes 2026-05-20 to 2026-06-19 and the spend totals update accordingly.
4. **Given** a user attempts to set a month start day of 29, **When** the value is submitted, **Then** the system rejects it with an appropriate message — only values 1 through 28 are accepted.
5. **Given** a user has their month start day set to 15, **When** another part of the app references the user's budget month (e.g. the Goals summary widget for spending_limit goals), **Then** the same period definition is used consistently.

---

### Edge Cases

- What if the user has no budgets for the current month? Show an empty state with a prompt to create the first budget.
- What if a category has an active budget but all transactions in that category are transfers? Show 0 actual spend (transfers excluded).
- What if `limitAmount` is zero? Any expense in that category immediately registers as 100% (or more) and shows red.
- What if actual spend exceeds the limit (e.g. 150% used)? Display the actual percentage (e.g. "150%") and show red — the percentage is not capped at 100%.
- What if there are no transactions at all for a budgeted category in the period? Show 0 spent, full remaining, 0%, green.
- What if the budget period crosses a calendar month boundary (month start day > 1)? The date range spans parts of two calendar months — transactions from both months within the range are included.
- What if a user navigates to a future month? No transactions exist; all spend = 0 for every budget in that month.
- What if two categories have the same name casing difference (e.g. "groceries" vs "Groceries")? Category matching follows whatever convention is established in the transactions table — this spec assumes category names match exactly as stored.
- What if a default budget is set but the user already manually deleted the auto-created budget for that month? The deletion is respected — the default does not re-create the budget on subsequent page loads.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Budget page MUST display all budgets set for the selected month, each showing: category name, spending limit, actual spend for the budget period, amount remaining (limit minus actual spend), percentage used, and a status indicator.
- **FR-002**: Actual spend MUST be calculated as the sum of all negative-amount transactions for the user and category within the budget period, excluding any transaction where the transfer flag is set.
- **FR-003**: The budget period for a given year and month MUST be calculated as: start date = `year-month-monthStartDay`; end date = one calendar month later minus one day. If `monthStartDay = 1`, the period is the full calendar month.
- **FR-004**: Status indicators MUST be determined by the percentage of the limit used: less than 80% → green ("On Track"); 80% to less than 100% → amber ("Approaching Limit"); 100% or more → red ("Limit Exceeded"). Zero limit with any spend → red.
- **FR-005**: The Budget page MUST default to the current month on load.
- **FR-006**: The Budget page MUST allow the user to navigate to previous months and forward to the current month; navigation beyond the current month MUST be disabled.
- **FR-007**: The system MUST allow a user to create a budget for any category and month, with a spending limit of zero or more. Duplicate budgets (same user, category, year, month) MUST be rejected.
- **FR-008**: The system MUST allow a user to update the spending limit of an existing budget.
- **FR-009**: The system MUST allow a user to permanently delete a budget. Deletion of a monthly budget MUST NOT affect any default budget for the same category.
- **FR-010**: The system MUST allow a user to create, update, and delete default budgets per category. One default per category per user.
- **FR-011**: When the Budget page loads for a given month and a default budget exists for a category but no explicit monthly budget exists for that month and category, the system MUST automatically create a monthly budget from the default. This auto-creation MUST be idempotent — subsequent page loads for the same month do not create duplicate records.
- **FR-012**: Explicit monthly budgets MUST take precedence over defaults — if a monthly budget already exists, the default is not applied.
- **FR-013**: The Budget page MUST allow the user to set and update their month start day preference (an integer between 1 and 28 inclusive). This preference persists and affects spend calculations on all subsequent Budget page views.
- **FR-014**: Actual spend percentages MUST NOT be capped — if spending exceeds the limit, the displayed percentage reflects the true overage (e.g. 150%).
- **FR-015**: The Budget page MUST show an empty state with a prompt to create a budget when the selected month has no budgets.

### Key Entities

- **Budget Summary** (view model, not stored): Combines a stored budget record with the calculated actual spend for the period. Contains: category name, limit amount, actual spend, remaining amount, percentage used, status (on_track / approaching / exceeded).
- **Budget** (stored by FA-BUDG-001): User's monthly spending limit per category.
- **Default Budget** (stored by FA-BUDG-001): User's standing limit per category, used to seed new months.
- **User Preferences** (stored by FA-BUDG-001): Contains `monthStartDay`; queried to determine budget period date ranges.
- **Budget Period**: The date range `[start, end]` derived from a budget's year, month, and the user's `monthStartDay`. Not stored — computed at query time.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Actual spend totals match the true sum of qualifying transactions to within ±$0.01 across all automated test scenarios, including cases with transfer exclusions and non-standard month start days.
- **SC-002**: Status indicators (green/amber/red) are correct in 100% of automated test cases covering all threshold boundaries (0%, 79%, 80%, 99%, 100%, 150%).
- **SC-003**: The Budget page loads within 2 seconds for a month with up to 20 budget categories, verified by a manual smoke test against the production environment.
- **SC-004**: CRUD operations (create, update, delete) on budgets and defaults are reflected in the UI without requiring a full page reload, verified by interaction tests.
- **SC-005**: Navigating between months correctly updates all spend totals and status indicators — verified by an automated test covering the current month and at least one prior month.
- **SC-006**: The month start day preference correctly shifts the budget period date range and updates all spend calculations — verified by automated tests comparing totals with `monthStartDay = 1` versus `monthStartDay = 15`.
- **SC-007**: Default budget auto-creation is idempotent — repeated page loads for the same month with an applicable default do not create duplicate budget records, verified by an automated test.

## Assumptions

- Category names used in budgets match `transactions.category` exactly as stored — case-sensitive string matching; no normalisation is applied.
- "Expense transactions" are those with a negative `amount` value; income (positive amounts) is not counted against any budget.
- "Transfer transactions" are those where `isTransfer = true` — these are excluded from spend calculations regardless of their amount sign.
- The Budget page is accessed only by signed-in users; all data is scoped to the authenticated user.
- The month start day default is 1 (first of the month) when no preference has been configured; this is enforced by the data model (FA-BUDG-001).
- The page does not show categories where the user has transactions but no budget — the budget list is budget-driven, not transaction-driven.
- Budget amounts and spend totals are displayed in the same currency as the user's existing transactions (no multi-currency support in this feature).
- Future months (beyond the current month) can be navigated to but will show 0 actual spend since no transactions exist yet; this is expected behaviour.
- When a budget period crosses a calendar month boundary (month start day > 1), transactions in both calendar months within the range are included — no special handling required beyond correct date range filtering.
- Auto-creation of monthly budgets from defaults is triggered by the Budget page load; it is not triggered by background processes or scheduled jobs.
- This feature depends on FA-BUDG-001 (data model) being shipped and available.
- Push notifications and alerts for budget overages are out of scope — covered by FA-BUDG-003.
- The Budget page does not need to handle multi-user households or shared budgets — single-user app.
