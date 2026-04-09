import type { CategoryRow } from "../utils/categoryData";
import "./SpendByCategory.css";

interface Props {
  rows: CategoryRow[];
  selectedCategory: string | null;
  onCategoryClick: (category: string | null) => void;
}

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

export function SpendByCategory({
  rows,
  selectedCategory,
  onCategoryClick,
}: Props) {
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
              className={[
                "spend-row",
                row.category === "Uncategorised"
                  ? "spend-row--uncategorised"
                  : "",
                row.category === selectedCategory ? "spend-row--selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() =>
                onCategoryClick(
                  row.category === selectedCategory ? null : row.category,
                )
              }
              style={{ cursor: "pointer" }}
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
