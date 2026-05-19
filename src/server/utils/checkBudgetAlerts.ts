// FA-BUDG-003 T004 — Check which budget categories have exceeded the alert threshold
// Server-side only — do not import from React components or Vite browser code.

import { and, eq } from "drizzle-orm";
import type { db as DbInstance } from "../../db/index.ts";
import { budgets, userPreferences } from "../../db/schema.ts";
import { calculateBudgetSpend } from "./calculateBudgetSpend.ts";

type Db = typeof DbInstance;

export interface AlertedCategory {
  categoryName: string;
  limitAmount: number;
  actualSpend: number;
  percentageUsed: number;
}

/**
 * Returns the list of budget categories whose `percentageUsed` meets or
 * exceeds the user's `alertThreshold`.
 *
 * The current budget period is determined by `monthStartDay` and today's date:
 *   - If today's day-of-month >= monthStartDay → period started this calendar month
 *   - Otherwise → period started in the previous calendar month
 *
 * Returns [] when the user has no budgets or no categories exceed the threshold.
 */
export async function checkBudgetAlerts(
  userId: string,
  db: Db,
): Promise<AlertedCategory[]> {
  // Step 1: fetch user preferences (default alertThreshold=80, monthStartDay=1)
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId));

  const alertThreshold = prefs?.alertThreshold ?? 80;
  const monthStartDay = prefs?.monthStartDay ?? 1;

  // Step 2: determine current budget period year+month
  const today = new Date();
  let year: number;
  let month: number;

  if (today.getDate() >= monthStartDay) {
    year = today.getFullYear();
    month = today.getMonth() + 1;
  } else {
    // Step back one calendar month
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    year = prev.getFullYear();
    month = prev.getMonth() + 1;
  }

  // Step 3: fetch all budgets for (userId, year, month)
  const budgetRows = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.userId, userId),
        eq(budgets.year, year),
        eq(budgets.month, month),
      ),
    );

  if (budgetRows.length === 0) return [];

  // Step 4: compute percentageUsed for each row
  const alerted: AlertedCategory[] = [];

  for (const row of budgetRows) {
    const limitAmount = parseFloat(row.limitAmount);
    const actualSpend = await calculateBudgetSpend(
      userId,
      row.categoryName,
      year,
      month,
      monthStartDay,
      db,
    );

    let percentageUsed: number;
    if (limitAmount > 0) {
      percentageUsed = (actualSpend / limitAmount) * 100;
    } else if (actualSpend > 0) {
      percentageUsed = 100;
    } else {
      percentageUsed = 0;
    }

    if (percentageUsed >= alertThreshold) {
      alerted.push({
        categoryName: row.categoryName,
        limitAmount,
        actualSpend,
        percentageUsed,
      });
    }
  }

  return alerted;
}
