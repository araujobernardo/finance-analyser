# Implementation Plan: FA-GOAL-003 — Goal Progress Auto-Calculation

**Branch**: `025-goal-progress-auto-calc` | **Date**: 2026-05-19 | **Spec**: [spec.md](./spec.md)

## Summary

Connects the goals system to live transaction and net worth data by introducing two server-side utilities — `calculateGoalProgress` and `recalculateUserGoals` — then wiring them into every route that mutates financial data. The `GoalCard` component receives minor CSS updates to support amber/red progress states for spending limit goals.

No schema migration is required: `goals.currentAmount`, `goals.categoryName`, and `goals.updatedAt` already exist (FA-GOAL-001). The `goals.targetAmount` field doubles as the initial debt amount for debt payoff goals.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Express, Drizzle ORM, Zod, React 18, Vitest
**Storage**: PostgreSQL (via Drizzle ORM)
**Testing**: Vitest (unit + component), Playwright (E2E for automatable scenarios)
**Target Platform**: Node.js server (Express) + Vite browser build
**Project Type**: Full-stack web application (monorepo — server in `src/server/`, frontend in `src/`)
**Performance Goals**: Goals page must feel instant — recalculation runs synchronously in the request handler, no background jobs
**Constraints**: All calculation triggered by user actions only. No scheduled jobs, no push notifications, no email alerts.
**Scale/Scope**: Single-user app; all queries are scoped to `userId`

---

## Constitution Check

| Rule                                         | Status                                                |
| -------------------------------------------- | ----------------------------------------------------- |
| GR-1 — No assumption about product decisions | ✅ Spec fully defines all four calculation rules      |
| GR-2 — No credentials/secrets exposed        | ✅ No new env vars or secrets                         |
| GR-3 — No localStorage schema changes        | ✅ Server-side only; no localStorage touched          |
| GR-4 — Definition of Ready check             | ✅ Spec complete, plan covers all acceptance criteria |
| GR-5 — Definition of Done check              | ✅ QA will verify before merge                        |
| GR-6 — When in doubt, do less                | ✅ No out-of-scope additions                          |

No violations. No Complexity Tracking entries required.

---

## Project Structure

### Documentation (this feature)

```text
specs/025-goal-progress-auto-calc/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code Changes

```text
src/
├── server/
│   ├── utils/
│   │   ├── calculateGoalProgress.ts     ← NEW: per-goal calculation logic
│   │   └── recalculateUserGoals.ts      ← NEW: batch orchestrator
│   └── routes/
│       ├── goals.ts                     ← MODIFY: GET recalculates before returning
│       ├── transactions.ts              ← MODIFY: POST/PATCH/DELETE trigger recalc
│       ├── assets.ts                    ← MODIFY: PATCH triggers recalc
│       └── liabilities.ts              ← MODIFY: PATCH triggers recalc
└── components/
    └── goals/
        ├── GoalCard.tsx                 ← MODIFY: amber/red progress bar for spending_limit
        └── GoalCard.css                 ← MODIFY: amber + red progress fill variants
```

No database migration required. All required columns already exist.

---

## Phase 0: Research

### Decision: Debt Payoff `initialBalance` — use `targetAmount` directly

**Decision**: `targetAmount` on a debt payoff goal represents the total outstanding debt at goal creation. No separate `initialBalance` column is needed.

**Rationale**: The spec says "Progress is how much the outstanding balance has been reduced from when the goal was created." Since the user sets `targetAmount` to the original debt when creating the goal, `targetAmount` already captures that baseline. `currentAmount = max(0, targetAmount - outstanding)`.

**Alternatives considered**: Adding a separate `initialBalance` column — rejected because it adds a migration and duplicates information already in `targetAmount`.

### Decision: Net worth computation — query assets/liabilities tables directly

**Decision**: The net worth milestone calculation queries `SUM(assets.value) - SUM(liabilities.value)` for the user, using the same Drizzle tables already used by the net worth route.

**Rationale**: The net worth snapshot table stores historical snapshots (not always current). A direct query of assets/liabilities gives the live figure without needing to trigger a snapshot write.

**Alternatives considered**: Reading from `net_worth_snapshots` — rejected because it may lag behind if the snapshot hasn't been written yet in the current session.

### Decision: Spending limit — expenses only, current calendar month

**Decision**: Spending limit sums `transactions.amount WHERE amount < 0 AND date >= first day of current UTC month AND category = goal.categoryName`. Result is `Math.abs(sum)`.

**Rationale**: Expenses are stored as negative amounts. Using the server's UTC clock for month boundaries is deterministic and consistent. User-timezone handling is out of scope for this feature.

**Alternatives considered**: Positive debit transactions — rejected because the existing transaction model uses negative amounts for expenses.

### Decision: Trigger recalculation synchronously in request handlers

**Decision**: `recalculateUserGoals` is called inline (awaited) in each affected route handler before the response is sent.

**Rationale**: Single-user app; goal count is small; sync calculation keeps the architecture simple without queues or background workers. Goals page always returns fresh data in a single round trip.

**Alternatives considered**: Background job / webhook — rejected per spec ("no background jobs").

---

## Phase 1: Design & Contracts

### Data Model

No schema migrations required. All fields exist:

| Column              | Table   | Purpose                                                                                    | Type            | Nullable                        |
| ------------------- | ------- | ------------------------------------------------------------------------------------------ | --------------- | ------------------------------- |
| `current_amount`    | `goals` | Calculated progress value written back after each recalculation                            | `numeric(15,2)` | Yes (null = not yet calculated) |
| `category_name`     | `goals` | Category filter for spending_limit goals                                                   | `varchar(100)`  | Yes                             |
| `status`            | `goals` | `active` / `achieved` / `abandoned`                                                        | `varchar(20)`   | No                              |
| `updated_at`        | `goals` | Timestamp of last recalculation write-back                                                 | `timestamp`     | No                              |
| `target_amount`     | `goals` | Target for savings/milestone; initial debt for debt_payoff; monthly cap for spending_limit | `numeric(15,2)` | No                              |
| `linked_account_id` | `goals` | Account linked to savings_target, debt_payoff, spending_limit goals                        | `uuid`          | Yes                             |

### Calculation Logic per Goal Type

#### `savings_target`

```
balance = computeAccountBalance(linkedAccountId, userId, db)
currentAmount = Math.max(0, balance)           // clamp negative balances to 0
newStatus = currentAmount >= targetAmount ? 'achieved' : existing
```

#### `debt_payoff`

```
balance = computeAccountBalance(linkedAccountId, userId, db)
outstanding = Math.abs(balance)                // credit card balances are negative
paid = Math.max(0, targetAmount - outstanding) // how much has been paid off
currentAmount = Math.min(paid, targetAmount)   // clamp to [0, targetAmount]
newStatus = outstanding <= 0 ? 'achieved' : existing
```

#### `net_worth_milestone`

```
assets  = SUM(assets.value) WHERE userId
liabs   = SUM(liabilities.value) WHERE userId
currentAmount = assets - liabs                 // can be negative — stored as-is
newStatus = currentAmount >= targetAmount ? 'achieved' : existing
```

#### `spending_limit`

```
firstOfMonth = first day of current UTC calendar month
spent = SUM(transactions.amount) WHERE userId AND category = goal.categoryName
        AND date >= firstOfMonth AND amount < 0
currentAmount = Math.abs(spent)               // always positive
// spending_limit is NEVER auto-achieved (monthly reset)
newStatus = existing
```

### Guard: terminal statuses are never overwritten

Goals with `status = 'achieved'` or `status = 'abandoned'` are skipped entirely during recalculation — their `currentAmount` and `status` are not modified.

### API Contract

No new endpoints. Existing `GET /api/goals` response shape is unchanged — `currentAmount` was already included as a nullable field. After this feature ships, `currentAmount` will always be populated for active goals that have the required linked data.

#### Modified behaviour

| Route                                               | Change                                                     |
| --------------------------------------------------- | ---------------------------------------------------------- |
| `GET /api/goals`                                    | Calls `recalculateUserGoals(userId, db)` before the SELECT |
| `POST /api/accounts/:accountId/transactions`        | Calls `recalculateUserGoals` after `syncLinkedAssets`      |
| `POST /api/accounts/:accountId/transactions/import` | Same                                                       |
| `PATCH /api/transactions/:id`                       | Calls `recalculateUserGoals` after the update              |
| `DELETE /api/transactions/:id`                      | Calls `recalculateUserGoals` after the delete              |
| `PATCH /api/assets/:id`                             | Calls `recalculateUserGoals` after the update              |
| `PATCH /api/liabilities/:id`                        | Calls `recalculateUserGoals` after the update              |

### Frontend Changes

| Component      | Change                                                                                                                                                                                          |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GoalCard.tsx` | Add `spending_limit` amber (>80%) and red (>100%) CSS class logic to progress fill; remove "Progress will update automatically" placeholder (will now always have data for active linked goals) |
| `GoalCard.css` | Add `.goal-card__progress-fill--warning` (amber) and keep `.goal-card__progress-fill--over` (red) variants                                                                                      |

The `GoalCard` already renders the "Achieved" status badge when `goal.status === 'achieved'`. No additional "banner" component is needed — the existing badge is sufficient.

---

<!-- SPECKIT START -->

**Active feature plan**: [specs/025-goal-progress-auto-calc/plan.md](specs/025-goal-progress-auto-calc/plan.md)

<!-- SPECKIT END -->
