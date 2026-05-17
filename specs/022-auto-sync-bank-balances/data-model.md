# Data Model: Auto-Sync Bank Account Balances (FA-NW-004)

## Schema Changes

### Migration: `0005_auto_sync_flag.sql`

Two new columns added to `assets` and `liabilities`:

| Column            | Type      | Constraint | Default |
| ----------------- | --------- | ---------- | ------- |
| `auto_sync`       | `boolean` | `NOT NULL` | `true`  |
| `balance_clamped` | `boolean` | `NOT NULL` | `false` |

`auto_sync`: When `true`, the record's `value` is managed by the sync utility. When `false`, the user has overridden the value manually.

`balance_clamped`: Set to `true` by the sync utility when the raw computed balance was negative and was clamped to 0. Cleared to `false` on any sync that produces a non-negative result, and on manual override. Drives the amber warning indicator in the UI.

### Drizzle Schema (`src/db/schema.ts`) additions

```ts
// assets table — new fields
autoSync: boolean("auto_sync").notNull().default(true),
balanceClamped: boolean("balance_clamped").notNull().default(false),

// liabilities table — new fields
autoSync: boolean("auto_sync").notNull().default(true),
balanceClamped: boolean("balance_clamped").notNull().default(false),
```

### Updated inferred types

`Asset` and `Liability` gain two new boolean fields. `NewAsset` and `NewLiability` treat them as optional (Drizzle defaults apply).

---

## New Server Utilities

### `src/server/utils/accountBalance.ts`

```ts
computeAccountBalance(accountId: string, userId: string, db: DrizzleDB): Promise<number>
```

- Runs: `SELECT SUM(amount) FROM transactions WHERE account_id = $1 AND user_id = $2`
- Returns `parseFloat(result)` or `0` if no rows / NULL.
- Does **not** clamp — returns the raw signed sum.

### `src/server/utils/syncLinkedAssets.ts`

```ts
syncLinkedAssets(accountId: string, userId: string, db: DrizzleDB): Promise<void>
```

**Assets**: Finds all `assets` where `linkedAccountId = accountId AND userId = userId AND autoSync = true`.
For each:

- raw = `computeAccountBalance(accountId, userId, db)`
- value = `Math.max(0, raw)`
- clamped = `raw < 0`
- Updates `assets` row: `{ value: String(value), balanceClamped: clamped, updatedAt: new Date() }`

**Liabilities**: Finds all `liabilities` where `linkedAccountId = accountId AND userId = userId AND autoSync = true`.
For each:

- raw = `computeAccountBalance(accountId, userId, db)`
- value = `Math.max(0, Math.abs(raw))`
- clamped = `Math.abs(raw) !== value` (i.e. raw was positive, meaning credit card was in credit — unusual, clamp to 0)
- Updates `liabilities` row: `{ value: String(value), balanceClamped: clamped, updatedAt: new Date() }`

Note: `computeAccountBalance` is called once per linked record's `accountId`. If multiple assets/liabilities share the same `accountId`, the aggregate is re-used (can be memoised within a single `syncLinkedAssets` call).

---

## Entity State Transitions

```
Asset / Liability autoSync state machine:

  [Created]
      │ linkedAccountId set
      ▼
  autoSync=true ◄──────────────────────────────┐
  value=computed                               │
  balanceClamped=true/false                    │ User clicks
      │                                        │ "Re-enable auto-sync"
      │ User edits value                       │ (PATCH { autoSync: true })
      ▼                                        │
  autoSync=false ──────────────────────────────┘
  value=user-entered
  balanceClamped=false
```

---

## API Contract Changes Summary

(Full contracts in `contracts/api.md`)

| Endpoint                     | Change                                                        |
| ---------------------------- | ------------------------------------------------------------- |
| `GET /api/assets`            | Response includes `autoSync`, `balanceClamped`                |
| `GET /api/liabilities`       | Response includes `autoSync`, `balanceClamped`                |
| `PATCH /api/assets/:id`      | Accepts `autoSync: boolean`; `value` implies `autoSync=false` |
| `PATCH /api/liabilities/:id` | Same as above                                                 |
| `POST /api/assets`           | No change (new assets get `autoSync=true` by default)         |
| `POST /api/liabilities`      | No change                                                     |
| Transaction mutations (4)    | Each triggers `syncLinkedAssets` after DB write               |
