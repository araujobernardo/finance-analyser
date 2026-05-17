import type { ApiGoal } from "../../types/api";
import "./GoalCard.css";

// ── Type label map ────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ApiGoal["type"], string> = {
  savings_target: "Savings Target",
  debt_payoff: "Debt Payoff",
  net_worth_milestone: "Net Worth Milestone",
  spending_limit: "Spending Limit",
};

// ── Progress helpers ──────────────────────────────────────────────────────────

function goalPercent(goal: ApiGoal): number {
  if (goal.currentAmount == null) return 0;
  const target = parseFloat(goal.targetAmount);
  if (target <= 0) return 0;
  return Math.min(100, (parseFloat(goal.currentAmount) / target) * 100);
}

function isOverTarget(goal: ApiGoal): boolean {
  if (goal.currentAmount == null) return false;
  const target = parseFloat(goal.targetAmount);
  if (target <= 0) return false;
  return parseFloat(goal.currentAmount) / target > 1;
}

// ── NZD formatter ─────────────────────────────────────────────────────────────

const nzd = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
});

function formatNzd(value: string | null | undefined): string {
  if (value == null) return "—";
  const n = parseFloat(value);
  return isNaN(n) ? "—" : nzd.format(n);
}

// ── Date formatter ────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── GoalCard component ────────────────────────────────────────────────────────

interface GoalCardProps {
  goal: ApiGoal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const percent = goalPercent(goal);
  const overTarget = isOverTarget(goal);
  const formattedDate = formatDate(goal.targetDate);
  const isCompleted = goal.status !== "active";

  return (
    <div
      className={`goal-card${isCompleted ? " goal-card--completed" : ""}`}
      data-testid={`goal-card-${goal.id}`}
    >
      {/* Header row */}
      <div className="goal-card__header">
        <div className="goal-card__name-row">
          <span
            className="goal-card__name"
            data-testid={`goal-card-name-${goal.id}`}
          >
            {goal.name}
          </span>
          <span
            className="goal-card__type-badge"
            data-testid={`goal-card-type-${goal.id}`}
          >
            {TYPE_LABELS[goal.type]}
          </span>
        </div>

        {/* Status badge for non-active goals */}
        {isCompleted && (
          <span
            className={`goal-card__status-badge goal-card__status-badge--${goal.status}`}
            data-testid={`goal-card-status-${goal.id}`}
          >
            {goal.status === "achieved" ? "Achieved" : "Abandoned"}
          </span>
        )}
      </div>

      {/* Progress section */}
      <div className="goal-card__progress-section">
        {/* Progress bar */}
        <div
          className="goal-card__progress-track"
          data-testid={`goal-card-progress-track-${goal.id}`}
          aria-label={`Progress: ${Math.round(percent)}%`}
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`goal-card__progress-fill${overTarget ? " goal-card__progress-fill--over" : ""}`}
            data-testid={`goal-card-progress-fill-${goal.id}`}
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Amount labels row */}
        <div className="goal-card__amounts">
          {goal.currentAmount != null ? (
            <>
              <span
                className="goal-card__current-amount"
                data-testid={`goal-card-current-${goal.id}`}
              >
                {formatNzd(goal.currentAmount)}
              </span>
              <span className="goal-card__amount-sep">/</span>
              <span
                className="goal-card__target-amount"
                data-testid={`goal-card-target-${goal.id}`}
              >
                {formatNzd(goal.targetAmount)}
              </span>
              {overTarget && (
                <span
                  className="goal-card__over-badge"
                  data-testid={`goal-card-over-${goal.id}`}
                >
                  Over target
                </span>
              )}
            </>
          ) : (
            <>
              <span
                className="goal-card__auto-note"
                data-testid={`goal-card-auto-note-${goal.id}`}
              >
                Progress will update automatically
              </span>
              <span
                className="goal-card__target-amount"
                data-testid={`goal-card-target-${goal.id}`}
              >
                Target: {formatNzd(goal.targetAmount)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Target date */}
      {formattedDate && (
        <div
          className="goal-card__date"
          data-testid={`goal-card-date-${goal.id}`}
        >
          Target date: {formattedDate}
        </div>
      )}
    </div>
  );
}
