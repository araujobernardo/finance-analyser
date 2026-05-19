// FA-GOAL-004 T004 — Goals Summary Widget for the Dashboard

import { Link } from "react-router-dom";
import { useGoals } from "../../context/GoalsContext";
import { getGoalStatus } from "../../utils/getGoalStatus";
import "./GoalsSummaryWidget.css";

const TYPE_LABELS: Record<string, string> = {
  savings_target: "Savings",
  debt_payoff: "Debt Payoff",
  net_worth_milestone: "Net Worth",
  spending_limit: "Spending Limit",
};

const STATUS_LABELS: Record<string, string> = {
  on_track: "On track",
  at_risk: "At risk",
  behind: "Behind",
};

const STATUS_CLASS: Record<string, string> = {
  on_track: "gsw-status--on-track",
  at_risk: "gsw-status--at-risk",
  behind: "gsw-status--behind",
};

export function GoalsSummaryWidget() {
  const { goals, isLoading } = useGoals();

  if (isLoading) return null;

  const today = new Date();

  const activeGoals = goals
    .filter((g) => g.status === "active")
    .sort((a, b) => {
      // Sort by targetDate ascending (nulls last), then updatedAt descending
      if (a.targetDate && b.targetDate) {
        const diff = a.targetDate.localeCompare(b.targetDate);
        if (diff !== 0) return diff;
      } else if (a.targetDate) {
        return -1;
      } else if (b.targetDate) {
        return 1;
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    })
    .slice(0, 3);

  return (
    <div className="gsw-card card" data-testid="goals-summary-widget">
      <div className="gsw-header">
        <span className="card-title">Goals</span>
      </div>

      {activeGoals.length === 0 ? (
        /* T008 — empty state */
        <div className="gsw-empty" data-testid="gsw-empty-state">
          <p className="gsw-empty-text">No active goals yet</p>
          <Link to="/goals" className="gsw-empty-link">
            Create your first goal
          </Link>
        </div>
      ) : (
        <div className="gsw-list">
          {activeGoals.map((goal) => {
            const targetAmount = parseFloat(goal.targetAmount);
            const currentAmount = goal.currentAmount
              ? parseFloat(goal.currentAmount)
              : 0;
            const percent =
              targetAmount > 0
                ? Math.min(100, (currentAmount / targetAmount) * 100)
                : 0;
            const status = getGoalStatus(goal, today);

            return (
              <div
                key={goal.id}
                className="gsw-item"
                data-testid="gsw-goal-item"
              >
                <div className="gsw-item-header">
                  <span className="gsw-goal-name">{goal.name}</span>
                  <span className="gsw-type-badge">
                    {TYPE_LABELS[goal.type] ?? goal.type}
                  </span>
                </div>

                <div className="gsw-progress-track">
                  <div
                    className="gsw-progress-fill"
                    style={{ width: `${percent}%` }}
                    data-testid="gsw-progress-bar"
                  />
                </div>

                <div className="gsw-item-footer">
                  <span className="gsw-percent">{percent.toFixed(0)}%</span>
                  {status && (
                    <span
                      className={`gsw-status ${STATUS_CLASS[status]}`}
                      data-testid="gsw-status-label"
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* T010 — "See all goals" footer link */}
      <div className="gsw-footer" data-testid="gsw-footer">
        <Link to="/goals" className="gsw-see-all">
          See all goals
        </Link>
      </div>
    </div>
  );
}
