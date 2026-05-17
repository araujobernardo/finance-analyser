// FA-NW-004 Foundation — sync linked assets/liabilities utility
// Server-side only — do not import from React components or Vite browser code.

import { and, eq, isNotNull } from "drizzle-orm";
import type { db as DbInstance } from "../../db/index.ts";
import { assets, liabilities } from "../../db/schema.ts";
import { computeAccountBalance } from "./accountBalance.ts";

type Db = typeof DbInstance;

/**
 * Finds all assets and liabilities linked to the given account whose
 * autoSync flag is true, recomputes the account balance, and writes the
 * updated value + balanceClamped back to the database.
 *
 * Asset clamping:  value = max(0, raw);  balanceClamped = raw < 0
 * Liability clamping: value = max(0, abs(raw));  balanceClamped = raw > 0
 */
export async function syncLinkedAssets(
  accountId: string,
  userId: string,
  db: Db,
): Promise<void> {
  const raw = await computeAccountBalance(accountId, userId, db);

  // Sync linked assets (savings/cheque accounts)
  const linkedAssets = await db
    .select({ id: assets.id })
    .from(assets)
    .where(
      and(
        eq(assets.userId, userId),
        eq(assets.linkedAccountId, accountId),
        eq(assets.autoSync, true),
        isNotNull(assets.linkedAccountId),
      ),
    );

  for (const asset of linkedAssets) {
    const value = Math.max(0, raw);
    const balanceClamped = raw < 0;
    await db
      .update(assets)
      .set({
        value: String(value),
        balanceClamped,
        updatedAt: new Date(),
      })
      .where(and(eq(assets.id, asset.id), eq(assets.userId, userId)));
  }

  // Sync linked liabilities (credit card accounts)
  const linkedLiabilities = await db
    .select({ id: liabilities.id })
    .from(liabilities)
    .where(
      and(
        eq(liabilities.userId, userId),
        eq(liabilities.linkedAccountId, accountId),
        eq(liabilities.autoSync, true),
        isNotNull(liabilities.linkedAccountId),
      ),
    );

  for (const liability of linkedLiabilities) {
    const value = Math.max(0, Math.abs(raw));
    const balanceClamped = raw > 0;
    await db
      .update(liabilities)
      .set({
        value: String(value),
        balanceClamped,
        updatedAt: new Date(),
      })
      .where(
        and(eq(liabilities.id, liability.id), eq(liabilities.userId, userId)),
      );
  }
}
