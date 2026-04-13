import type { Transaction } from "../utils/csvParser";
import "./MonthlySummary.css";

interface Props {
  transactions: Transaction[];
}

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function MonthlySummary({ transactions }: Props) {
  const income = transactions.reduce(
    (sum, t) => (t.amount > 0 ? sum + t.amount : sum),
    0,
  );
  const expenses = transactions.reduce(
    (sum, t) => (t.amount < 0 ? sum + Math.abs(t.amount) : sum),
    0,
  );
  const net = income - expenses;

  return (
    <div className="monthly-summary">
      <div className="summary-card">
        <span className="summary-icon summary-icon--income">▲</span>
        <span className="summary-label">Total Income</span>
        <span className="summary-value summary-value--positive">
          {fmt.format(income)}
        </span>
      </div>
      <div className="summary-card">
        <span className="summary-icon summary-icon--expenses">▼</span>
        <span className="summary-label">Total Expenses</span>
        <span className="summary-value summary-value--negative">
          {fmt.format(expenses)}
        </span>
      </div>
      <div className="summary-card">
        <span className="summary-label">Net Savings</span>
        <span
          className={
            net >= 0
              ? "summary-value summary-value--positive"
              : "summary-value summary-value--negative"
          }
        >
          {net >= 0 ? "↑ " : "↓ "}
          {fmt.format(Math.abs(net))}
        </span>
      </div>
    </div>
  );
}
