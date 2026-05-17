# Research: Financial Goals Data Model (FA-GOAL-001)

## Decision 1: Schema audit — existing vs. required columns

**Decision**: The existing `goals` table (from FA-INFRA-003) is missing three columns required by this spec. Add them via an additive-only migration.

| Column              | Existing?                                | Action                                 |
| ------------------- | ---------------------------------------- | -------------------------------------- |
| `id`                | ✅ uuid PK                               | No change                              |
| `user_id`           | ✅ FK → users, CASCADE                   | No change                              |
| `name`              | ✅ varchar(100) NOT NULL                 | No change                              |
| `type`              | ✅ varchar(50) NOT NULL                  | No change                              |
| `target_amount`     | ✅ numeric(15,2) NOT NULL                | No change                              |
| `target_date`       | ✅ date NULLABLE                         | No change                              |
| `linked_account_id` | ✅ FK → accounts, SET NULL               | No change                              |
| `status`            | ✅ varchar(20) NOT NULL DEFAULT 'active' | No change                              |
| `created_at`        | ✅ timestamptz NOT NULL DEFAULT now()    | No change                              |
| `category_name`     | ❌ missing                               | ADD varchar(100) NULLABLE              |
| `current_amount`    | ❌ missing                               | ADD numeric(15,2) NULLABLE             |
| `updated_at`        | ❌ missing                               | ADD timestamptz NOT NULL DEFAULT now() |

**Rationale**: All three missing columns are required by spec FR-006 (`categoryName`), FR-010 (`currentAmount` for cached progress), and FR-009 (`updatedAt`). Adding them is non-destructive since all are either nullable or have a DEFAULT.

---

## Decision 2: Migration number

**Decision**: Name the migration `0005_goals_schema_complete.sql`.

**Rationale**: The latest migration on `main` is `0004_net_worth_snapshots.sql`. The next available number is `0005`. FA-NW-004 (branch `022-auto-sync-bank-balances`) also targets `0005_auto_sync_flag.sql` but has not merged to `main` yet. If FA-NW-004 merges before FA-GOAL-001, the developer must rename this to `0006_goals_schema_complete.sql`.

**Alternatives considered**: Using a descriptive non-numeric name — rejected; the project convention is sequential numeric prefixes.

---

## Decision 3: `currentAmount` as a nullable cached field

**Decision**: `current_amount numeric(15,2) NULLABLE` — null until FA-GOAL-003 populates it; never treated as the authoritative progress value by this feature.

**Rationale**: Caching progress avoids recomputing on every page load. Storing it here is consistent with the `value` caching pattern in `assets` and `liabilities`. The field is null-safe: a null value means "not yet calculated", not "progress is zero".

**Alternatives considered**: Compute on demand in FA-GOAL-003 without a cached column — rejected per user requirement; the cache avoids per-page-load aggregation.

---

## Decision 4: `categoryName` as free-text, not a foreign key

**Decision**: `category_name varchar(100) NULLABLE` — stores the category name as free text matching the `category` field in the `transactions` table.

**Rationale**: The existing `transactions.category` is a free-text varchar with no categories table (categories are managed separately but stored as strings on transactions). A foreign key would require a categories FK that doesn't match the current schema pattern. Free-text is consistent with how categories are used throughout the app.

**Alternatives considered**: FK to the `categories` table — rejected; the transactions table stores category as varchar, not a FK, so matching that convention is correct.

---

## Decision 5: Status and type values — app-layer enforcement

**Decision**: Both `status` and `type` remain `varchar` (not DB-level enums), with valid values enforced at the application layer via Zod schemas in FA-GOAL-002.

**Rationale**: This matches the existing pattern in the codebase (e.g., `accounts.accountType` is a varchar enforced at the app layer). Changing to a Postgres enum would require a more complex migration and is not necessary given single-user scope.

**Valid status values**: `active`, `achieved`, `abandoned`
**Valid type values**: `savings_target`, `debt_payoff`, `net_worth_milestone`, `spending_limit`
