import type { PfaTxn } from "../types/pfa";

/**
 * Derive candidate transactions for transfer pairing.
 * Returns transactions that:
 *  - have the same date as the initiating transaction
 *  - have the same absolute amount
 *  - are not already flagged as transfers
 *  - are not the initiating transaction itself
 */
export function getCandidates(txns: PfaTxn[], initiatingId: string): PfaTxn[] {
  const initiating = txns.find((t) => t.id === initiatingId);
  if (!initiating) return [];
  return txns.filter(
    (t) =>
      t.id !== initiatingId &&
      t.date === initiating.date &&
      Math.abs(t.amount) === Math.abs(initiating.amount) &&
      !t.isTransfer,
  );
}

/**
 * Flag two transactions as a transfer pair.
 * Sets isTransfer: true, category: "Savings",
 * and stores the prior category in preFlagCategory.
 */
export function applyFlag(
  txns: PfaTxn[],
  initiatingId: string,
  candidateId: string,
): PfaTxn[] {
  return txns.map((t) => {
    if (t.id === initiatingId || t.id === candidateId) {
      return {
        ...t,
        preFlagCategory: t.category,
        category: "Savings",
        isTransfer: true,
      };
    }
    return t;
  });
}

/**
 * Un-flag a transfer transaction and its partner.
 * Restores category from preFlagCategory (or null for auto-detected).
 * Clears preFlagCategory.
 */
export function applyUnflag(txns: PfaTxn[], txnId: string): PfaTxn[] {
  const target = txns.find((t) => t.id === txnId);
  if (!target) return txns;

  // Find the partner: another isTransfer txn with same date and absolute amount
  const partner = txns.find(
    (t) =>
      t.id !== txnId &&
      t.isTransfer &&
      t.date === target.date &&
      Math.abs(t.amount) === Math.abs(target.amount),
  );

  const idsToUnflag = new Set([txnId, ...(partner ? [partner.id] : [])]);

  return txns.map((t) => {
    if (!idsToUnflag.has(t.id)) return t;
    const { preFlagCategory: _removed, ...rest } = t;
    void _removed; // explicitly discard
    return {
      ...rest,
      isTransfer: false,
      category: t.preFlagCategory ?? null,
      preFlagCategory: undefined,
    };
  });
}
