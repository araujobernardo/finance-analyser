import { useState } from "react";
import { ACCOUNT_COLORS } from "../constants/colors";
import type { PfaTxn, PfaCategory } from "../types/pfa";
import "./TransactionsPage.css";

interface Props {
  txns: PfaTxn[];
  accountList: { short: string; display: string }[];
  categories: PfaCategory[];
  onBulkCategoryChange: (updated: PfaTxn[]) => void;
}

const fmt = (n: number) =>
  `$${Math.abs(n).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtMonth = (m: string) => {
  if (!m) return "";
  const [y, mo] = m.split("-");
  return new Date(+y, +mo - 1, 1).toLocaleString("en-NZ", {
    month: "long",
    year: "numeric",
  });
};

const getCatColor = (name: string | null, cats: PfaCategory[]) =>
  cats.find((c) => c.name === name)?.color ?? "#64748b";

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

  const months = [...new Set(txns.map((t) => t.month))].sort().reverse();

  const filtered = txns
    .filter((t) => {
      if (!showTransfers && t.isTransfer) return false;
      if (filterMonth !== "all" && t.month !== filterMonth) return false;
      if (filterAccount !== "all" && t.account !== filterAccount) return false;
      if (filterCat !== "all" && t.category !== filterCat) return false;
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
        {toast && <div className="txn-toast">✓ {toast}</div>}
      </div>

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
              return (
                <tr
                  key={t.id}
                  className={`txn-row${t.isTransfer ? " txn-row-transfer" : ""}`}
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
                      <span className="txn-transfer-icon">↔</span>
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
