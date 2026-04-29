import { useState, useEffect, useCallback } from "react";
import { ACCOUNT_COLORS } from "../constants/colors";
import type { PfaTxn, PfaCategory } from "../types/pfa";
import {
  getCandidates,
  applyFlag,
  applyUnflag,
} from "../utils/transferFlagging";
import { fmt, fmtMonth, getCatColor } from "../utils/transactionFormatters";
import "./TransactionsPage.css";

interface Props {
  txns: PfaTxn[];
  accountList: { short: string; display: string }[];
  categories: PfaCategory[];
  onBulkCategoryChange: (updated: PfaTxn[]) => void;
}

export function TransactionsPage({
  txns,
  accountList,
  categories,
  onBulkCategoryChange,
}: Props) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [showTransfers, setShowTransfers] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Transfer flagging state
  const [flagMode, setFlagMode] = useState<{ initiatingId: string } | null>(
    null,
  );
  const [unflagTarget, setUnflagTarget] = useState<{ txnId: string } | null>(
    null,
  );

  const months = [...new Set(txns.map((t) => t.month))].sort().reverse();

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

  const filtered = txns
    .filter((t) => {
      if (!showTransfers && t.isTransfer) return false;
      if (filterMonth !== "all" && t.month !== filterMonth) return false;
      if (filterAccount !== "all" && t.account !== filterAccount) return false;
      if (filterCat === "__uncategorised__") {
        if (t.isTransfer) return false; // transfers never appear in uncategorised view
        if (t.category) return false; // has a category → exclude
      } else if (filterCat !== "all" && t.category !== filterCat) {
        return false; // named category selected but doesn't match → exclude
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

  const handleCategoryChange = (id: string, cat: string) => {
    const source = txns.find((t) => t.id === id);
    if (!source) return;
    const payee = source.payee.toLowerCase();
    const updated = txns.map((t) => {
      if (t.isTransfer) return t;
      const tp = t.payee.toLowerCase();
      if (tp.includes(payee) || payee.includes(tp))
        return { ...t, category: cat };
      return t;
    });
    const changedCount = updated.filter(
      (t, i) => t.category !== txns[i].category,
    ).length;
    onBulkCategoryChange(updated);
    if (changedCount > 1) {
      setToast(
        `Updated ${changedCount} transactions matching "${source.payee}"`,
      );
      setTimeout(() => setToast(null), 4000);
    }
  };

  // Handle clicking a non-transfer row
  const handleNonTransferRowClick = (txnId: string) => {
    if (unflagTarget) return; // ignore row clicks when unflag panel is open

    if (!flagMode) {
      // Enter flagging mode
      setFlagMode({ initiatingId: txnId });
      return;
    }

    // Already in flagging mode — check if this is a candidate
    if (candidateIds.has(txnId)) {
      const updated = applyFlag(txns, flagMode.initiatingId, txnId);
      onBulkCategoryChange(updated);
      setFlagMode(null);
      setToast("Transfer pair flagged.");
      setTimeout(() => setToast(null), 4000);
    }
    // Clicking the initiating row again or any other row → cancel flagging
    else {
      setFlagMode(null);
    }
  };

  // Handle clicking a transfer row
  const handleTransferRowClick = (txnId: string) => {
    if (flagMode) {
      setFlagMode(null);
      return;
    }
    setUnflagTarget({ txnId });
  };

  // Confirm un-flagging
  const handleUnflagConfirm = () => {
    if (!unflagTarget) return;
    const updated = applyUnflag(txns, unflagTarget.txnId);
    onBulkCategoryChange(updated);
    setUnflagTarget(null);
    setToast("Transfer pair un-flagged.");
    setTimeout(() => setToast(null), 4000);
  };

  const initiatingTxn = flagMode
    ? txns.find((t) => t.id === flagMode.initiatingId)
    : null;

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
          {accountList.length > 1 && (
            <select
              className="txn-select"
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
            >
              <option value="all">All accounts</option>
              {accountList.map((a) => (
                <option key={a.short} value={a.display}>
                  {a.display}
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
            {categories.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="txn-transfers-label">
            <input
              type="checkbox"
              checked={showTransfers}
              onChange={(e) => setShowTransfers(e.target.checked)}
              style={{ accentColor: "var(--accent)" }}
            />
            Show transfers
          </label>
          <span className="txn-row-count">{filtered.length} rows</span>
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

      <div className="txn-table-wrap">
        <table className="txn-table">
          <thead>
            <tr>
              {[
                "Date",
                accountList.length > 1 ? "Account" : "",
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
              const idx = accountList.findIndex(
                (a) => a.short === t.accountShort,
              );
              const ac =
                ACCOUNT_COLORS[Math.max(0, idx) % ACCOUNT_COLORS.length];
              const cc = getCatColor(t.category, categories);

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
                  {accountList.length > 1 && (
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
                        className="txn-cat-select"
                        value={t.category ?? ""}
                        style={{
                          borderColor: t.category ? `${cc}55` : "var(--border)",
                          color: t.category ? cc : "var(--muted)",
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          handleCategoryChange(t.id, e.target.value)
                        }
                      >
                        <option value="">Uncategorised</option>
                        {categories.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
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
        {!filtered.length && (
          <div className="txn-empty">No transactions found.</div>
        )}
      </div>
    </div>
  );
}
