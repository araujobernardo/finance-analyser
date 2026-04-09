import { useState } from "react";
import { saveBudget, deleteBudget } from "../services/budgets";
import { CATEGORIES } from "../services/categorisation";
import type { CategoryRow } from "../utils/categoryData";
import "./SpendByCategory.css";

interface Props {
  rows: CategoryRow[];
  selectedCategory: string | null;
  onCategoryClick: (category: string | null) => void;
  budgets: Record<string, number>;
  onBudgetsChange: (budgets: Record<string, number>) => void;
  showForm?: boolean;
  onShowFormChange?: (show: boolean) => void;
}

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function budgetBarClass(pct: number): string {
  if (pct > 100) return "budget-bar__fill budget-bar__fill--over";
  if (pct >= 80) return "budget-bar__fill budget-bar__fill--warn";
  return "budget-bar__fill budget-bar__fill--ok";
}

export function SpendByCategory({
  rows,
  selectedCategory,
  onCategoryClick,
  budgets,
  onBudgetsChange,
  showForm: showFormProp,
  onShowFormChange,
}: Props) {
  const [showFormInternal, setShowFormInternal] = useState(false);
  const showForm = showFormProp ?? showFormInternal;
  function setShowForm(v: boolean) {
    setShowFormInternal(v);
    onShowFormChange?.(v);
  }
  const [formCategory, setFormCategory] = useState<string>(CATEGORIES[0]);
  const [formAmount, setFormAmount] = useState("");

  const spentMap = Object.fromEntries(rows.map((r) => [r.category, r.total]));
  const orphaned = Object.keys(budgets).filter(
    (cat) => budgets[cat] > 0 && !(cat in spentMap),
  );

  function handleSave() {
    const amount = parseFloat(formAmount);
    if (!formCategory || isNaN(amount) || amount <= 0) return;
    saveBudget(formCategory, amount);
    onBudgetsChange({ ...budgets, [formCategory]: amount });
    setFormAmount("");
    setShowForm(false);
  }

  function handleDelete(category: string) {
    deleteBudget(category);
    const updated = { ...budgets };
    delete updated[category];
    onBudgetsChange(updated);
  }

  return (
    <div className="spend-by-category">
      <div className="spend-by-category__header">
        <h2 className="spend-by-category__title">Spend by Category</h2>
        <button
          type="button"
          className="budget-add-btn"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancel" : "+ Budget"}
        </button>
      </div>

      {showForm && (
        <div className="budget-form" data-testid="budget-form">
          <select
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
            aria-label="Category"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount"
            value={formAmount}
            onChange={(e) => setFormAmount(e.target.value)}
            aria-label="Budget amount"
          />
          <button type="button" onClick={handleSave}>
            Save
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="spend-by-category__empty">
          No expense transactions for this month.
        </p>
      ) : (
        <ul className="spend-by-category__list">
          {rows.map((row) => {
            const budget = budgets[row.category];
            const hasBudget = budget != null && budget > 0;
            const pct = hasBudget ? (row.total / budget) * 100 : 0;

            return (
              <li
                key={row.category}
                className={[
                  "spend-row",
                  row.category === "Uncategorised"
                    ? "spend-row--uncategorised"
                    : "",
                  row.category === selectedCategory
                    ? "spend-row--selected"
                    : "",
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
                <div className="spend-row__content">
                  <div className="spend-row__top">
                    <span className="spend-row__name">{row.category}</span>
                    <span className="spend-row__amount">
                      {fmt.format(row.total)}
                    </span>
                    <span className="spend-row__pct">
                      {row.percentage.toFixed(1)}%
                    </span>
                    {hasBudget && (
                      <button
                        type="button"
                        className="budget-delete-btn"
                        aria-label={`Remove budget for ${row.category}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(row.category);
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  {hasBudget && (
                    <div
                      className="budget-bar"
                      aria-label={`Budget progress for ${row.category}`}
                    >
                      <div
                        className={budgetBarClass(pct)}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                      <span className="budget-bar__label">
                        {fmt.format(row.total)} / {fmt.format(budget)} (
                        {pct.toFixed(0)}%)
                      </span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {orphaned.length > 0 && (
        <div className="orphaned-budgets" data-testid="orphaned-budgets">
          <h3 className="orphaned-budgets__title">Unmatched budgets</h3>
          <ul className="spend-by-category__list">
            {orphaned.map((cat) => (
              <li key={cat} className="spend-row spend-row--orphaned">
                <div className="spend-row__content">
                  <div className="spend-row__top">
                    <span className="spend-row__name">{cat}</span>
                    <span className="spend-row__amount spend-row__amount--muted">
                      No spend — budget {fmt.format(budgets[cat])}
                    </span>
                    <button
                      type="button"
                      className="budget-delete-btn"
                      aria-label={`Remove budget for ${cat}`}
                      onClick={() => handleDelete(cat)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
