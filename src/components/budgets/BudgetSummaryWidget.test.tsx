// Fix #734 — Component tests for BudgetSummaryWidget

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BudgetSummaryWidget } from "./BudgetSummaryWidget";
import type { ApiBudget } from "../../types/api";

// ── Mock BudgetContext ────────────────────────────────────────────────────────

let mockBudgets: ApiBudget[] = [];
let mockLoading = false;

vi.mock("../../context/BudgetContext", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../context/BudgetContext")>();
  return {
    ...original,
    useBudgets: () => ({
      budgets: mockBudgets,
      loading: mockLoading,
      budgetDefaults: [],
      preferences: null,
      selectedYear: 2026,
      selectedMonth: 5,
      setSelectedMonth: vi.fn(),
      addBudget: vi.fn(),
      updateBudget: vi.fn(),
      deleteBudget: vi.fn(),
      upsertDefault: vi.fn(),
      deleteDefault: vi.fn(),
      updatePreferences: vi.fn(),
    }),
  };
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeBudget(overrides: Partial<ApiBudget> = {}): ApiBudget {
  return {
    id: "b1",
    categoryName: "Groceries",
    year: 2026,
    month: 5,
    limitAmount: 500,
    actualSpend: 250,
    remaining: 250,
    percentageUsed: 50,
    ...overrides,
  };
}

function renderWidget() {
  return render(<BudgetSummaryWidget />);
}

beforeEach(() => {
  mockBudgets = [];
  mockLoading = false;
});

// ── Null render conditions ────────────────────────────────────────────────────

describe("BudgetSummaryWidget — null render", () => {
  it("renders nothing while loading", () => {
    mockLoading = true;
    const { container } = renderWidget();
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when no budgets exist", () => {
    mockBudgets = [];
    const { container } = renderWidget();
    expect(container.firstChild).toBeNull();
  });
});

// ── data-testid=budget-section ────────────────────────────────────────────────

describe("BudgetSummaryWidget — budget-section testid", () => {
  it("renders data-testid=budget-section when budgets exist", () => {
    mockBudgets = [makeBudget()];
    renderWidget();
    expect(screen.getByTestId("budget-section")).toBeInTheDocument();
  });

  it("does NOT render data-testid=budget-section when no budgets", () => {
    mockBudgets = [];
    renderWidget();
    expect(screen.queryByTestId("budget-section")).toBeNull();
  });
});

// ── Category display ──────────────────────────────────────────────────────────

describe("BudgetSummaryWidget — category display", () => {
  it("shows the category name for each budget", () => {
    mockBudgets = [
      makeBudget({ id: "b1", categoryName: "Groceries" }),
      makeBudget({ id: "b2", categoryName: "Transport" }),
    ];
    renderWidget();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
  });

  it("shows the rounded percentage for each budget", () => {
    mockBudgets = [makeBudget({ percentageUsed: 66.7 })];
    renderWidget();
    expect(screen.getByText("67%")).toBeInTheDocument();
  });

  it("renders the Budget Summary heading", () => {
    mockBudgets = [makeBudget()];
    renderWidget();
    expect(screen.getByText("Budget Summary")).toBeInTheDocument();
  });
});

// ── Progress bar states ───────────────────────────────────────────────────────

describe("BudgetSummaryWidget — progress bar fill classes", () => {
  it("applies no warning/over class for a budget under 80%", () => {
    mockBudgets = [makeBudget({ percentageUsed: 50 })];
    const { container } = renderWidget();
    const fill = container.querySelector(".budget-summary-widget__bar-fill");
    expect(fill).toBeInTheDocument();
    expect(fill).not.toHaveClass("budget-summary-widget__bar-fill--warning");
    expect(fill).not.toHaveClass("budget-summary-widget__bar-fill--over");
  });

  it("applies warning class for a budget at 80–99%", () => {
    mockBudgets = [makeBudget({ percentageUsed: 85 })];
    const { container } = renderWidget();
    const fill = container.querySelector(".budget-summary-widget__bar-fill");
    expect(fill).toHaveClass("budget-summary-widget__bar-fill--warning");
    expect(fill).not.toHaveClass("budget-summary-widget__bar-fill--over");
  });

  it("applies over class for a budget at 100% or more", () => {
    mockBudgets = [makeBudget({ percentageUsed: 110 })];
    const { container } = renderWidget();
    const fill = container.querySelector(".budget-summary-widget__bar-fill");
    expect(fill).toHaveClass("budget-summary-widget__bar-fill--over");
    expect(fill).not.toHaveClass("budget-summary-widget__bar-fill--warning");
  });

  it("caps the bar fill width at 100% even when over 100%", () => {
    mockBudgets = [makeBudget({ percentageUsed: 150 })];
    const { container } = renderWidget();
    const fill = container.querySelector<HTMLElement>(
      ".budget-summary-widget__bar-fill",
    );
    expect(fill?.style.width).toBe("100%");
  });
});
