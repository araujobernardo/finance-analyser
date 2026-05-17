import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoalCard } from "./GoalCard";
import type { ApiGoal } from "../../types/api";

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeGoal(overrides: Partial<ApiGoal> = {}): ApiGoal {
  return {
    id: "g1",
    userId: "u1",
    name: "Emergency Fund",
    type: "savings_target",
    targetAmount: "5000",
    targetDate: null,
    linkedAccountId: null,
    categoryName: null,
    currentAmount: null,
    status: "active",
    createdAt: "2026-05-17T00:00:00.000Z",
    updatedAt: "2026-05-17T00:00:00.000Z",
    ...overrides,
  };
}

// ── Type labels ─────────────────────────────────────────────────────────────

describe("GoalCard — type labels", () => {
  it("renders 'Savings Target' for savings_target", () => {
    render(<GoalCard goal={makeGoal({ type: "savings_target" })} />);
    expect(screen.getByText("Savings Target")).toBeInTheDocument();
  });

  it("renders 'Debt Payoff' for debt_payoff", () => {
    render(<GoalCard goal={makeGoal({ type: "debt_payoff" })} />);
    expect(screen.getByText("Debt Payoff")).toBeInTheDocument();
  });

  it("renders 'Net Worth Milestone' for net_worth_milestone", () => {
    render(<GoalCard goal={makeGoal({ type: "net_worth_milestone" })} />);
    expect(screen.getByText("Net Worth Milestone")).toBeInTheDocument();
  });

  it("renders 'Spending Limit' for spending_limit", () => {
    render(<GoalCard goal={makeGoal({ type: "spending_limit" })} />);
    expect(screen.getByText("Spending Limit")).toBeInTheDocument();
  });
});

// ── Name and basic render ───────────────────────────────────────────────────

describe("GoalCard — basic render", () => {
  it("renders the goal name", () => {
    render(<GoalCard goal={makeGoal({ name: "My Savings Goal" })} />);
    expect(screen.getByText("My Savings Goal")).toBeInTheDocument();
  });

  it("has data-testid on the card root", () => {
    render(<GoalCard goal={makeGoal({ id: "g42" })} />);
    expect(screen.getByTestId("goal-card-g42")).toBeInTheDocument();
  });
});

// ── Progress bar ────────────────────────────────────────────────────────────

describe("GoalCard — progress bar", () => {
  it("renders progress fill at 50% when currentAmount is half of targetAmount", () => {
    const goal = makeGoal({ targetAmount: "1000", currentAmount: "500" });
    render(<GoalCard goal={goal} />);
    const fill = screen.getByTestId("goal-card-progress-fill-g1");
    expect(fill.style.width).toBe("50%");
  });

  it("caps progress fill at 100% when currentAmount exceeds targetAmount", () => {
    const goal = makeGoal({ targetAmount: "1000", currentAmount: "1500" });
    render(<GoalCard goal={goal} />);
    const fill = screen.getByTestId("goal-card-progress-fill-g1");
    expect(fill.style.width).toBe("100%");
  });

  it("renders progress fill at 0% when currentAmount is null", () => {
    const goal = makeGoal({ currentAmount: null });
    render(<GoalCard goal={goal} />);
    const fill = screen.getByTestId("goal-card-progress-fill-g1");
    expect(fill.style.width).toBe("0%");
  });

  it("shows 'Over target' badge when currentAmount > targetAmount", () => {
    const goal = makeGoal({ targetAmount: "1000", currentAmount: "1500" });
    render(<GoalCard goal={goal} />);
    expect(screen.getByTestId("goal-card-over-g1")).toBeInTheDocument();
    expect(screen.getByText("Over target")).toBeInTheDocument();
  });

  it("does not show 'Over target' badge when currentAmount <= targetAmount", () => {
    const goal = makeGoal({ targetAmount: "1000", currentAmount: "500" });
    render(<GoalCard goal={goal} />);
    expect(screen.queryByTestId("goal-card-over-g1")).not.toBeInTheDocument();
  });
});

// ── Null currentAmount ──────────────────────────────────────────────────────

describe("GoalCard — null currentAmount", () => {
  it("shows auto-note when currentAmount is null", () => {
    const goal = makeGoal({ currentAmount: null });
    render(<GoalCard goal={goal} />);
    expect(
      screen.getByText(/progress will update automatically/i),
    ).toBeInTheDocument();
  });

  it("does not show auto-note when currentAmount is set", () => {
    const goal = makeGoal({ currentAmount: "500" });
    render(<GoalCard goal={goal} />);
    expect(
      screen.queryByText(/progress will update automatically/i),
    ).not.toBeInTheDocument();
  });
});

// ── Amount formatting ───────────────────────────────────────────────────────

describe("GoalCard — amount formatting", () => {
  it("shows formatted NZD amounts when currentAmount is set", () => {
    const goal = makeGoal({ targetAmount: "5000", currentAmount: "2500" });
    render(<GoalCard goal={goal} />);
    expect(screen.getByTestId("goal-card-current-g1").textContent).toMatch(
      /\$2,500/,
    );
    expect(screen.getByTestId("goal-card-target-g1").textContent).toMatch(
      /\$5,000/,
    );
  });

  it("shows target amount with 'Target:' prefix when currentAmount is null", () => {
    const goal = makeGoal({ targetAmount: "5000", currentAmount: null });
    render(<GoalCard goal={goal} />);
    expect(screen.getByTestId("goal-card-target-g1").textContent).toMatch(
      /Target:.*\$5,000/,
    );
  });
});

// ── Target date ─────────────────────────────────────────────────────────────

describe("GoalCard — target date", () => {
  it("shows formatted target date when set", () => {
    const goal = makeGoal({ targetDate: "2027-12-31" });
    render(<GoalCard goal={goal} />);
    const dateEl = screen.getByTestId("goal-card-date-g1");
    expect(dateEl.textContent).toContain("Target date:");
    expect(dateEl.textContent).toContain("2027");
  });

  it("does not render date element when targetDate is null", () => {
    const goal = makeGoal({ targetDate: null });
    render(<GoalCard goal={goal} />);
    expect(screen.queryByTestId("goal-card-date-g1")).not.toBeInTheDocument();
  });
});

// ── Status badges ───────────────────────────────────────────────────────────

describe("GoalCard — status badges", () => {
  it("does not show status badge for active goals", () => {
    const goal = makeGoal({ status: "active" });
    render(<GoalCard goal={goal} />);
    expect(screen.queryByTestId("goal-card-status-g1")).not.toBeInTheDocument();
  });

  it("shows 'Achieved' badge for achieved goals", () => {
    const goal = makeGoal({ status: "achieved" });
    render(<GoalCard goal={goal} />);
    expect(screen.getByTestId("goal-card-status-g1")).toHaveTextContent(
      "Achieved",
    );
  });

  it("shows 'Abandoned' badge for abandoned goals", () => {
    const goal = makeGoal({ status: "abandoned" });
    render(<GoalCard goal={goal} />);
    expect(screen.getByTestId("goal-card-status-g1")).toHaveTextContent(
      "Abandoned",
    );
  });

  it("applies completed class modifier for non-active goals", () => {
    const goal = makeGoal({ status: "achieved" });
    render(<GoalCard goal={goal} />);
    expect(screen.getByTestId("goal-card-g1").className).toContain(
      "goal-card--completed",
    );
  });

  it("does not apply completed class for active goals", () => {
    const goal = makeGoal({ status: "active" });
    render(<GoalCard goal={goal} />);
    expect(screen.getByTestId("goal-card-g1").className).not.toContain(
      "goal-card--completed",
    );
  });
});
