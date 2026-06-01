// FA-GOAL-003 — Goal Progress Auto-Calculation utility
// Server-side only — do not import from React components or Vite browser code.
// FA-GOAL-003 T019 (Polish): tsc --noEmit exits 0, npm run lint exits 0, all tests pass.

import { and, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import type { db as DbInstance } from "../../db/index.ts";
import {
  goals,
  assets,
  liabilities,
  transactions,
  akahuAccountLinks,
} from "../../db/schema.ts";
import type { Goal } from "../../db/schema.ts";
import { computeAccountBalance } from "./accountBalance.ts";

type Db = typeof DbInstance;

/**
 * Recomputes the progress of a single goal and writes the result back to the
 * database.  Goals already in a terminal state ('achieved' or 'abandoned') are
 * skipped immediately — no DB write is performed.
 *
 * Supported types
 *   savings_target      — derives currentAmount from akahu_account_links.lastBalance
 *                         (balance-based, not income-flow). If no Akahu link with a
 *                         lastBalance exists for the linked account, the goal is left
 *                         unchanged (currentAmount stays null).
 *   debt_payoff         — derives currentAmount from computeAccountBalance (transaction sum)
 *   net_worth_milestone — derives currentAmount from total assets minus total liabilities
 *   spending_limit      — derives currentAmount from monthly spend in the goal category
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

      // Use lastBalance from akahu_account_links — balance-based progress, not income flow.
      // Only update if an Akahu link with a non-null lastBalance exists for this account.
      const [linkRow] = await db
        .select({ lastBalance: akahuAccountLinks.lastBalance })
        .from(akahuAccountLinks)
        .where(
          and(
            eq(akahuAccountLinks.financeAccountId, goal.linkedAccountId),
            eq(akahuAccountLinks.userId, userId),
            isNotNull(akahuAccountLinks.lastBalance),
          ),
        );

      if (!linkRow || linkRow.lastBalance == null) {
        // No Akahu link or balance not yet synced; leave goal unchanged
        return;
      }

      // Clamp negative balances to 0 (savings can't be negative)
      const rawBalance = parseFloat(linkRow.lastBalance);
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

      // debt_payoff uses transaction-sum balance
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

    case "spending_limit": {
      if (!goal.categoryName) {
        // Cannot compute spending without a category; leave goal unchanged
        return;
      }

      // First day of the current UTC calendar month as YYYY-MM-DD string
      const now = new Date();
      const firstOfMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;

      // Sum negative transactions (expenses) for this category this month
      const [spendRow] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${transactions.amount}), '0')`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.category, goal.categoryName),
            gte(transactions.date, firstOfMonth),
            lt(transactions.amount, sql`0`),
          ),
        );

      // spending is always positive (abs of negative sum)
      const currentAmount = Math.abs(parseFloat(spendRow?.total ?? "0"));

      // spending_limit is NEVER auto-achieved — status stays as-is
      await db
        .update(goals)
        .set({
          currentAmount: String(currentAmount),
          updatedAt: new Date(),
        })
        .where(and(eq(goals.id, goal.id), eq(goals.userId, userId)));

      break;
    }

    default:
      // Unknown goal type — leave goal unchanged
      break;
  }
}
