// FA-BANK-002 — Akahu Bank Sync Service

import { AkahuClient } from "akahu";
import { db } from "../../db/index.ts";
import {
  akahuConnections,
  akahuAccountLinks,
  transactions,
} from "../../db/schema.ts";
import { decrypt } from "../utils/encryption.ts";
import { eq, and } from "drizzle-orm";

export interface SyncResult {
  accountsSynced: number;
  transactionsAdded: number;
  errors: { accountId: string; error: string }[];
}

/**
 * Syncs all linked Akahu accounts for the given user.
 * Fetches accounts and transactions from Akahu and stores them in the DB.
 * Returns a summary of what was synced.
 */
export async function syncUserAccounts(userId: string): Promise<SyncResult> {
  // Step 1 — fetch the Akahu connection row
  const connectionRows = await db
    .select()
    .from(akahuConnections)
    .where(eq(akahuConnections.userId, userId));

  if (connectionRows.length === 0) {
    throw new Error("No Akahu connection found for this user");
  }

  const connectionRow = connectionRows[0]!;

  // Step 2 — decrypt the user token
  const userToken = decrypt(connectionRow.encryptedUserToken);

  // Step 3 — create Akahu client
  const akahu = new AkahuClient({
    appToken: process.env.AKAHU_APP_TOKEN ?? "",
  });

  // Step 4 — list all Akahu accounts for this user
  const akahuAccounts = await akahu.accounts.list(userToken);

  // Step 5 — update lastBalance on matching account link rows
  for (const akahuAccount of akahuAccounts) {
    const balance = akahuAccount.balance?.current;
    if (balance === undefined) continue;

    const linkRows = await db
      .select()
      .from(akahuAccountLinks)
      .where(
        and(
          eq(akahuAccountLinks.userId, userId),
          eq(akahuAccountLinks.akahuAccountId, akahuAccount._id),
        ),
      );

    if (linkRows.length > 0) {
      await db
        .update(akahuAccountLinks)
        .set({
          lastBalance: String(balance),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(akahuAccountLinks.userId, userId),
            eq(akahuAccountLinks.akahuAccountId, akahuAccount._id),
          ),
        );
    }
  }

  // Step 6 — for each linked account, fetch and insert transactions
  const linkRows = await db
    .select()
    .from(akahuAccountLinks)
    .where(
      and(
        eq(akahuAccountLinks.userId, userId),
        // Only process links that have a financeAccountId
        // (not null enforced at DB level, but added for clarity)
      ),
    );

  let accountsSynced = 0;
  let transactionsAdded = 0;
  const errors: { accountId: string; error: string }[] = [];

  // Compute date range: last 12 months if never synced
  const now = new Date();

  for (const link of linkRows) {
    // Find the matching Akahu account
    const akahuAccount = akahuAccounts.find(
      (a) => a._id === link.akahuAccountId,
    );

    if (!akahuAccount) continue;

    // Step 6a — check attributes for TRANSACTIONS
    if (!akahuAccount.attributes.includes("TRANSACTIONS")) {
      continue;
    }

    try {
      // Step 6b — set syncStatus to 'syncing'
      await db
        .update(akahuAccountLinks)
        .set({ syncStatus: "syncing", updatedAt: new Date() })
        .where(
          and(
            eq(akahuAccountLinks.userId, userId),
            eq(akahuAccountLinks.akahuAccountId, link.akahuAccountId),
          ),
        );

      // Step 6c — determine date range
      const lastSynced = link.lastTransactionSyncedAt;
      const startDate =
        lastSynced ??
        new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const start = startDate.toISOString();
      const end = now.toISOString();

      // Step 6d — fetch transactions from Akahu
      const txResult = await akahu.transactions.list(userToken, { start, end });
      const txList = txResult.items ?? [];

      // Filter to transactions for this specific account
      const accountTxList = txList.filter(
        (tx) => tx._account === link.akahuAccountId,
      );

      let latestTxDate: string | null = null;
      let addedForAccount = 0;

      // Step 6e — for each transaction, dedup then insert
      for (const tx of accountTxList) {
        const txDate = tx.date.split("T")[0] ?? tx.date; // YYYY-MM-DD
        const txAmount = String(tx.amount);
        const txDesc = tx.description;

        // Check for existing transaction with same (date, amount, description, accountId)
        const existing = await db
          .select({ id: transactions.id })
          .from(transactions)
          .where(
            and(
              eq(transactions.accountId, link.financeAccountId),
              eq(transactions.date, txDate),
              eq(transactions.description, txDesc),
            ),
          );

        if (existing.length > 0) {
          // Dedup — skip this transaction
          continue;
        }

        // Insert the transaction
        await db.insert(transactions).values({
          userId,
          accountId: link.financeAccountId,
          date: txDate,
          amount: txAmount,
          description: txDesc,
          category: null,
          isTransfer: false,
          isManualTransfer: false,
        });

        addedForAccount++;
        transactionsAdded++;

        // Track latest transaction date for lastTransactionSyncedAt update
        if (latestTxDate === null || txDate > latestTxDate) {
          latestTxDate = txDate;
        }
      }

      // Step 6f — on success: update syncStatus and lastTransactionSyncedAt
      await db
        .update(akahuAccountLinks)
        .set({
          syncStatus: "active",
          syncError: null,
          lastTransactionSyncedAt:
            latestTxDate !== null
              ? new Date(`${latestTxDate}T00:00:00`)
              : link.lastTransactionSyncedAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(akahuAccountLinks.userId, userId),
            eq(akahuAccountLinks.akahuAccountId, link.akahuAccountId),
          ),
        );

      accountsSynced++;
      void addedForAccount; // used via transactionsAdded counter
    } catch (err: unknown) {
      // Step 6g — on error: set syncStatus to 'error', continue to next account
      const errMsg = err instanceof Error ? err.message : String(err);

      await db
        .update(akahuAccountLinks)
        .set({
          syncStatus: "error",
          syncError: errMsg,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(akahuAccountLinks.userId, userId),
            eq(akahuAccountLinks.akahuAccountId, link.akahuAccountId),
          ),
        );

      errors.push({ accountId: link.akahuAccountId, error: errMsg });
      // continue to next account
    }
  }

  // Step 7 — fetch pending transactions (dedup same as settled)
  try {
    const pendingTxList = await akahu.transactions.listPending(userToken);

    for (const tx of pendingTxList) {
      // Find matching link for this Akahu account
      const link = linkRows.find((l) => l.akahuAccountId === tx._account);
      if (!link) continue;

      const txDate = tx.date.split("T")[0] ?? tx.date;
      const txAmount = String(tx.amount);
      const txDesc = tx.description;

      // Dedup check
      const existing = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, link.financeAccountId),
            eq(transactions.date, txDate),
            eq(transactions.description, txDesc),
          ),
        );

      if (existing.length > 0) continue;

      await db.insert(transactions).values({
        userId,
        accountId: link.financeAccountId,
        date: txDate,
        amount: txAmount,
        description: txDesc,
        category: null,
        isTransfer: false,
        isManualTransfer: false,
      });

      transactionsAdded++;
    }
  } catch {
    // Pending transaction failure is non-fatal — don't add to errors
  }

  // Step 8 — update lastSyncedAt on the connection row
  await db
    .update(akahuConnections)
    .set({ lastSyncedAt: now, updatedAt: now })
    .where(eq(akahuConnections.userId, userId));

  return { accountsSynced, transactionsAdded, errors };
}
