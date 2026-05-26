// FA-766 — Inter-account transfer heuristic detection
// Server-side only — do not import from React components or Vite browser code.
//
// After a batch of transactions is imported for an account, this utility scans
// the newly-inserted rows against all other accounts owned by the same user.
// Pairs where one side is a debit of amount X and the other is a credit of the
// same amount X within ±1 day are flagged as transfers on both sides.

import { and, eq, ne, sql } from "drizzle-orm";
import type { db as DbInstance } from "../../db/index.ts";
import { transactions } from "../../db/schema.ts";

type Db = typeof DbInstance;

/** Adds one calendar day to a YYYY-MM-DD string. */
function addDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Subtracts one calendar day from a YYYY-MM-DD string. */
function subtractDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Detects inter-account transfers among newly-imported transactions.
 *
 * For each transaction in `insertedIds`, looks for an existing transaction in a
 * different account (same user) whose amount is the exact negative mirror and
 * whose date is within ±1 day. When found, both records are updated to
 * `isTransfer = true`.
 *
 * Idempotent: already-flagged transactions are excluded from the search so
 * re-running on the same data produces the same result without extra DB writes.
 */
export async function detectTransfers(
  userId: string,
  accountId: string,
  insertedIds: string[],
  db: Db,
): Promise<void> {
  if (insertedIds.length === 0) return;

  // Fetch the newly-inserted rows so we know their amounts and dates.
  const newRows = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.accountId, accountId),
        eq(transactions.isTransfer, false),
        sql`${transactions.id} = ANY(${sql.raw(`ARRAY[${insertedIds.map((id) => `'${id}'`).join(",")}]::uuid[]`)})`,
      ),
    );

  for (const row of newRows) {
    const amount = parseFloat(row.amount);
    // The mirror amount is the exact negative — e.g. -100 matches +100.
    const mirrorAmount = -amount;
    const mirrorStr = mirrorAmount.toFixed(2);

    const dateStr = row.date; // YYYY-MM-DD string from Drizzle date column
    const dayBefore = subtractDay(dateStr);
    const dayAfter = addDay(dateStr);

    // Look for a transaction in a DIFFERENT account with the mirror amount
    // and a date within ±1 day that is not already flagged.
    const [match] = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          ne(transactions.accountId, accountId),
          eq(transactions.isTransfer, false),
          sql`${transactions.amount} = ${mirrorStr}::numeric`,
          sql`${transactions.date} BETWEEN ${dayBefore}::date AND ${dayAfter}::date`,
        ),
      )
      .limit(1);

    if (match) {
      // Flag both sides as transfers and clear any AI-assigned category so
      // "Transfer" (or any stale label) never shows in the category dropdown.
      await db
        .update(transactions)
        .set({ isTransfer: true, category: null })
        .where(
          sql`${transactions.id} IN (${sql.raw(`'${row.id}'::uuid, '${match.id}'::uuid`)})`,
        );
    }
  }
}
