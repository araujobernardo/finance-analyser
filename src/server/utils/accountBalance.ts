// FA-NW-004 Foundation — balance computation utility
// Server-side only — do not import from React components or Vite browser code.

import { and, eq, sql } from "drizzle-orm";
import type { db as DbInstance } from "../../db/index.ts";
import { transactions } from "../../db/schema.ts";

type Db = typeof DbInstance;

/**
 * Returns the sum of all transaction amounts for the given account and user.
 * Returns 0 when there are no transactions (COALESCE handles NULL).
 */
export async function computeAccountBalance(
  accountId: string,
  userId: string,
  db: Db,
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${transactions.amount}), '0')`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.accountId, accountId),
        eq(transactions.userId, userId),
      ),
    );
  return parseFloat(row?.total ?? "0");
}
