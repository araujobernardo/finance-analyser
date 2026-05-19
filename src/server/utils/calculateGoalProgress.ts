// FA-GOAL-003 — Goal Progress Auto-Calculation utility
// Server-side only — do not import from React components or Vite browser code.

import { and, eq, sql } from "drizzle-orm";
import type { db as DbInstance } from "../../db/index.ts";
import { goals, assets, liabilities } from "../../db/schema.ts";
import type { Goal } from "../../db/schema.ts";
import { computeAccountBalance } from "./accountBalance.ts";

type Db = typeof DbInstance;

/**
 * Recomputes the progress of a single goal and writes the result back to the
 * database.  Goals already in a terminal state ('achieved' or 'abandoned') are
 * skipped immediately — no DB write is performed.
 *
 * Supported types
 *   savings_target      — derives currentAmount from the linked account balance
 *   debt_payoff         — stub, no-op until a later task
 *   net_worth_milestone — stub, no-op until a later task
 *   spending_limit      — stub, no-op until a later task
 */
export async function calculateGoalProgress(
  goal: Goal,
  db: Db,
  userId: string,
): Promise<void> {
  // Terminal-status guard — skip without any DB write
  if (goal.status === "achieved" || goal.status === "abandoned") {
    return;
  }

  switch (goal.type) {
    case "savings_target": {
      if (!goal.linkedAccountId) {
        // Cannot compute balance without a linked account; leave goal unchanged
        return;
      }

      const rawBalance = await computeAccountBalance(
        goal.linkedAccountId,
        userId,
        db,
      );

      // Clamp negative balances to 0 (savings can't be negative)
      const currentAmount = Math.max(0, rawBalance);

      const targetAmount = parseFloat(goal.targetAmount);
      const newStatus =
        currentAmount >= targetAmount ? "achieved" : goal.status;

      await db
        .update(goals)
        .set({
          currentAmount: String(currentAmount),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(goals.id, goal.id), eq(goals.userId, userId)));

      break;
    }

    case "debt_payoff": {
      if (!goal.linkedAccountId) {
        // Cannot compute outstanding balance without a linked account; leave goal unchanged
        return;
      }

      const rawBalance = await computeAccountBalance(
        goal.linkedAccountId,
        userId,
        db,
      );

      // Credit card balances are negative in the system; take the absolute value
      // to get the outstanding debt amount.
      const outstanding = Math.abs(rawBalance);
      const targetAmount = parseFloat(goal.targetAmount);

      // Auto-achieve when the debt is fully paid off
      const newStatus = outstanding <= 0 ? "achieved" : goal.status;

      // currentAmount represents how much has been paid off.
      // paid = targetAmount - outstanding (how much debt has been cleared).
      // Clamp to [0, targetAmount]: if the debt has grown beyond the initial
      // target, paid is negative — clamp to 0.
      const paid = targetAmount - outstanding;
      const currentAmount = Math.min(Math.max(0, paid), targetAmount);

      await db
        .update(goals)
        .set({
          currentAmount: String(currentAmount),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(goals.id, goal.id), eq(goals.userId, userId)));

      break;
    }

    case "net_worth_milestone": {
      // Query total assets and liabilities for the user (no linkedAccountId needed)
      const [assetsRow] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${assets.value}), '0')`,
        })
        .from(assets)
        .where(eq(assets.userId, userId));

      const [liabsRow] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${liabilities.value}), '0')`,
        })
        .from(liabilities)
        .where(eq(liabilities.userId, userId));

      const assetsTotal = parseFloat(assetsRow?.total ?? "0");
      const liabsTotal = parseFloat(liabsRow?.total ?? "0");

      // currentAmount = net worth (can be negative — store as-is, no clamping)
      const currentAmount = assetsTotal - liabsTotal;
      const targetAmount = parseFloat(goal.targetAmount);
      const newStatus =
        currentAmount >= targetAmount ? "achieved" : goal.status;

      await db
        .update(goals)
        .set({
          currentAmount: String(currentAmount),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(and(eq(goals.id, goal.id), eq(goals.userId, userId)));

      break;
    }

    case "spending_limit":
      // No-op — will be implemented in a later task
      break;

    default:
      // Unknown goal type — leave goal unchanged
      break;
  }
}
