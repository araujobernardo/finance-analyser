import { useState, useEffect, useCallback } from "react";
import { ACCOUNT_COLORS } from "../constants/colors";
import type { ApiTransaction } from "../types/api";
import { getCandidates } from "../utils/transferFlagging";
import { fmt, fmtMonth, getCatColor } from "../utils/transactionFormatters";
import { useAccount, useAllTransactions } from "../context/AccountContext";
import { useApi } from "../lib/api";
import "./TransactionsPage.css";

// ── Local adapter type ────────────────────────────────────────────────────────
// Minimal shape used by transferFlagging utilities and the render layer.
// Structurally compatible with PfaTxn but derived from ApiTransaction.

interface AdaptedTxn {
  id: string;
  date: string;
  month: string;
  type: string;
  payee: string;
  memo: string;
  amount: number;
  isCredit: boolean;
  account: string;
  accountShort: string;
  category: string | null;
  isTransfer: boolean;
  preFlagCategory?: string | null;
  // index signature required for structural compatibility with TxnForFlagging
  [key: string]: unknown;
}

function adaptTxn(t: ApiTransaction, nickname: string): AdaptedTxn {
  return {
    id: t.id,
    date: t.date,
    month: t.date.slice(0, 7),
    type: "",
    payee: t.description,
    memo: "",
    amount: t.amount,
    isCredit: t.amount > 0,
    account: nickname,
    accountShort: t.accountId,
    category: t.category,
    isTransfer: t.isTransfer,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TransactionsPage() {
  const { accounts, refetch } = useAccount();
  const { apiFetch } = useApi();
  const rawTransactions = useAllTransactions();

  // ── Adapt API transactions to local display shape ──────────────────────────
  const nicknameById = new Map(accounts.map((a) => [a.id, a.nickname]));
  const adapted = rawTransactions.map((t) =>
    adaptTxn(t, nicknameById.get(t.accountId) ?? t.accountId),
  );

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [showTransfers, setShowTransfers] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // ── Categories from API ────────────────────────────────────────────────────
  const [apiCategories, setApiCategories] = useState<string[]>([]);
  useEffect(() => {
    void apiFetch("/api/categories")
      .then((res) => res.json())
      .then((data: { categories: Array<{ name: string }> }) => {
        setApiCategories(data.categories.map((c) => c.name).sort());
      })
      .catch(() => {});
  }, [apiFetch]);

  // ── Transfer flagging local state ─────────────────────────────────────────
  // preFlagMap: txnId → category that was set before manual transfer flagging
  const [preFlagMap, setPreFlagMap] = useState<Map<string, string | null>>(
    new Map(),
  );
  // Local overrides: txnId → { isTransfer, category } applied on top of API data
  const [localIsTransfer, setLocalIsTransfer] = useState<Map<string, boolean>>(
    new Map(),
  );
  const [localCategory, setLocalCategory] = useState<
    Map<string, string | null>
  >(new Map());

  // ── Apply local overrides ─────────────────────────────────────────────────
  const txns: AdaptedTxn[] = adapted.map((t) => ({
    ...t,
    isTransfer: localIsTransfer.has(t.id)
      ? (localIsTransfer.get(t.id) as boolean)
      : t.isTransfer,
    category: localCategory.has(t.id)
      ? (localCategory.get(t.id) as string | null)
      : t.category,
  }));

  // ── Derived filter values ──────────────────────────────────────────────────
  const months = [...new Set(txns.map((t) => t.month))].sort().reverse();
  const uniqueAccounts = [...new Set(accounts.map((a) => a.nickname))];

  // Categories come from GET /api/categories — the single source of truth
  const uniqueCategories = apiCategories;

  // ── Transfer flagging interaction state ────────────────────────────────────
  const [flagMode, setFlagMode] = useState<{ initiatingId: string } | null>(
    null,
  );
  const [unflagTarget, setUnflagTarget] = useState<{ txnId: string } | null>(
    null,
  );

  // Candidates for current flag mode
  const candidates = flagMode ? getCandidates(txns, flagMode.initiatingId) : [];
  const candidateIds = new Set(candidates.map((c) => c.id));

  // Dismiss flagging mode / unflag panel on Escape
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (flagMode) setFlagMode(null);
        if (unflagTarget) setUnflagTarget(null);
      }
    },
    [flagMode, unflagTarget],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleEscape]);

  // ── Filtered and sorted transaction list ───────────────────────────────────
  const filtered = txns
    .filter((t) => {
      if (!showTransfers && t.isTransfer) return false;
      if (filterMonth !== "all" && t.month !== filterMonth) return false;
      if (filterAccount !== "all" && t.account !== filterAccount) return false;
      if (filterCat === "__uncategorised__") {
        if (t.isTransfer) return false;
        if (t.category) return false;
      } else if (filterCat !== "all" && t.category !== filterCat) {
        return false;
      }
      const q = search.toLowerCase();
      if (
        q &&
        !t.payee.toLowerCase().includes(q) &&
        !t.memo.toLowerCase().includes(q)
      )
        return false;
      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  // ── Category change handler — persists to DB via PATCH /api/transactions/:id ──
  const handleCategoryChange = (id: string, cat: string) => {
    const source = txns.find((t) => t.id === id);
    if (!source) return;
    const payee = source.payee.toLowerCase();

    // Collect all transactions matching this payee (bulk rule).
    const matchedIds: string[] = [];
    txns.forEach((t) => {
      if (t.isTransfer) return;
      const tp = t.payee.toLowerCase();
      if (tp.includes(payee) || payee.includes(tp)) {
        matchedIds.push(t.id);
      }
    });

    // Optimistic update — apply immediately before API calls complete.
    const previousCategory = new Map(localCategory);
    const newLocalCategory = new Map(localCategory);
    matchedIds.forEach((tid) => newLocalCategory.set(tid, cat));
    setLocalCategory(newLocalCategory);

    if (matchedIds.length > 1) {
      setToast(
        `Updated ${matchedIds.length} transactions matching "${source.payee}"`,
      );
      setTimeout(() => setToast(null), 4000);
    }

    // Persist each matched transaction to the DB.
    void (async () => {
      try {
        const results = await Promise.all(
          matchedIds.map((tid) =>
            apiFetch(`/api/transactions/${tid}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ category: cat }),
            }),
          ),
        );
        const anyFailed = results.some((r) => !r.ok);
        if (anyFailed) {
          throw new Error("One or more PATCH requests failed");
        }
        // Sync server state so the category survives a full page refresh.
        await refetch();
      } catch {
        // Revert optimistic update on any error.
        setLocalCategory(previousCategory);
        setToast("Failed to save category — please try again.");
        setTimeout(() => setToast(null), 4000);
      }
    })();
  };

  // ── Transfer flagging handlers ─────────────────────────────────────────────

  const handleNonTransferRowClick = (txnId: string) => {
    if (unflagTarget) return;

    if (!flagMode) {
      setFlagMode({ initiatingId: txnId });
      return;
    }

    if (candidateIds.has(txnId)) {
      // Flag the pair: set isTransfer=true, category="Savings", store preFlagCategory
      const initiatingTxn = txns.find((t) => t.id === flagMode.initiatingId);
      const candidateTxn = txns.find((t) => t.id === txnId);

      const newIsTransfer = new Map(localIsTransfer);
      const newCategory = new Map(localCategory);
      const newPreFlagMap = new Map(preFlagMap);

      if (initiatingTxn) {
        newPreFlagMap.set(initiatingTxn.id, initiatingTxn.category);
        newIsTransfer.set(initiatingTxn.id, true);
        newCategory.set(initiatingTxn.id, "Savings");
      }
      if (candidateTxn) {
        newPreFlagMap.set(candidateTxn.id, candidateTxn.category);
        newIsTransfer.set(candidateTxn.id, true);
        newCategory.set(candidateTxn.id, "Savings");
      }

      setPreFlagMap(newPreFlagMap);
      setLocalIsTransfer(newIsTransfer);
      setLocalCategory(newCategory);
      setFlagMode(null);
      setToast("Transfer pair flagged.");
      setTimeout(() => setToast(null), 4000);
    } else {
      setFlagMode(null);
    }
  };

  const handleTransferRowClick = (txnId: string) => {
    if (flagMode) {
      setFlagMode(null);
      return;
    }
    setUnflagTarget({ txnId });
  };

  const handleUnflagConfirm = () => {
    if (!unflagTarget) return;
    const target = txns.find((t) => t.id === unflagTarget.txnId);
    if (!target) {
      setUnflagTarget(null);
      return;
    }

    // Find the partner: another isTransfer txn with same date and absolute amount
    const partner = txns.find(
      (t) =>
        t.id !== unflagTarget.txnId &&
        t.isTransfer &&
        t.date === target.date &&
        Math.abs(t.amount) === Math.abs(target.amount),
    );

    const idsToUnflag = new Set([
      unflagTarget.txnId,
      ...(partner ? [partner.id] : []),
    ]);

    const newIsTransfer = new Map(localIsTransfer);
    const newCategory = new Map(localCategory);
    const newPreFlagMap = new Map(preFlagMap);

    idsToUnflag.forEach((id) => {
      newIsTransfer.set(id, false);
      // Restore pre-flag category (or null for auto-detected transfers)
      newCategory.set(id, newPreFlagMap.get(id) ?? null);
      newPreFlagMap.delete(id);
    });

    setPreFlagMap(newPreFlagMap);
    setLocalIsTransfer(newIsTransfer);
    setLocalCategory(newCategory);
    setUnflagTarget(null);
    setToast("Transfer pair un-flagged.");
    setTimeout(() => setToast(null), 4000);
  };

  const initiatingTxn = flagMode
    ? txns.find((t) => t.id === flagMode.initiatingId)
    : null;

  // ── Empty state ────────────────────────────────────────────────────────────
  if (txns.length === 0) {
    return (
      <div className="txn-page">
        <div className="txn-header">
          <h1 className="txn-title">Transactions</h1>
        </div>
        <div className="txn-empty" data-testid="txn-empty-state">
          No transactions yet. Upload your bank CSV exports using the sidebar.
        </div>
      </div>
    );
  }

  return (
    <div className="txn-page">
      <div className="txn-header">
        <h1 className="txn-title">Transactions</h1>
        <div className="txn-filters">
          <input
            className="txn-input"
            placeholder="Search payee / memo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="txn-select"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          >
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {fmtMonth(m)}
              </option>
            ))}
          </select>
          {uniqueAccounts.length > 1 && (
            <select
              className="txn-select"
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
            >
              <option value="all">All accounts</option>
              {uniqueAccounts.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
          <select
            className="txn-select"
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
          >
            <option value="all">All categories</option>
            <option value="__uncategorised__">Uncategorised</option>
            {uniqueCategories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <label className="txn-transfers-label">
            <input
              type="checkbox"
              checked={showTransfers}
              onChange={(e) => setShowTransfers(e.target.checked)}
              style={{ accentColor: "var(--accent)" }}
              data-testid="show-transfers"
            />
            Show transfers
          </label>
          <span className="txn-row-count" data-testid="txn-row-count">
            {filtered.length} rows
          </span>
        </div>
        {toast && <div className="txn-toast">&#10003; {toast}</div>}
      </div>

      {/* Flag mode banner */}
      {flagMode && (
        <div
          className={`txn-flag-banner${candidates.length === 0 ? " txn-flag-banner--no-candidates" : ""}`}
        >
          {candidates.length === 0 ? (
            <>
              No matching transactions found for{" "}
              {initiatingTxn ? (
                <>
                  <strong>{initiatingTxn.date}</strong> /{" "}
                  <strong>{fmt(initiatingTxn.amount)}</strong>
                </>
              ) : (
                "this transaction"
              )}
              .{" "}
              <button
                className="txn-flag-banner-cancel"
                onClick={() => setFlagMode(null)}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              Select the matching transaction to complete the transfer pair
              {" — or "}
              <button
                className="txn-flag-banner-cancel"
                onClick={() => setFlagMode(null)}
              >
                press Escape to cancel
              </button>
            </>
          )}
        </div>
      )}

      {/* Un-flag confirmation panel */}
      {unflagTarget && (
        <div className="txn-unflag-panel">
          <span className="txn-unflag-text">
            Un-flag this transfer pair? Both transactions will revert to their
            previous categories.
          </span>
          <div className="txn-unflag-actions">
            <button
              className="txn-unflag-confirm"
              onClick={handleUnflagConfirm}
            >
              Confirm
            </button>
            <button
              className="txn-unflag-cancel"
              onClick={() => setUnflagTarget(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {!filtered.length && (
        <div className="txn-empty" data-testid="txn-empty">
          {!showTransfers && txns.some((t) => t.isTransfer)
            ? "All transactions are transfers — enable Show transfers to see them."
            : "No transactions found."}
        </div>
      )}

      <div className="txn-table-wrap">
        <table className="txn-table" data-testid="txn-table">
          <thead>
            <tr>
              {[
                "Date",
                uniqueAccounts.length > 1 ? "Account" : "",
                "Payee / Memo",
                "Amount",
                "Category",
              ]
                .filter(Boolean)
                .map((h) => (
                  <th key={h} className="txn-th">
                    {h}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const acctIdx = accounts.findIndex(
                (a) => a.id === t.accountShort,
              );
              const ac =
                ACCOUNT_COLORS[Math.max(0, acctIdx) % ACCOUNT_COLORS.length];

              // Category colour using a minimal PfaCategory-compatible array
              const catArr = uniqueCategories.map((name, i) => ({
                name,
                color: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
              }));
              const cc = getCatColor(t.category, catArr);

              // Determine row visual class for flagging mode
              let flagClass = "";
              if (flagMode) {
                if (t.id === flagMode.initiatingId) {
                  flagClass = " txn-row-initiating";
                } else if (candidateIds.has(t.id)) {
                  flagClass = " txn-row-candidate";
                } else {
                  flagClass = " txn-row-dimmed";
                }
              }

              const isClickableCandidate = !!(
                flagMode && candidateIds.has(t.id)
              );
              const isClickableTransfer = t.isTransfer && showTransfers;
              const isClickableNonTransfer = !t.isTransfer && !unflagTarget;

              return (
                <tr
                  key={t.id}
                  className={`txn-row${t.isTransfer ? " txn-row-transfer" : ""}${flagClass}`}
                  onClick={() => {
                    if (t.isTransfer) {
                      if (isClickableTransfer) handleTransferRowClick(t.id);
                    } else if (isClickableNonTransfer || isClickableCandidate) {
                      handleNonTransferRowClick(t.id);
                    }
                  }}
                  style={{
                    cursor:
                      isClickableCandidate ||
                      isClickableTransfer ||
                      isClickableNonTransfer
                        ? "pointer"
                        : "default",
                  }}
                >
                  <td className="txn-td txn-date">{t.date}</td>
                  {uniqueAccounts.length > 1 && (
                    <td className="txn-td">
                      <span
                        className="txn-acct-badge"
                        style={{
                          color: ac,
                          background: `${ac}18`,
                          borderColor: `${ac}33`,
                        }}
                      >
                        {t.account}
                      </span>
                    </td>
                  )}
                  <td className="txn-td txn-payee-cell">
                    <div
                      className="txn-payee"
                      style={{
                        color: t.isTransfer ? "var(--muted)" : "var(--text)",
                      }}
                    >
                      {t.payee || "—"}
                    </div>
                    {t.memo && <div className="txn-memo">{t.memo}</div>}
                  </td>
                  <td
                    className={`txn-td txn-amount mono${t.isCredit ? " credit" : " debit"}`}
                  >
                    {t.isCredit ? "+" : ""}
                    {fmt(t.amount)}
                    {t.isTransfer && (
                      <span className="txn-transfer-icon">⇔</span>
                    )}
                  </td>
                  <td className="txn-td txn-cat-cell">
                    {t.isTransfer ? (
                      <span
                        className="tag"
                        style={{
                          color: "var(--muted)",
                          background:
                            "color-mix(in srgb, var(--muted) 10%, transparent)",
                          borderColor:
                            "color-mix(in srgb, var(--muted) 30%, transparent)",
                        }}
                      >
                        Transfer
                      </span>
                    ) : (
                      <select
                        className={`txn-cat-select${t.category === "Savings" ? " category-badge--savings" : ""}`}
                        value={t.category ?? ""}
                        style={
                          t.category === "Savings"
                            ? { borderColor: "var(--colour-savings)" }
                            : {
                                borderColor: t.category
                                  ? `${cc}55`
                                  : "var(--border)",
                                color: t.category ? cc : "var(--muted)",
                              }
                        }
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          handleCategoryChange(t.id, e.target.value)
                        }
                      >
                        <option value="">Uncategorised</option>
                        {uniqueCategories.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
