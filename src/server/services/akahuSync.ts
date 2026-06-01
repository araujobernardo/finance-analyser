// FA-BANK-002 — Akahu Bank Sync Service

import { AkahuClient } from "akahu";
import { db } from "../../db/index.ts";
import {
  akahuConnections,
  akahuAccountLinks,
  transactions,
} from "../../db/schema.ts";
import { decrypt } from "../utils/encryption.ts";
import { eq, and, isNotNull } from "drizzle-orm";

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

  // Step 5 — upsert a row for every discovered Akahu account (FA-BANK-002)
  // This ensures accounts appear in the UI even before the user maps them to a
  // Finance Analyser account. Rows with no mapping have financeAccountId = null.
  for (const akahuAccount of akahuAccounts) {
    await db
      .insert(akahuAccountLinks)
      .values({
        userId,
        akahuAccountId: akahuAccount._id,
        financeAccountId: null,
        akahuAccountName: akahuAccount.name,
        akahuAccountType: akahuAccount.type ?? null,
        lastBalance:
          akahuAccount.balance?.current != null
            ? String(akahuAccount.balance.current)
            : null,
        syncStatus: "active",
      })
      .onConflictDoUpdate({
        target: [akahuAccountLinks.userId, akahuAccountLinks.akahuAccountId],
        set: {
          akahuAccountName: akahuAccount.name,
          akahuAccountType: akahuAccount.type ?? null,
          lastBalance:
            akahuAccount.balance?.current != null
              ? String(akahuAccount.balance.current)
              : null,
          updatedAt: new Date(),
        },
      });
  }

  // Step 6 — for each account link that has a financeAccountId, fetch and insert transactions.
  // Unlinked discovery rows (financeAccountId IS NULL) are skipped — no Finance Analyser
  // account to attach transactions to yet.
  const linkRows = await db
    .select()
    .from(akahuAccountLinks)
    .where(
      and(
        eq(akahuAccountLinks.userId, userId),
        isNotNull(akahuAccountLinks.financeAccountId),
      ),
    );

  let accountsSynced = 0;
  let transactionsAdded = 0;
  const errors: { accountId: string; error: string }[] = [];

  // Compute date range: last 12 months if never synced
  const now = new Date();

  for (const link of linkRows) {
    // Guard: skip if financeAccountId is null (filtered by query, but TS type is nullable)
    if (!link.financeAccountId) continue;
    const financeAccountId: string = link.financeAccountId;

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

      // Step 6d — fetch all transaction pages from Akahu.
      // The API returns small batches (paginated); we must follow cursor.next
      // until null to retrieve the full date range — otherwise only the first
      // page arrives and historical transactions are silently dropped.
      const txList: Awaited<
        ReturnType<typeof akahu.transactions.list>
      >["items"] = [];
      let cursor: string | null | undefined = undefined;
      do {
        const page = await akahu.transactions.list(userToken, {
          start,
          end,
          cursor,
        });
        txList.push(...(page.items ?? []));
        cursor = page.cursor.next;
      } while (cursor !== null);

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
              eq(transactions.accountId, financeAccountId),
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
          accountId: financeAccountId,
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
      // Find matching link for this Akahu account (linkRows only contains mapped accounts)
      const link = linkRows.find((l) => l.akahuAccountId === tx._account);
      if (!link || !link.financeAccountId) continue;
      const pendingFinanceAccountId: string = link.financeAccountId;

      const txDate = tx.date.split("T")[0] ?? tx.date;
      const txAmount = String(tx.amount);
      const txDesc = tx.description;

      // Dedup check
      const existing = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, pendingFinanceAccountId),
            eq(transactions.date, txDate),
            eq(transactions.description, txDesc),
          ),
        );

      if (existing.length > 0) continue;

      await db.insert(transactions).values({
        userId,
        accountId: pendingFinanceAccountId,
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
