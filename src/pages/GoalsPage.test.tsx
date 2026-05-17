import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GoalsPage } from "./GoalsPage";
import type { ApiGoal } from "../types/api";

// ── Mock useApi ────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();
vi.mock("../lib/api", () => ({
  useApi: () => ({ apiFetch: mockApiFetch }),
  API_BASE: "",
}));

// ── Mock useToast ──────────────────────────────────────────────────────────

vi.mock("../hooks/useToast", () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

// ── Mock GoalsContext ──────────────────────────────────────────────────────

const mockGoals: ApiGoal[] = [];
let mockIsLoading = false;
const mockUpdateGoal = vi.fn().mockResolvedValue(true);
const mockRemoveGoal = vi.fn().mockResolvedValue(true);

vi.mock("../context/GoalsContext", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../context/GoalsContext")>();
  return {
    ...original,
    useGoals: () => ({
      goals: mockGoals,
      isLoading: mockIsLoading,
      addGoal: vi.fn().mockResolvedValue(true),
      updateGoal: mockUpdateGoal,
      removeGoal: mockRemoveGoal,
    }),
  };
});

// ── Mock GoalCard to avoid full card render ────────────────────────────────

vi.mock("../components/goals/GoalCard", () => ({
  GoalCard: ({
    goal,
    onEdit,
    onStatusChange,
    onDelete,
  }: {
    goal: { id: string; name: string; type: string };
    onEdit?: (goal: { id: string; name: string; type: string }) => void;
    onStatusChange?: (id: string, status: string) => void;
    onDelete?: (id: string) => void;
  }) => (
    <div data-testid={`mock-goal-card-${goal.id}`}>
      <span>{goal.name}</span>
      <span>{goal.type}</span>
      {onEdit && (
        <button
          data-testid={`mock-edit-btn-${goal.id}`}
          onClick={() => onEdit(goal)}
        >
          Edit
        </button>
      )}
      {onStatusChange && (
        <>
          <button
            data-testid={`mock-achieve-btn-${goal.id}`}
            onClick={() => onStatusChange(goal.id, "achieved")}
          >
            Mark achieved
          </button>
          <button
            data-testid={`mock-abandon-btn-${goal.id}`}
            onClick={() => onStatusChange(goal.id, "abandoned")}
          >
            Mark abandoned
          </button>
        </>
      )}
      {onDelete && (
        <button
          data-testid={`mock-delete-btn-${goal.id}`}
          onClick={() => onDelete(goal.id)}
        >
          Delete
        </button>
      )}
    </div>
  ),
}));

// ── Mock GoalModal to avoid full modal render ──────────────────────────────

vi.mock("../components/goals/GoalModal", () => ({
  GoalModal: ({
    onClose,
    goal,
  }: {
    onClose: () => void;
    goal?: { id: string; name: string };
  }) => (
    <div data-testid="mock-goal-modal">
      {goal && <span data-testid="mock-modal-goal-name">{goal.name}</span>}
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function renderPage() {
  return render(<GoalsPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGoals.length = 0;
  mockIsLoading = false;
  mockApiFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ goals: [] }),
  });
  mockUpdateGoal.mockResolvedValue(true);
  mockRemoveGoal.mockResolvedValue(true);
});

// ── Render ─────────────────────────────────────────────────────────────────

describe("GoalsPage — render", () => {
  it("renders the page heading", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /goals/i })).toBeInTheDocument();
  });

  it("renders the Add Goal button", () => {
    renderPage();
    expect(
      screen.getByRole("button", { name: /add goal/i }),
    ).toBeInTheDocument();
  });

  it("shows empty state when goals list is empty", () => {
    renderPage();
    expect(screen.getByTestId("goals-empty")).toBeInTheDocument();
    expect(
      screen.getByText(/no active goals yet — add one to get started/i),
    ).toBeInTheDocument();
  });

  it("shows loading indicator when isLoading is true", () => {
    mockIsLoading = true;
    renderPage();
    expect(screen.getByTestId("goals-loading")).toBeInTheDocument();
  });
});

// ── Goal list ──────────────────────────────────────────────────────────────

describe("GoalsPage — goal list", () => {
  it("renders each goal's name and type when goals exist", () => {
    mockGoals.push(
      {
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
      },
      {
        id: "g2",
        userId: "u1",
        name: "Car Loan",
        type: "debt_payoff",
        targetAmount: "12000",
        targetDate: null,
        linkedAccountId: null,
        categoryName: null,
        currentAmount: null,
        status: "active",
        createdAt: "2026-05-17T00:00:00.000Z",
        updatedAt: "2026-05-17T00:00:00.000Z",
      },
    );
    renderPage();
    expect(screen.getByTestId("goals-list")).toBeInTheDocument();
    expect(screen.getByText("Emergency Fund")).toBeInTheDocument();
    expect(screen.getByText("savings_target")).toBeInTheDocument(); // mock renders raw type
    expect(screen.getByText("Car Loan")).toBeInTheDocument();
    expect(screen.getByText("debt_payoff")).toBeInTheDocument(); // mock renders raw type
  });
});

// ── Completed section ──────────────────────────────────────────────────────

describe("GoalsPage — completed section", () => {
  function makeGoal(overrides: Partial<ApiGoal> = {}): ApiGoal {
    return {
      id: "gx",
      userId: "u1",
      name: "Old Goal",
      type: "savings_target",
      targetAmount: "1000",
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

  it("does not render completed section when no completed goals", () => {
    mockGoals.push(makeGoal({ id: "ga", status: "active" }));
    renderPage();
    expect(
      screen.queryByTestId("goals-completed-section"),
    ).not.toBeInTheDocument();
  });

  it("renders completed toggle button when completed goals exist", () => {
    mockGoals.push(makeGoal({ id: "gc", status: "achieved" }));
    renderPage();
    expect(screen.getByTestId("goals-completed-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("goals-completed-toggle").textContent).toMatch(
      /show 1 completed goal/i,
    );
  });

  it("completed list is hidden by default", () => {
    mockGoals.push(makeGoal({ id: "gc", status: "achieved" }));
    renderPage();
    expect(
      screen.queryByTestId("goals-completed-list"),
    ).not.toBeInTheDocument();
  });

  it("completed list shows after clicking toggle", async () => {
    mockGoals.push(
      makeGoal({ id: "gc", status: "achieved", name: "Done Goal" }),
    );
    renderPage();
    await userEvent.click(screen.getByTestId("goals-completed-toggle"));
    expect(screen.getByTestId("goals-completed-list")).toBeInTheDocument();
    expect(screen.getByText("Done Goal")).toBeInTheDocument();
  });

  it("completed list hides again after second toggle click", async () => {
    mockGoals.push(makeGoal({ id: "gc", status: "achieved" }));
    renderPage();
    await userEvent.click(screen.getByTestId("goals-completed-toggle"));
    expect(screen.getByTestId("goals-completed-list")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("goals-completed-toggle"));
    expect(
      screen.queryByTestId("goals-completed-list"),
    ).not.toBeInTheDocument();
  });
});

// ── Modal (add mode) ───────────────────────────────────────────────────────

describe("GoalsPage — modal", () => {
  it("modal is not visible on initial render", () => {
    renderPage();
    expect(screen.queryByTestId("mock-goal-modal")).not.toBeInTheDocument();
  });

  it("opens the modal when Add Goal is clicked", async () => {
    renderPage();
    await userEvent.click(screen.getByTestId("goals-add-btn"));
    expect(screen.getByTestId("mock-goal-modal")).toBeInTheDocument();
  });

  it("closes the modal when onClose is called", async () => {
    renderPage();
    await userEvent.click(screen.getByTestId("goals-add-btn"));
    expect(screen.getByTestId("mock-goal-modal")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /close modal/i }));
    expect(screen.queryByTestId("mock-goal-modal")).not.toBeInTheDocument();
  });

  it("opens modal without a goal when Add Goal is clicked (add mode)", async () => {
    renderPage();
    await userEvent.click(screen.getByTestId("goals-add-btn"));
    expect(screen.getByTestId("mock-goal-modal")).toBeInTheDocument();
    expect(
      screen.queryByTestId("mock-modal-goal-name"),
    ).not.toBeInTheDocument();
  });
});

// ── Edit flow ──────────────────────────────────────────────────────────────

describe("GoalsPage — edit flow", () => {
  function makeGoal(overrides: Partial<ApiGoal> = {}): ApiGoal {
    return {
      id: "ge",
      userId: "u1",
      name: "My Goal",
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

  it("passes onEdit to GoalCard for active goals", () => {
    mockGoals.push(makeGoal({ id: "g1", name: "Emergency Fund" }));
    renderPage();
    expect(screen.getByTestId("mock-edit-btn-g1")).toBeInTheDocument();
  });

  it("clicking GoalCard edit button opens modal in edit mode with goal data", async () => {
    mockGoals.push(makeGoal({ id: "g1", name: "Emergency Fund" }));
    renderPage();
    await userEvent.click(screen.getByTestId("mock-edit-btn-g1"));
    expect(screen.getByTestId("mock-goal-modal")).toBeInTheDocument();
    expect(screen.getByTestId("mock-modal-goal-name")).toHaveTextContent(
      "Emergency Fund",
    );
  });

  it("closing the edit modal hides it", async () => {
    mockGoals.push(makeGoal({ id: "g1", name: "Emergency Fund" }));
    renderPage();
    await userEvent.click(screen.getByTestId("mock-edit-btn-g1"));
    expect(screen.getByTestId("mock-goal-modal")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /close modal/i }));
    expect(screen.queryByTestId("mock-goal-modal")).not.toBeInTheDocument();
  });

  it("passes onEdit to GoalCard for completed goals", async () => {
    mockGoals.push(
      makeGoal({ id: "gc", name: "Old Goal", status: "achieved" }),
    );
    renderPage();
    await userEvent.click(screen.getByTestId("goals-completed-toggle"));
    expect(screen.getByTestId("mock-edit-btn-gc")).toBeInTheDocument();
  });

  it("clicking completed GoalCard edit button opens modal with that goal", async () => {
    mockGoals.push(
      makeGoal({ id: "gc", name: "Old Goal", status: "achieved" }),
    );
    renderPage();
    await userEvent.click(screen.getByTestId("goals-completed-toggle"));
    await userEvent.click(screen.getByTestId("mock-edit-btn-gc"));
    expect(screen.getByTestId("mock-goal-modal")).toBeInTheDocument();
    expect(screen.getByTestId("mock-modal-goal-name")).toHaveTextContent(
      "Old Goal",
    );
  });
});

// ── Status change flow ─────────────────────────────────────────────────────

describe("GoalsPage — status change flow", () => {
  function makeGoal(overrides: Partial<ApiGoal> = {}): ApiGoal {
    return {
      id: "gs",
      userId: "u1",
      name: "My Goal",
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

  it("passes onStatusChange to active GoalCards", () => {
    mockGoals.push(makeGoal({ id: "g1" }));
    renderPage();
    expect(screen.getByTestId("mock-achieve-btn-g1")).toBeInTheDocument();
    expect(screen.getByTestId("mock-abandon-btn-g1")).toBeInTheDocument();
  });

  it("calls updateGoal with 'achieved' status when Mark achieved is clicked", async () => {
    mockGoals.push(makeGoal({ id: "g1" }));
    renderPage();
    await userEvent.click(screen.getByTestId("mock-achieve-btn-g1"));
    expect(mockUpdateGoal).toHaveBeenCalledWith("g1", { status: "achieved" });
  });

  it("calls updateGoal with 'abandoned' status when Mark abandoned is clicked", async () => {
    mockGoals.push(makeGoal({ id: "g1" }));
    renderPage();
    await userEvent.click(screen.getByTestId("mock-abandon-btn-g1"));
    expect(mockUpdateGoal).toHaveBeenCalledWith("g1", { status: "abandoned" });
  });
});

// ── Delete flow ────────────────────────────────────────────────────────────

describe("GoalsPage — delete flow", () => {
  function makeGoal(overrides: Partial<ApiGoal> = {}): ApiGoal {
    return {
      id: "gd",
      userId: "u1",
      name: "Goal to Delete",
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

  it("passes onDelete to active GoalCards", () => {
    mockGoals.push(makeGoal({ id: "g1" }));
    renderPage();
    expect(screen.getByTestId("mock-delete-btn-g1")).toBeInTheDocument();
  });

  it("confirmation prompt is not visible initially", () => {
    renderPage();
    expect(
      screen.queryByTestId("goals-delete-confirm"),
    ).not.toBeInTheDocument();
  });

  it("clicking Delete on a GoalCard shows the confirmation prompt", async () => {
    mockGoals.push(makeGoal({ id: "g1" }));
    renderPage();
    await userEvent.click(screen.getByTestId("mock-delete-btn-g1"));
    expect(screen.getByTestId("goals-delete-confirm")).toBeInTheDocument();
    expect(
      screen.getByText(/delete this goal\? this cannot be undone/i),
    ).toBeInTheDocument();
  });

  it("clicking Cancel hides the confirmation prompt without calling removeGoal", async () => {
    mockGoals.push(makeGoal({ id: "g1" }));
    renderPage();
    await userEvent.click(screen.getByTestId("mock-delete-btn-g1"));
    expect(screen.getByTestId("goals-delete-confirm")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("goals-delete-cancel"));
    expect(
      screen.queryByTestId("goals-delete-confirm"),
    ).not.toBeInTheDocument();
    expect(mockRemoveGoal).not.toHaveBeenCalled();
  });

  it("clicking Confirm calls removeGoal with the pending id and hides the prompt", async () => {
    mockGoals.push(makeGoal({ id: "g1" }));
    renderPage();
    await userEvent.click(screen.getByTestId("mock-delete-btn-g1"));
    await userEvent.click(screen.getByTestId("goals-delete-confirm-btn"));
    expect(mockRemoveGoal).toHaveBeenCalledOnce();
    expect(mockRemoveGoal).toHaveBeenCalledWith("g1");
    expect(
      screen.queryByTestId("goals-delete-confirm"),
    ).not.toBeInTheDocument();
  });

  it("passes onDelete to completed GoalCards", async () => {
    mockGoals.push(makeGoal({ id: "gc", status: "achieved" }));
    renderPage();
    await userEvent.click(screen.getByTestId("goals-completed-toggle"));
    expect(screen.getByTestId("mock-delete-btn-gc")).toBeInTheDocument();
  });
});
