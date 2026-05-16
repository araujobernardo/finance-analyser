# Data Model: Net Worth Dashboard & History Snapshots

**Phase**: 1 — Design  
**Branch**: `021-net-worth-dashboard-history`  
**Date**: 2026-05-16

---

## New Entity: NetWorthSnapshot

### Purpose

A point-in-time record of the user's total assets, total liabilities, and computed net worth, taken at most once per calendar day (UTC). Used to populate the history chart on the Net Worth page.

### Database Table: `net_worth_snapshots`

| Column              | Type            | Constraints                              | Notes                                               |
| ------------------- | --------------- | ---------------------------------------- | --------------------------------------------------- |
| `id`                | `uuid`          | PK, `defaultRandom()`                    |                                                     |
| `user_id`           | `uuid`          | NOT NULL, FK → `users.id` CASCADE DELETE |                                                     |
| `total_assets`      | `numeric(15,2)` | NOT NULL                                 | Sum of all asset values at snapshot time            |
| `total_liabilities` | `numeric(15,2)` | NOT NULL                                 | Sum of all liability values at snapshot time        |
| `net_worth`         | `numeric(15,2)` | NOT NULL                                 | `total_assets - total_liabilities`; may be negative |
| `snapshot_date`     | `date`          | NOT NULL                                 | UTC date, `YYYY-MM-DD`                              |
| `created_at`        | `timestamptz`   | NOT NULL, `defaultNow()`                 |                                                     |

**Unique constraint**: `(user_id, snapshot_date)` — enforces at most one row per user per day at the DB level.

**Index**: The unique constraint itself provides an index on `(user_id, snapshot_date)`, covering the GET query's `WHERE user_id = $1 AND snapshot_date >= $2 ORDER BY snapshot_date ASC`.

### Drizzle Schema (src/db/schema.ts additions)

```typescript
import { uniqueIndex } from "drizzle-orm/pg-core";

export const netWorthSnapshots = pgTable(
  "net_worth_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    totalAssets: numeric("total_assets", { precision: 15, scale: 2 }).notNull(),
    totalLiabilities: numeric("total_liabilities", {
      precision: 15,
      scale: 2,
    }).notNull(),
    netWorth: numeric("net_worth", { precision: 15, scale: 2 }).notNull(),
    snapshotDate: date("snapshot_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userDateUniq: uniqueIndex("net_worth_snapshots_user_id_date_uniq").on(
      table.userId,
      table.snapshotDate,
    ),
  }),
);

export type NetWorthSnapshot = typeof netWorthSnapshots.$inferSelect;
export type NewNetWorthSnapshot = typeof netWorthSnapshots.$inferInsert;
```

### Migration: `0004_net_worth_snapshots.sql`

```sql
CREATE TABLE IF NOT EXISTS "net_worth_snapshots" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"           uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "total_assets"      numeric(15, 2) NOT NULL,
  "total_liabilities" numeric(15, 2) NOT NULL,
  "net_worth"         numeric(15, 2) NOT NULL,
  "snapshot_date"     date NOT NULL,
  "created_at"        timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "net_worth_snapshots_user_id_date_uniq"
  ON "net_worth_snapshots" ("user_id", "snapshot_date");
```

---

## Existing Entities (read-only for this feature)

### Asset

Already defined in `src/db/schema.ts`. Used on page mount to compute `totalAssets` passed to POST body. No schema changes.

### Liability

Already defined in `src/db/schema.ts`. Used on page mount to compute `totalLiabilities` passed to POST body. No schema changes.

---

## Frontend Type: ApiSnapshot

Defined in `src/types/api.ts`. All numeric fields are returned as strings by postgres-js and must be parsed with `parseFloat()` before charting.

```typescript
export interface ApiSnapshot {
  id: string;
  userId: string;
  totalAssets: string;
  totalLiabilities: string;
  netWorth: string;
  snapshotDate: string; // "YYYY-MM-DD"
  createdAt: string;
}
```

---

## Entity Relationships

```
users (existing)
  │
  └─< net_worth_snapshots  [1 user : many snapshots, max 1 per day]
```

No relationship to assets or liabilities tables — snapshot values are computed totals, not linked rows.
