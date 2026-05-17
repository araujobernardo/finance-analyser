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

vi.mock("../context/GoalsContext", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../context/GoalsContext")>();
  return {
    ...original,
    useGoals: () => ({
      goals: mockGoals,
      isLoading: mockIsLoading,
      addGoal: vi.fn().mockResolvedValue(true),
      updateGoal: vi.fn(),
      removeGoal: vi.fn(),
    }),
  };
});

// ── Mock GoalModal to avoid full modal render ──────────────────────────────

vi.mock("../components/goals/GoalModal", () => ({
  GoalModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="mock-goal-modal">
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
      screen.getByText(/no goals yet — add one to get started/i),
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
    expect(screen.getByText("savings_target")).toBeInTheDocument();
    expect(screen.getByText("Car Loan")).toBeInTheDocument();
    expect(screen.getByText("debt_payoff")).toBeInTheDocument();
  });
});

// ── Modal ──────────────────────────────────────────────────────────────────

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
});
