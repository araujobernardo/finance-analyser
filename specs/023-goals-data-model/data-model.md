# Data Model: Financial Goals (FA-GOAL-001)

## Migration

### File: `src/db/migrations/0005_goals_schema_complete.sql`

_(Rename to `0006_\*`if FA-NW-004 migration`0005*auto_sync_flag.sql` merges to main first.)*

```sql
ALTER TABLE goals
  ADD COLUMN category_name  varchar(100),
  ADD COLUMN current_amount numeric(15, 2),
  ADD COLUMN updated_at     timestamptz NOT NULL DEFAULT now();
```

**Constraints**:

- `category_name` — nullable; intended only for `spending_limit` goals, but not enforced at DB level
- `current_amount` — nullable; null means "not yet calculated"; populated by FA-GOAL-003
- `updated_at` — non-nullable with server-side default; consistent with `assets` and `liabilities` pattern

---

## Drizzle Schema (`src/db/schema.ts`)

### Updated `goals` table

```ts
export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  targetAmount: numeric("target_amount", { precision: 15, scale: 2 }).notNull(),
  targetDate: date("target_date"),
  linkedAccountId: uuid("linked_account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  categoryName: varchar("category_name", { length: 100 }), // NEW
  currentAmount: numeric("current_amount", { precision: 15, scale: 2 }), // NEW
  updatedAt: timestamp("updated_at", { withTimezone: true }) // NEW
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

### Inferred types (no manual change needed)

`Goal` and `NewGoal` are already exported via `$inferSelect` / `$inferInsert`. After the schema update they automatically gain:

```ts
// Goal (select)
categoryName: string | null
currentAmount: string | null   // Drizzle returns numeric as string
updatedAt: Date

// NewGoal (insert)
categoryName?: string | null
currentAmount?: string | null
updatedAt?: Date               // optional — DB DEFAULT applies
```

---

## Entity: Goal

| Column              | DB type       | Nullable | Default    | Notes                                                                       |
| ------------------- | ------------- | -------- | ---------- | --------------------------------------------------------------------------- |
| `id`                | uuid          | NO       | random     | PK                                                                          |
| `user_id`           | uuid          | NO       | —          | FK → users(id) CASCADE DELETE                                               |
| `name`              | varchar(100)  | NO       | —          | User-chosen label                                                           |
| `type`              | varchar(50)   | NO       | —          | `savings_target` / `debt_payoff` / `net_worth_milestone` / `spending_limit` |
| `target_amount`     | numeric(15,2) | NO       | —          | Target value in NZD                                                         |
| `target_date`       | date          | YES      | null       | Optional deadline                                                           |
| `linked_account_id` | uuid          | YES      | null       | FK → accounts(id) SET NULL                                                  |
| `status`            | varchar(20)   | NO       | `'active'` | `active` / `achieved` / `abandoned`                                         |
| `category_name`     | varchar(100)  | YES      | null       | Spending category for `spending_limit` type                                 |
| `current_amount`    | numeric(15,2) | YES      | null       | Cached progress — null until FA-GOAL-003 runs                               |
| `updated_at`        | timestamptz   | NO       | `now()`    | Last modified timestamp                                                     |
| `created_at`        | timestamptz   | NO       | `now()`    | Creation timestamp                                                          |

---

## State Transitions

```
Goal status machine:

  [Created]
      │
      ▼
   active ──── user marks achieved ────► achieved
      │
      └──── user marks abandoned ───────► abandoned
```

`achieved` and `abandoned` are terminal states. No transition back to `active` is defined at the data model level (FA-GOAL-002 may permit it via PATCH; that is out of scope here).

---

## Relationships

```
users (1) ──────────────── (0..N) goals
accounts (1) ────────────── (0..N) goals   [optional, SET NULL on account delete]
```

---

## Progress Calculation Support (for FA-GOAL-003)

Each goal type uses `current_amount` (cached) or derives it from other tables:

| Type                  | Progress source                                                  | Uses `linkedAccountId`? | Uses `categoryName`? |
| --------------------- | ---------------------------------------------------------------- | ----------------------- | -------------------- |
| `savings_target`      | SUM of transactions for linked account                           | YES                     | NO                   |
| `debt_payoff`         | ABS(SUM of transactions) for linked account                      | YES                     | NO                   |
| `net_worth_milestone` | Total net worth (assets − liabilities)                           | NO                      | NO                   |
| `spending_limit`      | SUM of transactions WHERE category = categoryName, current month | OPTIONAL                | YES                  |

All data required for these computations is now present in the `goals` table.
