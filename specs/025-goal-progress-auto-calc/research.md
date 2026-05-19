# Research: FA-GOAL-003 — Goal Progress Auto-Calculation

**Date**: 2026-05-19

## Decision Log

### D-001: Debt payoff baseline — use `targetAmount`, not a new column

- **Decision**: `targetAmount` on a debt payoff goal represents the total outstanding balance at goal creation. No `initialBalance` column is added.
- **Rationale**: The user sets `targetAmount` to the original debt when creating the goal; it already captures the baseline. Formula: `currentAmount = max(0, targetAmount - abs(balance))`.
- **Alternatives considered**: New `initialBalance` DB column — rejected (adds migration, duplicates `targetAmount` semantically for this goal type).

### D-002: Net worth — query assets/liabilities directly, not snapshot table

- **Decision**: Net worth milestone progress = `SUM(assets.value) - SUM(liabilities.value)` queried live.
- **Rationale**: `net_worth_snapshots` stores historical snapshots that may not yet include the current session's changes. Live query is always current.
- **Alternatives considered**: Latest snapshot row — rejected (may be stale within a session).

### D-003: Spending limit — UTC calendar month, negative amounts = expenses

- **Decision**: Filter `transactions.amount < 0 AND date >= first day of current UTC month`. `currentAmount = Math.abs(sum)`.
- **Rationale**: Transactions use negative values for expenses (confirmed in schema). UTC month boundaries are server-deterministic.
- **Alternatives considered**: User-timezone month — out of scope per spec.

### D-004: Recalculation strategy — synchronous, inline in request handler

- **Decision**: `recalculateUserGoals` is awaited inline in each affected route handler before the response.
- **Rationale**: Single-user app, small goal count, no background job infrastructure. Keeps the response always fresh in one round trip.
- **Alternatives considered**: Event queue / background worker — rejected per spec ("no background jobs").

### D-005: Terminal status guard — skip achieved/abandoned goals

- **Decision**: Goals with `status = 'achieved'` or `status = 'abandoned'` are skipped in recalculation. Their `currentAmount` and `status` are not modified.
- **Rationale**: Achieved and abandoned are terminal states. Recalculating them could cause confusing status flips (e.g., a debt that temporarily goes back up).
- **Alternatives considered**: Recalculate all goals — rejected (would overwrite terminal states).

### D-006: Spending limit — never auto-achieved

- **Decision**: Spending limit goals are never automatically set to `achieved` status, regardless of spend level.
- **Rationale**: Spending limits reset each month. "Achieved" would be meaningless (spending always resets to 0 next month). The spec explicitly states this.
- **Alternatives considered**: Auto-achieve when under limit at month end — rejected per spec.

## Codebase Findings

- `computeAccountBalance(accountId, userId, db)` exists at `src/server/utils/accountBalance.ts` — ready to reuse.
- `syncLinkedAssets(accountId, userId, db)` exists at `src/server/utils/syncLinkedAssets.ts` — shows the call pattern to follow in route handlers.
- `goals` schema already has `currentAmount` (nullable numeric), `categoryName`, `updatedAt`, `status`, `linkedAccountId` — **no migration needed**.
- `GoalCard.tsx` already handles `currentAmount == null` (shows placeholder), `isOverTarget` check (red fill), and `status === 'achieved'` badge — minimal changes needed.
- `transactions.amount` is stored as `numeric` (string in Drizzle); expense amounts are negative.
