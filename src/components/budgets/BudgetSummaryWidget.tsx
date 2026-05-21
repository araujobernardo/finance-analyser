// FA-BUDG-003 / #732 — Budget Summary Widget for the Dashboard

import { Link } from "react-router-dom";
import { useBudgets } from "../../context/BudgetContext";

const nzd = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
});

export function BudgetSummaryWidget() {
  const { budgets, loading } = useBudgets();

  if (loading) return null;
  if (budgets.length === 0) return null;

  return (
    <div className="card" data-testid="budget-section">
      <div className="card-title">Budget</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {budgets.map((b) => {
          const pct = Math.min(b.percentageUsed, 100);
          const isOver = b.remaining < 0;
          return (
            <div
              key={b.id}
              style={{ display: "flex", flexDirection: "column", gap: 4 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                }}
              >
                <span>{b.categoryName}</span>
                <span
                  style={{
                    color: isOver ? "var(--red)" : "var(--text-muted, #6b7280)",
                  }}
                >
                  {nzd.format(b.actualSpend)} / {nzd.format(b.limitAmount)}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: "var(--border, #e5e7eb)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: isOver
                      ? "var(--red)"
                      : pct >= 80
                        ? "#f59e0b"
                        : "var(--accent)",
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, textAlign: "right" }}>
        <Link to="/budget" style={{ fontSize: 13, color: "var(--accent)" }}>
          See all budgets
        </Link>
      </div>
    </div>
  );
}
