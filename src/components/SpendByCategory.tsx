import type { Transaction } from "../utils/csvParser";
import "./SpendByCategory.css";

interface Props {
  transactions: Transaction[];
}

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

interface CategoryRow {
  category: string;
  total: number;
  percentage: number;
}

function buildRows(transactions: Transaction[]): CategoryRow[] {
  const expenses = transactions.filter((t) => t.amount < 0);
  if (expenses.length === 0) return [];

  const totals: Record<string, number> = {};
  for (const t of expenses) {
    const cat = t.category || "Uncategorised";
    totals[cat] = (totals[cat] ?? 0) + Math.abs(t.amount);
  }

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);

  const rows: CategoryRow[] = Object.entries(totals)
    .filter(([, total]) => total > 0)
    .map(([category, total]) => ({
      category,
      total,
      percentage: (total / grandTotal) * 100,
    }));

  // Sort by amount descending, Uncategorised always last
  rows.sort((a, b) => {
    if (a.category === "Uncategorised") return 1;
    if (b.category === "Uncategorised") return -1;
    return b.total - a.total;
  });

  return rows;
}

export function SpendByCategory({ transactions }: Props) {
  const rows = buildRows(transactions);

  return (
    <div className="spend-by-category">
      <h2 className="spend-by-category__title">Spend by Category</h2>
      {rows.length === 0 ? (
        <p className="spend-by-category__empty">
          No expense transactions for this month.
        </p>
      ) : (
        <ul className="spend-by-category__list">
          {rows.map((row) => (
            <li
              key={row.category}
              className={
                row.category === "Uncategorised"
                  ? "spend-row spend-row--uncategorised"
                  : "spend-row"
              }
            >
              <div
                className="spend-row__bar"
                style={{ width: `${row.percentage}%` }}
                aria-hidden="true"
              />
              <span className="spend-row__name">{row.category}</span>
              <span className="spend-row__amount">{fmt.format(row.total)}</span>
              <span className="spend-row__pct">
                {row.percentage.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
