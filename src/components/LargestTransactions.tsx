import type { Transaction } from "../utils/csvParser";
import { EmptyState } from "./ui/EmptyState";
import { SkeletonCard } from "./ui/SkeletonCard";
import "./LargestTransactions.css";

interface Props {
  transactions: Transaction[];
  onCategoryClick: (category: string | null) => void;
  isLoading?: boolean;
}

function TransactionIcon() {
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
        d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
      />
    </svg>
  );
}

const DATE_FMT = new Intl.DateTimeFormat("en-NZ", {
  day: "2-digit",
  month: "short",
});

const AMT_FMT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const CATEGORY_COLORS: Record<string, string> = {
  Groceries: "#16a34a",
  Transport: "#2563eb",
  Utilities: "#d97706",
  Dining: "#ea580c",
  Entertainment: "#7c3aed",
  Healthcare: "#db2777",
  Shopping: "#4f46e5",
  Education: "#0891b2",
  Income: "#65a30d",
  Transfer: "#0284c7",
  Other: "#64748b",
  Uncategorised: "#9ca3af",
};

const MAX_DESC = 40;

export function LargestTransactions({
  transactions,
  onCategoryClick,
  isLoading,
}: Props) {
  if (isLoading) {
    return (
      <div className="largest-txns">
        <h2 className="largest-txns__title">Largest Transactions</h2>
        <SkeletonCard rows={5} />
      </div>
    );
  }

  const top10 = [...transactions]
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 10);

  return (
    <div className="largest-txns">
      <h2 className="largest-txns__title">Largest Transactions</h2>
      {top10.length === 0 ? (
        <EmptyState
          icon={<TransactionIcon />}
          message="No transactions for this period."
        />
      ) : (
        <ul className="largest-txns__list">
          {top10.map((t, i) => {
            const cat = t.category || "Uncategorised";
            const dotColor = CATEGORY_COLORS[cat] ?? "#9ca3af";
            const isDebit = t.amount < 0;
            const truncated =
              t.description.length > MAX_DESC
                ? t.description.slice(0, MAX_DESC) + "…"
                : t.description;
            return (
              <li
                key={i}
                className="largest-txns__row"
                onClick={() => onCategoryClick(cat)}
                style={{ cursor: "pointer" }}
              >
                <span className="largest-txns__rank">{i + 1}</span>
                <span className="largest-txns__date">
                  {DATE_FMT.format(t.date)}
                </span>
                <span
                  className="largest-txns__desc"
                  title={
                    t.description.length > MAX_DESC ? t.description : undefined
                  }
                >
                  {truncated}
                </span>
                <span className="largest-txns__cat">
                  <span
                    className="largest-txns__dot"
                    style={{ background: dotColor }}
                    aria-hidden="true"
                  />
                  {cat}
                </span>
                <span
                  className={
                    isDebit
                      ? "largest-txns__amount largest-txns__amount--debit"
                      : "largest-txns__amount largest-txns__amount--credit"
                  }
                >
                  {AMT_FMT.format(Math.abs(t.amount))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
