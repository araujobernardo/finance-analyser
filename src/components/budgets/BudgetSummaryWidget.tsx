// FA-BUDG-003 / Fix #734 — BudgetSummaryWidget
// Shows a summary of current-month budgets on the Dashboard.
// Renders nothing if no budgets exist for the current month.
// data-testid="budget-section" required for e2e/budget.spec.ts assertion.

import { useBudgets } from "../../context/BudgetContext";
import "./BudgetSummaryWidget.css";

export function BudgetSummaryWidget() {
  const { budgets, loading } = useBudgets();

  // Filter to current month's budgets (BudgetContext initialises to current month)
  const currentMonthBudgets = budgets;

  if (loading || currentMonthBudgets.length === 0) return null;

  return (
    <section
      className="budget-summary-widget card"
      data-testid="budget-section"
      aria-label="Budget summary"
    >
      <h2 className="budget-summary-widget__title">Budget Summary</h2>
      <ul className="budget-summary-widget__list">
        {currentMonthBudgets.map((budget) => {
          const pct = Math.min(budget.percentageUsed, 100);
          const isOver = budget.percentageUsed >= 100;
          const isWarning = budget.percentageUsed >= 80 && !isOver;

          return (
            <li key={budget.id} className="budget-summary-widget__item">
              <div className="budget-summary-widget__item-header">
                <span className="budget-summary-widget__category">
                  {budget.categoryName}
                </span>
                <span
                  className={[
                    "budget-summary-widget__pct",
                    isOver
                      ? "budget-summary-widget__pct--over"
                      : isWarning
                        ? "budget-summary-widget__pct--warning"
                        : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {Math.round(budget.percentageUsed)}%
                </span>
              </div>
              <div className="budget-summary-widget__bar-track">
                <div
                  className={[
                    "budget-summary-widget__bar-fill",
                    isOver
                      ? "budget-summary-widget__bar-fill--over"
                      : isWarning
                        ? "budget-summary-widget__bar-fill--warning"
                        : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
