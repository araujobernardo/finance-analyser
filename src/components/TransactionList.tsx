import type { Transaction } from "../utils/csvParser";
import { updateTransactionCategory } from "../services/storage";
import { CategoryBadge } from "./CategoryBadge";
import "./TransactionList.css";

interface Props {
  monthKey: string;
  transactions: Transaction[];
  onTransactionsChange: (updated: Transaction[]) => void;
}

const DATE_FMT = new Intl.DateTimeFormat("en-NZ", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function TransactionList({
  monthKey,
  transactions,
  onTransactionsChange,
}: Props) {
  if (transactions.length === 0) {
    return <p className="txn-empty">No transactions to display.</p>;
  }

  function handleCategoryChange(index: number, newCategory: string) {
    updateTransactionCategory(monthKey, index, newCategory);
    const updated = transactions.map((t, i) =>
      i === index ? { ...t, category: newCategory } : t,
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
            <tr key={i}>
              <td className="txn-date">{DATE_FMT.format(t.date)}</td>
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
                  onCategoryChange={(cat) => handleCategoryChange(i, cat)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
