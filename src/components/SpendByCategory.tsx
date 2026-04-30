import { useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { TooltipProps } from "recharts";
import { saveBudget, deleteBudget } from "../services/budgets";
import { CATEGORIES } from "../services/categorisation";
import type { CategoryRow } from "../utils/categoryData";
import { EmptyState } from "./ui/EmptyState";
import { SkeletonCard } from "./ui/SkeletonCard";
import "./SpendByCategory.css";

interface Props {
  rows: CategoryRow[];
  selectedCategory: string | null;
  onCategoryClick: (category: string | null) => void;
  budgets: Record<string, number>;
  onBudgetsChange: (budgets: Record<string, number>) => void;
  showForm?: boolean;
  onShowFormChange?: (show: boolean) => void;
  isLoading?: boolean;
}

function CategoryIcon() {
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
        d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
      />
    </svg>
  );
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

/** Colour palette for category chart slices — uses purple-spectrum design tokens */
const CATEGORY_COLOURS: Record<string, string> = {
  Groceries: "#c084fc",
  Transport: "#60a5fa",
  Utilities: "#34d399",
  Dining: "#f97316",
  Entertainment: "#f472b6",
  Healthcare: "#4ade80",
  Shopping: "#fb923c",
  Education: "#a78bfa",
  Income: "#2dd4bf",
  Transfer: "#94a3b8",
  Savings: "#10b981",
  Other: "#e879f9",
  Uncategorised: "#6b7280",
};

const FALLBACK_COLOURS = [
  "#c084fc",
  "#60a5fa",
  "#34d399",
  "#f97316",
  "#f472b6",
  "#4ade80",
  "#fb923c",
  "#a78bfa",
  "#2dd4bf",
  "#e879f9",
];

function getCategoryColour(category: string, index: number): string {
  return (
    CATEGORY_COLOURS[category] ??
    FALLBACK_COLOURS[index % FALLBACK_COLOURS.length]
  );
}

interface ChartEntry extends CategoryRow {
  name: string;
  value: number;
  fill: string;
}

interface ChartTooltipPayloadItem {
  name: string;
  value: number;
  payload: ChartEntry;
}

function CategoryTooltip({
  active,
  payload,
}: TooltipProps<number, string> & {
  payload?: ChartTooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div className="category-tooltip">
      <span
        className="category-tooltip__swatch"
        style={{ background: item.payload.fill }}
      />
      <span className="category-tooltip__name">{item.name}</span>
      <span className="category-tooltip__amount">{fmt.format(item.value)}</span>
      <span className="category-tooltip__pct">
        {item.payload.percentage.toFixed(1)}%
      </span>
    </div>
  );
}

export function SpendByCategory({
  rows,
  selectedCategory,
  onCategoryClick,
  budgets,
  onBudgetsChange,
  showForm: showFormProp,
  onShowFormChange,
  isLoading,
}: Props) {
  const [showFormInternal, setShowFormInternal] = useState(false);
  const showForm = showFormProp ?? showFormInternal;
  function setShowForm(v: boolean) {
    setShowFormInternal(v);
    onShowFormChange?.(v);
  }
  const [formCategory, setFormCategory] = useState<string>(CATEGORIES[0]);
  const [formAmount, setFormAmount] = useState("");

  if (isLoading) {
    return (
      <div className="spend-by-category">
        <div className="spend-by-category__card">
          <SkeletonCard rows={5} />
        </div>
      </div>
    );
  }

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

  const chartData: ChartEntry[] = rows.map((r, i) => ({
    ...r,
    name: r.category,
    value: r.total,
    fill: getCategoryColour(r.category, i),
  }));

  return (
    <div className="spend-by-category">
      <div className="spend-by-category__card">
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
          <EmptyState
            icon={<CategoryIcon />}
            message="No expense transactions for this period."
          />
        ) : (
          <>
            <div className="spend-by-category__body">
              {/* Left column: legend list */}
              <div className="spend-by-category__legend-col">
                <ul className="spend-by-category__list">
                  {rows.map((row, i) => {
                    const budget = budgets[row.category];
                    const hasBudget = budget != null && budget > 0;
                    const pct = hasBudget ? (row.total / budget) * 100 : 0;
                    const colour = getCategoryColour(row.category, i);

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
                            row.category === selectedCategory
                              ? null
                              : row.category,
                          )
                        }
                        style={{
                          cursor: "pointer",
                          opacity:
                            selectedCategory === null ||
                            row.category === selectedCategory
                              ? 1
                              : 0.4,
                        }}
                      >
                        <div
                          className="spend-row__pct-bar"
                          style={{
                            width: `${row.percentage}%`,
                            background: colour,
                          }}
                          aria-hidden="true"
                        />
                        <div className="spend-row__content">
                          <div className="spend-row__top">
                            <span
                              className="spend-row__swatch"
                              style={{ background: colour }}
                              aria-hidden="true"
                            />
                            <span className="spend-row__name">
                              {row.category}
                            </span>
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
              </div>

              {/* Right column: donut chart */}
              <div className="spend-by-category__chart-col">
                <div className="spend-by-category__chart" aria-hidden="true">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius="60%"
                        outerRadius="80%"
                        strokeWidth={2}
                        stroke="var(--surface)"
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.fill}
                            opacity={
                              selectedCategory === null ||
                              selectedCategory === entry.category
                                ? 1
                                : 0.35
                            }
                            style={{ cursor: "pointer" }}
                            onClick={() =>
                              onCategoryClick(
                                entry.category === selectedCategory
                                  ? null
                                  : entry.category,
                              )
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={(<CategoryTooltip />) as React.ReactElement}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
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
    </div>
  );
}
