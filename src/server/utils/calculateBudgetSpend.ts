// FA-BUDG-002 T002 — Budget spend calculation utility
// Server-side only — do not import from React components or Vite browser code.

import { and, eq, gte, lte, lt, sql } from "drizzle-orm";
import type { db as DbInstance } from "../../db/index.ts";
import { transactions } from "../../db/schema.ts";

type Db = typeof DbInstance;

/**
 * Returns the total spend (absolute value of negative transactions) for a given
 * user, category, and budget period. The budget period starts on `monthStartDay`
 * of the given year+month and ends on `monthStartDay - 1` of the following month.
 *
 * Only expense transactions (amount < 0, isTransfer = false) are counted.
 * Returns 0 when no matching transactions exist.
 */
export async function calculateBudgetSpend(
  userId: string,
  categoryName: string,
  year: number,
  month: number,
  monthStartDay: number,
  db: Db,
): Promise<number> {
  // startDate: e.g. 2026-05-15 for year=2026, month=5, monthStartDay=15
  // endDate:   e.g. 2026-06-14 — JS Date auto-overflows month boundaries
  const startDateObj = new Date(year, month - 1, monthStartDay);
  const endDateObj = new Date(year, month, monthStartDay - 1);

  // Format as YYYY-MM-DD strings for Drizzle date comparison
  const pad = (n: number) => String(n).padStart(2, "0");
  const startDate = `${startDateObj.getFullYear()}-${pad(startDateObj.getMonth() + 1)}-${pad(startDateObj.getDate())}`;
  const endDate = `${endDateObj.getFullYear()}-${pad(endDateObj.getMonth() + 1)}-${pad(endDateObj.getDate())}`;

  const [row] = await db
    .select({
      total: sql<string>`COALESCE(SUM(ABS(${transactions.amount})), '0')`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.category, categoryName),
        lt(transactions.amount, sql`0`),
        eq(transactions.isTransfer, false),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
      ),
    );

  return parseFloat(row?.total ?? "0");
}
