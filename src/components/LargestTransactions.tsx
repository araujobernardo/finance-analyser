import type { Transaction } from "../utils/csvParser";
import "./LargestTransactions.css";

interface Props {
  transactions: Transaction[];
  onCategoryClick: (category: string | null) => void;
}

const DATE_FMT = new Intl.DateTimeFormat("en-NZ", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const AMT_FMT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function LargestTransactions({ transactions, onCategoryClick }: Props) {
  const top10 = transactions
    .filter((t) => t.amount < 0)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, 10);

  return (
    <div className="largest-txns">
      <h2 className="largest-txns__title">Largest Expenses This Month</h2>
      {top10.length === 0 ? (
        <p className="largest-txns__empty">
          No expense transactions for this month.
        </p>
      ) : (
        <ul className="largest-txns__list">
          {top10.map((t, i) => (
            <li
              key={i}
              className="largest-txns__row"
              onClick={() => onCategoryClick(t.category || "Uncategorised")}
              style={{ cursor: "pointer" }}
            >
              <span className="largest-txns__date">
                {DATE_FMT.format(t.date)}
              </span>
              <span className="largest-txns__desc">{t.description}</span>
              <span className="largest-txns__cat">
                {t.category || "Uncategorised"}
              </span>
              <span className="largest-txns__amount">
                {AMT_FMT.format(Math.abs(t.amount))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
