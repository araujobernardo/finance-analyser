# Data Model: FA-BUDG-001 — Monthly Budget Data Model

**Branch**: `027-budget-data-model` | **Date**: 2026-05-19

## Entities

### Monthly Budget (`budgets`)

Represents a user's spending limit for a specific category in a specific calendar month.

| Column          | Type          | Constraints                            | Notes                                     |
| --------------- | ------------- | -------------------------------------- | ----------------------------------------- |
| `id`            | uuid          | PK, default random                     |                                           |
| `user_id`       | uuid          | NOT NULL, FK → users.id CASCADE DELETE |                                           |
| `category_name` | varchar(100)  | NOT NULL                               | Matches `transactions.category` free-text |
| `year`          | integer       | NOT NULL                               | e.g. 2026                                 |
| `month`         | integer       | NOT NULL, CHECK 1–12                   | 1 = January, 12 = December                |
| `limit_amount`  | numeric(15,2) | NOT NULL, CHECK >= 0                   | Spending limit for this category/month    |
| `created_at`    | timestamptz   | NOT NULL, default now()                |                                           |
| `updated_at`    | timestamptz   | NOT NULL, default now()                |                                           |

**Unique constraint**: `(user_id, category_name, year, month)` — one budget per user per category per calendar month.

---

### Default Budget (`budget_defaults`)

Represents a user's standing spending limit for a category, used as the starting point when no explicit monthly budget exists.

| Column          | Type          | Constraints                            | Notes                                     |
| --------------- | ------------- | -------------------------------------- | ----------------------------------------- |
| `id`            | uuid          | PK, default random                     |                                           |
| `user_id`       | uuid          | NOT NULL, FK → users.id CASCADE DELETE |                                           |
| `category_name` | varchar(100)  | NOT NULL                               | Matches `transactions.category` free-text |
| `limit_amount`  | numeric(15,2) | NOT NULL, CHECK >= 0                   | Default limit for this category           |
| `created_at`    | timestamptz   | NOT NULL, default now()                |                                           |
| `updated_at`    | timestamptz   | NOT NULL, default now()                |                                           |

**Unique constraint**: `(user_id, category_name)` — one default per user per category.

---

### User Preferences (`user_preferences`)

Stores per-user configuration that affects budget behaviour. Currently holds the month start day preference.

| Column            | Type        | Constraints                                    | Notes                                  |
| ----------------- | ----------- | ---------------------------------------------- | -------------------------------------- |
| `id`              | uuid        | PK, default random                             |                                        |
| `user_id`         | uuid        | NOT NULL, UNIQUE, FK → users.id CASCADE DELETE | One row per user                       |
| `month_start_day` | integer     | NOT NULL, DEFAULT 1, CHECK 1–28                | Day of month when budget period begins |
| `created_at`      | timestamptz | NOT NULL, default now()                        |                                        |
| `updated_at`      | timestamptz | NOT NULL, default now()                        |                                        |

**Effective default**: If no row exists for a user, the effective `month_start_day` is 1. FA-BUDG-002 handles this lookup-with-fallback.

---

## Relationships

```
users (1)──< budgets (many)          — one user, many monthly budgets
users (1)──< budget_defaults (many)  — one user, many category defaults
users (1)──< user_preferences (0..1) — one user, at most one preferences row
```

---

## Constraint Summary

| Table              | Constraint                    | Enforced At     |
| ------------------ | ----------------------------- | --------------- |
| `budgets`          | month IN 1–12                 | DB CHECK        |
| `budgets`          | limit_amount >= 0             | DB CHECK        |
| `budgets`          | unique (user, category, y, m) | DB UNIQUE INDEX |
| `budget_defaults`  | limit_amount >= 0             | DB CHECK        |
| `budget_defaults`  | unique (user, category)       | DB UNIQUE INDEX |
| `user_preferences` | month_start_day IN 1–28       | DB CHECK        |
| `user_preferences` | unique user_id                | DB UNIQUE       |

---

## Budget Period Date Range (consumed by FA-BUDG-002)

Given a budget for `(year, month)` and a user's `month_start_day = D`:

- **Period start**: `year-month-D` (e.g. 2026-05-15 for May 2026 with D=15)
- **Period end**: one calendar month later minus one day (e.g. 2026-06-14)
- **Special case D=1**: period is the full calendar month (2026-05-01 to 2026-05-31)
- This calculation lives entirely in FA-BUDG-002; this feature only stores D

---

## TypeScript Types

```typescript
// $inferSelect (read from DB — all fields present)
type Budget = {
  id;
  userId;
  categoryName;
  year;
  month;
  limitAmount;
  createdAt;
  updatedAt;
};
type BudgetDefault = {
  id;
  userId;
  categoryName;
  limitAmount;
  createdAt;
  updatedAt;
};
type UserPreferences = { id; userId; monthStartDay; createdAt; updatedAt };

// $inferInsert (write to DB — id/createdAt/updatedAt optional, default applied by DB)
type NewBudget = {
  userId;
  categoryName;
  year;
  month;
  limitAmount;
  id?;
  createdAt?;
  updatedAt?;
};
type NewBudgetDefault = {
  userId;
  categoryName;
  limitAmount;
  id?;
  createdAt?;
  updatedAt?;
};
type NewUserPreferences = {
  userId;
  monthStartDay?;
  id?;
  createdAt?;
  updatedAt?;
};
```

Note: Drizzle returns `numeric` columns as strings — always `parseFloat()` before arithmetic in FA-BUDG-002.
