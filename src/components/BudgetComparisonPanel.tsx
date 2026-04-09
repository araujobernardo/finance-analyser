import type { CategoryRow } from "../utils/categoryData";
import "./BudgetComparisonPanel.css";

interface Props {
  budgets: Record<string, number>;
  rows: CategoryRow[];
  onManageBudgets: () => void;
}

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

type Status = "over" | "on-budget" | "under";

function getStatus(actual: number, budget: number): Status {
  const pct = (actual / budget) * 100;
  if (pct > 100) return "over";
  if (pct >= 95) return "on-budget";
  return "under";
}

export function BudgetComparisonPanel({
  budgets,
  rows,
  onManageBudgets,
}: Props) {
  const activeBudgets = Object.entries(budgets).filter(([, amt]) => amt > 0);

  if (activeBudgets.length === 0) {
    return (
      <div className="budget-comparison">
        <div className="budget-comparison__header">
          <h2 className="budget-comparison__title">Budget vs Actual</h2>
          <button
            type="button"
            className="budget-comparison__manage"
            onClick={onManageBudgets}
          >
            + Add budget
          </button>
        </div>
        <p className="budget-comparison__empty">
          No budgets set.{" "}
          <button
            type="button"
            className="budget-comparison__manage budget-comparison__manage--inline"
            onClick={onManageBudgets}
          >
            Add a budget
          </button>{" "}
          to start tracking.
        </p>
      </div>
    );
  }

  const spentMap = Object.fromEntries(rows.map((r) => [r.category, r.total]));

  const budgetRows = activeBudgets.map(([cat, budget]) => {
    const actual = spentMap[cat] ?? 0;
    return { cat, budget, actual, status: getStatus(actual, budget) };
  });

  const totalBudget = budgetRows.reduce((s, r) => s + r.budget, 0);
  const totalActual = budgetRows.reduce((s, r) => s + r.actual, 0);
  const totalStatus = getStatus(totalActual, totalBudget);

  return (
    <div className="budget-comparison">
      <div className="budget-comparison__header">
        <h2 className="budget-comparison__title">Budget vs Actual</h2>
        <button
          type="button"
          className="budget-comparison__manage"
          onClick={onManageBudgets}
        >
          Manage budgets
        </button>
      </div>

      <table
        className="budget-comparison__table"
        data-testid="budget-comparison-table"
      >
        <thead>
          <tr>
            <th className="budget-comparison__col-cat">Category</th>
            <th className="budget-comparison__col-num">Budget</th>
            <th className="budget-comparison__col-num">Actual</th>
            <th className="budget-comparison__col-num">Remaining</th>
          </tr>
        </thead>
        <tbody>
          {budgetRows.map(({ cat, budget, actual, status }) => (
            <tr
              key={cat}
              className={`budget-comparison__row budget-comparison__row--${status}`}
              data-testid={`budget-row-${cat}`}
            >
              <td className="budget-comparison__col-cat">{cat}</td>
              <td className="budget-comparison__col-num">
                {fmt.format(budget)}
              </td>
              <td className="budget-comparison__col-num">
                {fmt.format(actual)}
              </td>
              <td className="budget-comparison__col-num">
                {actual === 0 && budget === 0
                  ? "—"
                  : fmt.format(budget - actual)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr
            className={`budget-comparison__row budget-comparison__row--total budget-comparison__row--${totalStatus}`}
            data-testid="budget-row-total"
          >
            <td className="budget-comparison__col-cat">Total</td>
            <td className="budget-comparison__col-num">
              {fmt.format(totalBudget)}
            </td>
            <td className="budget-comparison__col-num">
              {fmt.format(totalActual)}
            </td>
            <td className="budget-comparison__col-num">
              {fmt.format(totalBudget - totalActual)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
