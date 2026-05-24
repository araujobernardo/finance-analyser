// #761 — Component tests for AddBudgetModal redesign

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddBudgetModal } from "./AddBudgetModal";

// ── Mock BudgetContext ────────────────────────────────────────────────────────

const mockAddBudget = vi.fn();

vi.mock("../../context/BudgetContext", () => ({
  useBudgets: () => ({
    selectedYear: 2026,
    selectedMonth: 5,
    addBudget: mockAddBudget,
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderModal(onClose = vi.fn()) {
  return render(<AddBudgetModal isOpen onClose={onClose} />);
}

beforeEach(() => {
  mockAddBudget.mockReset();
});

// ── Rendering ─────────────────────────────────────────────────────────────────

describe("AddBudgetModal — rendering", () => {
  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <AddBudgetModal isOpen={false} onClose={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the modal title", () => {
    renderModal();
    expect(
      screen.getByRole("heading", { name: "Add Budget" }),
    ).toBeInTheDocument();
  });

  it("renders the context-hint banner", () => {
    renderModal();
    expect(
      screen.getByText(/set a monthly spending limit for a category/i),
    ).toBeInTheDocument();
  });

  it("renders Category, Monthly Limit, and Month fields", () => {
    renderModal();
    expect(
      screen.getByTestId("budget-modal-category-input"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("budget-modal-limit-input")).toBeInTheDocument();
    expect(screen.getByTestId("budget-modal-month-input")).toBeInTheDocument();
  });

  it("renders Cancel and Add Budget buttons", () => {
    renderModal();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add budget/i }),
    ).toBeInTheDocument();
  });

  it("defaults the month input to selectedYear-selectedMonth from context", () => {
    renderModal();
    const monthInput = screen.getByTestId("budget-modal-month-input");
    expect((monthInput as HTMLInputElement).value).toBe("2026-05");
  });

  it("renders the NZD prefix", () => {
    renderModal();
    expect(screen.getByText("NZD")).toBeInTheDocument();
  });

  it("renders the month hint text", () => {
    renderModal();
    expect(
      screen.getByText(/budgets apply to a single calendar month/i),
    ).toBeInTheDocument();
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe("AddBudgetModal — inline validation", () => {
  it("shows category error when submitted with empty category", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: /add budget/i }));
    expect(screen.getByText(/category is required/i)).toBeInTheDocument();
  });

  it("shows limit error when submitted with empty limit", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(
      screen.getByTestId("budget-modal-category-input"),
      "Groceries",
    );
    await user.click(screen.getByRole("button", { name: /add budget/i }));
    expect(screen.getByText(/please enter a valid limit/i)).toBeInTheDocument();
  });

  it("shows limit error when limit input is left empty", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(
      screen.getByTestId("budget-modal-category-input"),
      "Groceries",
    );
    // limit is intentionally left blank
    await user.click(screen.getByRole("button", { name: /add budget/i }));
    expect(screen.getByText(/please enter a valid limit/i)).toBeInTheDocument();
  });

  it("clears category error once category is filled", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: /add budget/i }));
    expect(screen.getByText(/category is required/i)).toBeInTheDocument();
    await user.type(screen.getByTestId("budget-modal-category-input"), "Food");
    expect(screen.queryByText(/category is required/i)).toBeNull();
  });

  it("clears limit error once a valid limit is entered", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByTestId("budget-modal-category-input"), "Food");
    await user.click(screen.getByRole("button", { name: /add budget/i }));
    expect(screen.getByText(/please enter a valid limit/i)).toBeInTheDocument();
    await user.type(screen.getByTestId("budget-modal-limit-input"), "100");
    expect(screen.queryByText(/please enter a valid limit/i)).toBeNull();
  });
});

// ── Submission ────────────────────────────────────────────────────────────────

describe("AddBudgetModal — submission", () => {
  it("calls addBudget with correct data and closes modal on success", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    mockAddBudget.mockResolvedValue(undefined);
    render(<AddBudgetModal isOpen onClose={onClose} />);

    await user.type(
      screen.getByTestId("budget-modal-category-input"),
      "Groceries",
    );
    await user.type(screen.getByTestId("budget-modal-limit-input"), "500");
    await user.click(screen.getByRole("button", { name: /add budget/i }));

    expect(mockAddBudget).toHaveBeenCalledWith({
      categoryName: "Groceries",
      year: 2026,
      month: 5,
      limitAmount: 500,
    });
    // onClose is called after addBudget resolves
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("does not call addBudget when validation fails", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: /add budget/i }));
    expect(mockAddBudget).not.toHaveBeenCalled();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AddBudgetModal isOpen onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when close button (✕) is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<AddBudgetModal isOpen onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
