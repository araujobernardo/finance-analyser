# Data Model: FA-GOAL-003 — Goal Progress Auto-Calculation

**Date**: 2026-05-19

## Schema Changes

**None required.** All columns used by this feature already exist in the `goals` table as of FA-GOAL-001.

## Existing Columns Used

| Column                    | Type            | Nullable | Usage                                                                                      |
| ------------------------- | --------------- | -------- | ------------------------------------------------------------------------------------------ |
| `goals.current_amount`    | `numeric(15,2)` | Yes      | Written back after each recalculation                                                      |
| `goals.target_amount`     | `numeric(15,2)` | No       | Target for savings/milestone; initial debt for debt_payoff; monthly cap for spending_limit |
| `goals.status`            | `varchar(20)`   | No       | Set to `achieved` by auto-achieve logic; `active`/`abandoned` never overwritten by calc    |
| `goals.linked_account_id` | `uuid`          | Yes      | Account filter for savings_target, debt_payoff                                             |
| `goals.category_name`     | `varchar(100)`  | Yes      | Category filter for spending_limit                                                         |
| `goals.updated_at`        | `timestamp`     | No       | Updated on every write-back                                                                |
| `goals.type`              | `varchar(50)`   | No       | Determines which calculation branch runs                                                   |
| `transactions.amount`     | `numeric(15,2)` | No       | Negative = expense; summed for balance and spending_limit                                  |
| `transactions.category`   | `varchar(100)`  | Yes      | Matched against `goals.category_name` for spending_limit                                   |
| `transactions.date`       | `date`          | No       | Filtered by current calendar month for spending_limit                                      |
| `assets.value`            | `numeric(15,2)` | No       | Summed for net worth milestone                                                             |
| `liabilities.value`       | `numeric(15,2)` | No       | Summed and subtracted for net worth milestone                                              |

## Calculation Output Shape

After `calculateGoalProgress` runs for a goal, the following fields are written to the `goals` row:

```typescript
{
  currentAmount: string,   // numeric string, e.g. "3200.00"
  status: string,          // 'achieved' if threshold crossed, otherwise unchanged
  updatedAt: Date,
}
```

## Entities

### `calculateGoalProgress(goal, db, userId): Promise<void>`

Reads from: `transactions`, `assets`, `liabilities` (depending on goal type)
Writes to: `goals` (currentAmount, status, updatedAt)
Skips: goals with `status = 'achieved'` or `status = 'abandoned'`

### `recalculateUserGoals(userId, db): Promise<void>`

Reads from: `goals` WHERE `userId = userId AND status = 'active'`
Calls: `calculateGoalProgress` for each active goal
No direct writes — delegates all writes to `calculateGoalProgress`

## Goal Type Semantics

| Type                  | `targetAmount` means                      | `linkedAccountId` | `categoryName` | Auto-achieved when              |
| --------------------- | ----------------------------------------- | ----------------- | -------------- | ------------------------------- |
| `savings_target`      | Savings goal target (e.g. $20,000)        | Required          | null           | `currentAmount >= targetAmount` |
| `debt_payoff`         | Total debt at goal creation (e.g. $5,000) | Required          | null           | outstanding balance <= 0        |
| `net_worth_milestone` | Net worth target (e.g. $100,000)          | null              | null           | `currentAmount >= targetAmount` |
| `spending_limit`      | Monthly spend cap (e.g. $300)             | null              | Required       | Never                           |
