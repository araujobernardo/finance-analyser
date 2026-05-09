import { useApi } from "../lib/api";
import { saveRule } from "../services/categoryRules";
import { CategoryBadge } from "./CategoryBadge";
import type { ApiTransaction } from "../types/api";
import "./TransactionList.css";

interface Props {
  transactions: ApiTransaction[];
  onTransactionsChange: (updated: ApiTransaction[]) => void;
}

const DATE_FMT = new Intl.DateTimeFormat("en-NZ", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function TransactionList({ transactions, onTransactionsChange }: Props) {
  const { apiFetch } = useApi();

  if (transactions.length === 0) {
    return <p className="txn-empty">No transactions to display.</p>;
  }

  async function handleCategoryChange(index: number, newCategory: string) {
    const t = transactions[index];
    if (!t) return;

    const res = await apiFetch(`/api/transactions/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newCategory }),
    });

    if (!res.ok) return;

    saveRule(t.description, newCategory);

    const updated = transactions.map((txn, i) =>
      i === index ? { ...txn, category: newCategory } : txn,
    );
    onTransactionsChange(updated);
  }

  return (
    <div className="txn-list-wrapper">
      <table className="txn-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th className="txn-amount">Amount</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => (
            <tr key={t.id}>
              <td className="txn-date">
                {DATE_FMT.format(new Date(t.date + "T00:00:00"))}
              </td>
              <td className="txn-desc">{t.description}</td>
              <td
                className={`txn-amount ${t.amount >= 0 ? "txn-positive" : "txn-negative"}`}
              >
                {t.amount >= 0 ? "+" : ""}
                {t.amount.toFixed(2)}
              </td>
              <td>
                <CategoryBadge
                  category={t.category ?? "Uncategorised"}
                  onCategoryChange={(cat) => void handleCategoryChange(i, cat)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
