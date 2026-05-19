// FA-GOAL-004 T006 — Component tests for GoalsSummaryWidget

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GoalsSummaryWidget } from "../GoalsSummaryWidget";
import type { ApiGoal } from "../../../types/api";

// ── Mock GoalsContext ────────────────────────────────────────────────────────

let mockGoals: ApiGoal[] = [];
let mockIsLoading = false;

vi.mock("../../../context/GoalsContext", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../../context/GoalsContext")>();
  return {
    ...original,
    useGoals: () => ({
      goals: mockGoals,
      isLoading: mockIsLoading,
      addGoal: vi.fn(),
      updateGoal: vi.fn(),
      removeGoal: vi.fn(),
    }),
  };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeGoal(overrides: Partial<ApiGoal> = {}): ApiGoal {
  return {
    id: "g1",
    userId: "u1",
    name: "Emergency Fund",
    type: "savings_target",
    targetAmount: "5000",
    targetDate: "2026-12-31",
    linkedAccountId: null,
    categoryName: null,
    currentAmount: "2500",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}

function renderWidget() {
  return render(
    <MemoryRouter>
      <GoalsSummaryWidget />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockGoals = [];
  mockIsLoading = false;
});

// ── Loading state ────────────────────────────────────────────────────────────

describe("GoalsSummaryWidget — loading state", () => {
  it("renders nothing while loading", () => {
    mockIsLoading = true;
    const { container } = renderWidget();
    expect(container.firstChild).toBeNull();
  });
});

// ── Empty state (T009) ───────────────────────────────────────────────────────

describe("GoalsSummaryWidget — empty state", () => {
  it("shows empty state when no active goals", () => {
    mockGoals = [];
    renderWidget();
    expect(screen.getByTestId("gsw-empty-state")).toBeInTheDocument();
    expect(screen.getByText("No active goals yet")).toBeInTheDocument();
  });

  it("shows Create your first goal link to /goals", () => {
    mockGoals = [];
    renderWidget();
    const link = screen.getByRole("link", { name: "Create your first goal" });
    expect(link).toHaveAttribute("href", "/goals");
  });

  it("does not show goal items when empty", () => {
    mockGoals = [];
    renderWidget();
    expect(screen.queryByTestId("gsw-goal-item")).not.toBeInTheDocument();
  });

  it("shows non-active goals as empty (filters out achieved/abandoned)", () => {
    mockGoals = [
      makeGoal({ id: "g1", status: "achieved" }),
      makeGoal({ id: "g2", status: "abandoned" }),
    ];
    renderWidget();
    expect(screen.getByTestId("gsw-empty-state")).toBeInTheDocument();
  });
});

// ── Goal rendering ───────────────────────────────────────────────────────────

describe("GoalsSummaryWidget — goal rendering", () => {
  it("renders up to 3 active goals", () => {
    mockGoals = [
      makeGoal({ id: "g1", name: "Goal 1" }),
      makeGoal({ id: "g2", name: "Goal 2" }),
      makeGoal({ id: "g3", name: "Goal 3" }),
      makeGoal({ id: "g4", name: "Goal 4" }),
    ];
    renderWidget();
    expect(screen.queryAllByTestId("gsw-goal-item")).toHaveLength(3);
  });

  it("renders goal name", () => {
    mockGoals = [makeGoal({ name: "Holiday Fund" })];
    renderWidget();
    expect(screen.getByText("Holiday Fund")).toBeInTheDocument();
  });

  it("renders the widget container", () => {
    mockGoals = [makeGoal()];
    renderWidget();
    expect(screen.getByTestId("goals-summary-widget")).toBeInTheDocument();
  });

  it("renders a progress bar for each goal", () => {
    mockGoals = [makeGoal({ currentAmount: "2500", targetAmount: "5000" })];
    renderWidget();
    const bar = screen.getByTestId("gsw-progress-bar");
    // 50% progress
    expect(bar).toHaveStyle({ width: "50%" });
  });

  it("caps progress bar at 100%", () => {
    mockGoals = [makeGoal({ currentAmount: "6000", targetAmount: "5000" })];
    renderWidget();
    const bar = screen.getByTestId("gsw-progress-bar");
    expect(bar).toHaveStyle({ width: "100%" });
  });

  it("renders type badge", () => {
    mockGoals = [makeGoal({ type: "debt_payoff" })];
    renderWidget();
    expect(screen.getByText("Debt Payoff")).toBeInTheDocument();
  });

  it("shows status label when goal has a status", () => {
    // savings_target, 50% actual, ~38% expected → on_track
    mockGoals = [makeGoal({ currentAmount: "2500", targetAmount: "5000" })];
    renderWidget();
    expect(screen.getByTestId("gsw-status-label")).toBeInTheDocument();
  });
});

// ── Footer / navigation link (T011) ─────────────────────────────────────────

describe("GoalsSummaryWidget — footer navigation", () => {
  it("renders See all goals link to /goals when goals present", () => {
    mockGoals = [makeGoal()];
    renderWidget();
    const link = screen.getByRole("link", { name: "See all goals" });
    expect(link).toHaveAttribute("href", "/goals");
  });

  it("renders See all goals link even when empty", () => {
    mockGoals = [];
    renderWidget();
    const link = screen.getByRole("link", { name: "See all goals" });
    expect(link).toHaveAttribute("href", "/goals");
  });

  it("footer has gsw-footer test id", () => {
    mockGoals = [];
    renderWidget();
    expect(screen.getByTestId("gsw-footer")).toBeInTheDocument();
  });
});
