# Implementation Plan: FA-BUDG-001 — Monthly Budget Data Model

**Branch**: `027-budget-data-model` | **Date**: 2026-05-19 | **Spec**: [spec.md](./spec.md)

## Summary

Adds three new database tables (`budgets`, `budget_defaults`, `user_preferences`) and their corresponding Drizzle ORM definitions and TypeScript types to `src/db/schema.ts`, plus a hand-written SQL migration file. No API endpoints, no UI, no calculation logic — data layer only. The next migration in sequence is `0007_budget_data_model.sql`.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Drizzle ORM, PostgreSQL
**Storage**: PostgreSQL via Drizzle ORM (same pattern as all existing tables)
**Testing**: Vitest — unit tests verifying constraint enforcement and CRUD via the Drizzle schema
**Target Platform**: Node.js server (Express) — server-side only; no frontend changes
**Project Type**: Full-stack web application (monorepo) — this feature touches `src/db/` only
**Performance Goals**: Schema-only change; no runtime performance impact
**Constraints**: Must use the hand-written migration pattern established by migrations 0004–0006; must not run `drizzle-kit generate` (project writes SQL migrations manually)
**Scale/Scope**: Single-user app; all tables are scoped to `userId`

---

## Constitution Check

| Rule                                         | Status                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| GR-1 — No assumption about product decisions | ✅ Spec and user input define all table names, columns, constraints, and defaults |
| GR-2 — No credentials/secrets exposed        | ✅ No new env vars or secrets                                                     |
| GR-3 — No localStorage schema changes        | ✅ Server-side DB schema only; no localStorage touched                            |
| GR-4 — Definition of Ready check             | ✅ Spec complete, all FRs and constraints defined                                 |
| GR-5 — Definition of Done check              | ✅ QA will verify before merge                                                    |
| GR-6 — When in doubt, do less                | ✅ No extra columns, indexes, or abstractions beyond what spec requires           |

No violations. No Complexity Tracking entries required.

---

## Project Structure

### Documentation (this feature)

```text
specs/027-budget-data-model/
├── plan.md              ← this file
├── data-model.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code Changes

```text
src/
└── db/
    ├── schema.ts                              ← MODIFY: add 3 table definitions + 6 type exports
    └── migrations/
        └── 0007_budget_data_model.sql         ← NEW: CREATE TABLE + FKs + unique indexes + CHECK constraints
```

No new directories. No frontend files. No route files. No utility files.

---

## Phase 0: Research

### Decision: Migration number is 0007

**Decision**: The next migration file is `0007_budget_data_model.sql`.

**Rationale**: Confirmed by listing `src/db/migrations/*.sql` — the current highest is `0006_auto_sync_flag.sql`. Sequential numbering gives `0007`.

**Alternatives considered**: None — numbering is deterministic.

### Decision: Hand-written SQL migration (no drizzle-kit generate)

**Decision**: Write the migration SQL manually, consistent with `0004_net_worth_snapshots.sql` through `0006_auto_sync_flag.sql`.

**Rationale**: All existing migrations in this project are hand-written. The `meta/` directory only has snapshots up to `0003`, confirming `drizzle-kit generate` has not been used since early in the project. Hand-writing ensures CHECK constraints can be included directly (Drizzle's schema DSL does not emit CHECK constraints in the TypeScript definitions, so they must live in the SQL migration).

**Alternatives considered**: `drizzle-kit generate` — rejected; breaks the established migration pattern and cannot emit CHECK constraints from the Drizzle schema DSL.

### Decision: CHECK constraints live in SQL migration only (not in schema.ts)

**Decision**: The `month` range (1–12), `limitAmount`/`defaultLimitAmount` non-negative (>= 0), and `monthStartDay` range (1–28) constraints are expressed as `CHECK` clauses in the SQL migration. The Drizzle `schema.ts` definitions do not duplicate them.

**Rationale**: Drizzle ORM's TypeScript DSL does not have a first-class `.check()` method for column-level CHECK constraints that maps to PostgreSQL CHECK. The constraints are enforced at the DB level where they count; the TypeScript types use plain `number` for these columns, which is correct.

**Alternatives considered**: Zod validation in route handlers — rejected for this feature; the spec says constraint enforcement is at the data layer. Zod validation is FA-BUDG-002's responsibility for the API boundary.

### Decision: `integer` must be added to schema.ts imports

**Decision**: Add `integer` to the import from `drizzle-orm/pg-core` in `src/db/schema.ts`. Currently imported: `boolean, date, index, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar`. `integer` is not currently in the list.

**Rationale**: The `year`, `month`, and `monthStartDay` columns use PostgreSQL `integer` type. Drizzle maps this via the `integer()` function from `drizzle-orm/pg-core`.

### Decision: `uniqueIndex` for multi-column uniqueness (consistent with netWorthSnapshots)

**Decision**: Use `uniqueIndex(name).on(col1, col2, ...)` for the composite unique constraints on `budgets` and `budget_defaults`, consistent with `netWorthSnapshots`'s `uniqueIndex("net_worth_snapshots_user_id_date_uniq")` pattern. For `user_preferences.userId`, use Drizzle's `.unique()` column modifier since it is a single-column unique constraint.

**Rationale**: Multi-column uniqueness requires the table-level `uniqueIndex` form. Single-column uniqueness on `userId` in `user_preferences` uses the column-level `.unique()` modifier, which is simpler and consistent with `users.email`.

### Decision: `userPreferences` row is created on demand (not pre-seeded)

**Decision**: The `user_preferences` table does not pre-populate a row for every user. A missing row is treated by FA-BUDG-002 as `monthStartDay = 1`. Insertion happens when the user first changes the setting.

**Rationale**: Simpler — avoids requiring a trigger or post-registration hook. The default of 1 matches the spec's FR-009 ("if not configured, treat as 1"). FA-BUDG-002 handles the lookup-with-fallback logic.

---

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md) for the entity description.

#### `budgets` table — Drizzle definition

```typescript
export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryName: varchar("category_name", { length: 100 }).notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    limitAmount: numeric("limit_amount", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userCategoryMonthUniq: uniqueIndex("budgets_user_category_month_uniq").on(
      table.userId,
      table.categoryName,
      table.year,
      table.month,
    ),
  }),
);
```

#### `budget_defaults` table — Drizzle definition

```typescript
export const budgetDefaults = pgTable(
  "budget_defaults",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryName: varchar("category_name", { length: 100 }).notNull(),
    limitAmount: numeric("limit_amount", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userCategoryUniq: uniqueIndex("budget_defaults_user_category_uniq").on(
      table.userId,
      table.categoryName,
    ),
  }),
);
```

#### `user_preferences` table — Drizzle definition

```typescript
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  monthStartDay: integer("month_start_day").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

#### TypeScript type exports (append to schema.ts)

```typescript
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type BudgetDefault = typeof budgetDefaults.$inferSelect;
export type NewBudgetDefault = typeof budgetDefaults.$inferInsert;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
```

### Migration SQL — `0007_budget_data_model.sql`

```sql
-- FA-BUDG-001: Monthly budget data model
-- Three new tables: budgets, budget_defaults, user_preferences
-- CHECK constraints enforce: month 1-12, limitAmount >= 0, monthStartDay 1-28

CREATE TABLE IF NOT EXISTS "budgets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "category_name" varchar(100) NOT NULL,
  "year" integer NOT NULL,
  "month" integer NOT NULL,
  "limit_amount" numeric(15, 2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "budgets_month_check" CHECK (month >= 1 AND month <= 12),
  CONSTRAINT "budgets_limit_amount_check" CHECK (limit_amount >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_defaults" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "category_name" varchar(100) NOT NULL,
  "limit_amount" numeric(15, 2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "budget_defaults_limit_amount_check" CHECK (limit_amount >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE,
  "month_start_day" integer NOT NULL DEFAULT 1,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_preferences_month_start_day_check" CHECK (month_start_day >= 1 AND month_start_day <= 28)
);
--> statement-breakpoint
ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "budget_defaults"
  ADD CONSTRAINT "budget_defaults_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_preferences"
  ADD CONSTRAINT "user_preferences_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_user_category_month_uniq"
  ON "budgets" ("user_id", "category_name", "year", "month");
--> statement-breakpoint
CREATE UNIQUE INDEX "budget_defaults_user_category_uniq"
  ON "budget_defaults" ("user_id", "category_name");
```

### API Contract

No new endpoints introduced by this feature. FA-BUDG-002 will introduce the HTTP API layer.

---

<!-- SPECKIT START -->

**Active feature plan**: [specs/027-budget-data-model/plan.md](specs/027-budget-data-model/plan.md)

<!-- SPECKIT END -->
