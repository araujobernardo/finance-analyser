// FA-BANK-018 — Shared auto-categorisation utility
//
// Extracts uncategorised, non-transfer transactions from the full transaction
// list, sends them to the categorisation service in batches, persists results
// via PATCH /api/transactions/:id, and calls the provided refetch callback so
// the UI reflects new categories without a manual reload.
//
// Called from:
//   - useAutoSync (chained after a successful bank sync)
//   - TransactionsPage "Auto-Categorise" button (manual trigger)

import type { ApiTransaction } from "../types/api";
import { categoriseTransactions } from "../services/categorisation";

export interface RunAutoCategoriseOptions {
  /** All transactions available in the current view / context. */
  transactions: ApiTransaction[];
  /** Authenticated fetch helper from useApi(). */
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>;
  /** Called after patches are applied so the UI refreshes. */
  refetch: () => Promise<void>;
  /** Called on non-fatal errors (e.g. after an auto-sync succeeds). */
  onError?: (message: string) => void;
}

export interface RunAutoCategoriseResult {
  /** Number of transactions that received a new category. */
  categorised: number;
  /** True when an error occurred during categorisation (onError was called). */
  hadError: boolean;
}

/**
 * Categorises all uncategorised, non-transfer transactions and persists the
 * results to the database.
 *
 * Throws only if a programming error makes it impossible to proceed.
 * API / categorisation failures are surfaced via `onError` so the caller
 * (e.g. auto-sync) can treat them as non-fatal.
 */
export async function runAutoCategorise(
  opts: RunAutoCategoriseOptions,
): Promise<RunAutoCategoriseResult> {
  const { transactions, apiFetch, refetch, onError } = opts;

  // Only process uncategorised, non-transfer transactions.
  const targets = transactions.filter(
    (t) => !t.isTransfer && (!t.category || t.category === ""),
  );

  if (targets.length === 0) {
    return { categorised: 0, hadError: false };
  }

  try {
    const results = await categoriseTransactions(
      targets.map((t) => ({
        date: new Date(t.date),
        description: t.description,
        amount: t.amount,
        category: undefined,
      })),
    );

    // Pair each result with its original transaction (same index).
    const patches = results
      .map((r, i) => ({ txnId: targets[i].id, category: r.category }))
      .filter((p) => p.category && p.category !== "Uncategorised");

    if (patches.length > 0) {
      await Promise.all(
        patches.map((p) =>
          apiFetch(`/api/transactions/${p.txnId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: p.category }),
          }),
        ),
      );
    }

    await refetch();
    return { categorised: patches.length, hadError: false };
  } catch (err) {
    console.error("[runAutoCategorise]", err);
    onError?.("Auto-categorisation failed — please try again.");
    return { categorised: 0, hadError: true };
  }
}
