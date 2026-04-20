import type { Transaction } from "../utils/csvParser";
import { EmptyState } from "./ui/EmptyState";
import { SkeletonCard } from "./ui/SkeletonCard";
import "./MonthlySummary.css";

interface Props {
  transactions: Transaction[];
  isLoading?: boolean;
}

function SummaryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"
      />
    </svg>
  );
}

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function MonthlySummary({ transactions, isLoading }: Props) {
  if (isLoading) {
    return <SkeletonCard rows={3} />;
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={<SummaryIcon />}
        message="No transactions yet — upload a CSV to see your summary."
        ctaLabel="Upload CSV"
        ctaTo="/upload"
      />
    );
  }

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
