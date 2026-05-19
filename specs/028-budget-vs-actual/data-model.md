# Data Model: FA-BUDG-002 — Budget vs Actual Spend Comparison View

**Source tables**: Defined in FA-BUDG-001 (`0007_budget_data_model.sql`)

This feature reads from three existing tables and one existing table for transaction data. No new tables are introduced.

---

## Existing Tables Consumed

### budgets

Stores one spending limit per user per category per calendar month.

| Column        | Type          | Constraints                               |
| ------------- | ------------- | ----------------------------------------- |
| id            | uuid          | PK, default gen_random_uuid()             |
| user_id       | uuid          | FK → users.id ON DELETE CASCADE, NOT NULL |
| category_name | varchar(100)  | NOT NULL                                  |
| year          | integer       | NOT NULL, CHECK >= 1                      |
| month         | integer       | NOT NULL, CHECK 1–12                      |
| limit_amount  | numeric(15,2) | NOT NULL, CHECK >= 0                      |
| created_at    | timestamptz   | DEFAULT now(), NOT NULL                   |
| updated_at    | timestamptz   | DEFAULT now(), NOT NULL                   |

Unique index: `(user_id, category_name, year, month)`

### budget_defaults

Stores one standing spending limit per user per category, used to seed new months.

| Column        | Type          | Constraints                               |
| ------------- | ------------- | ----------------------------------------- |
| id            | uuid          | PK, default gen_random_uuid()             |
| user_id       | uuid          | FK → users.id ON DELETE CASCADE, NOT NULL |
| category_name | varchar(100)  | NOT NULL                                  |
| limit_amount  | numeric(15,2) | NOT NULL, CHECK >= 0                      |
| created_at    | timestamptz   | DEFAULT now(), NOT NULL                   |
| updated_at    | timestamptz   | DEFAULT now(), NOT NULL                   |

Unique index: `(user_id, category_name)`

### user_preferences

Stores one row per user with the month start day preference.

| Column          | Type        | Constraints                                       |
| --------------- | ----------- | ------------------------------------------------- |
| id              | uuid        | PK, default gen_random_uuid()                     |
| user_id         | uuid        | FK → users.id ON DELETE CASCADE, NOT NULL, UNIQUE |
| month_start_day | integer     | NOT NULL, DEFAULT 1, CHECK 1–28                   |
| created_at      | timestamptz | DEFAULT now(), NOT NULL                           |
| updated_at      | timestamptz | DEFAULT now(), NOT NULL                           |

### transactions (existing)

Read-only for spend calculation. Relevant columns:

| Column      | Type          | Used for                               |
| ----------- | ------------- | -------------------------------------- |
| user_id     | uuid          | Scope to authenticated user            |
| category    | varchar       | Match against budget.category_name     |
| amount      | numeric(15,2) | Negative = expense; filter amount < 0  |
| date        | date          | Filter within budget period date range |
| is_transfer | boolean       | Exclude when true                      |

---

## Derived / View Model

### Budget Summary (not stored — computed per request)

Produced by GET /api/budgets for each budget row:

| Field          | Type   | Derivation                                                    |
| -------------- | ------ | ------------------------------------------------------------- |
| id             | string | budgets.id                                                    |
| categoryName   | string | budgets.category_name                                         |
| year           | number | budgets.year                                                  |
| month          | number | budgets.month                                                 |
| limitAmount    | number | parseFloat(budgets.limit_amount)                              |
| actualSpend    | number | calculateBudgetSpend() — see utility spec                     |
| remaining      | number | limitAmount − actualSpend (can be negative)                   |
| percentageUsed | number | (actualSpend / limitAmount) × 100; 100 if limit=0 and spend>0 |

---

## Budget Period Date Range

For a budget row with `(year, month)` and user's `monthStartDay`:

```
startDate = new Date(year, month - 1, monthStartDay)
endDate   = new Date(year, month,     monthStartDay - 1)
```

JavaScript's `Date` constructor handles day overflow automatically (e.g., month=12, day+1 wraps to January of next year).

**Examples**:

| monthStartDay | year | month | startDate  | endDate    |
| ------------- | ---- | ----- | ---------- | ---------- |
| 1             | 2026 | 5     | 2026-05-01 | 2026-05-31 |
| 15            | 2026 | 5     | 2026-05-15 | 2026-06-14 |
| 28            | 2026 | 1     | 2026-01-28 | 2026-02-27 |
| 1             | 2026 | 12    | 2026-12-01 | 2026-12-31 |
| 15            | 2026 | 12    | 2026-12-15 | 2027-01-14 |

---

## Status Indicator Thresholds

Derived from `percentageUsed` at render time (frontend only — not stored):

| Status            | Condition                 | Colour |
| ----------------- | ------------------------- | ------ |
| On Track          | percentageUsed < 80       | green  |
| Approaching Limit | 80 ≤ percentageUsed < 100 | amber  |
| Limit Exceeded    | percentageUsed ≥ 100      | red    |

Zero-limit edge case: `percentageUsed` is set to 100 when actualSpend > 0, triggering red automatically.

---

## Auto-Populate Logic

When GET /api/budgets for (year, month) returns 0 existing rows:

1. Fetch all `budget_defaults` for the user
2. For each default, insert into `budgets` with `limitAmount = default.limitAmount`, using `onConflictDoNothing` on `(userId, categoryName, year, month)`
3. Re-fetch budgets for (year, month) and proceed with spend calculation

This is idempotent — subsequent calls find the rows already inserted and skip step 2.

If the user manually deleted a budget for a default category, that deletion is preserved (`onConflictDoNothing` does not re-insert).

---

## TypeScript Types (src/types/api.ts)

```typescript
export interface ApiBudget {
  id: string;
  categoryName: string;
  year: number;
  month: number;
  limitAmount: number;
  actualSpend: number;
  remaining: number;
  percentageUsed: number;
}

export interface ApiBudgetDefault {
  id: string;
  categoryName: string;
  limitAmount: number;
}

export interface ApiUserPreferences {
  id: string;
  monthStartDay: number;
}
```
