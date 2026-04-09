import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BudgetComparisonPanel } from "./BudgetComparisonPanel";
import type { CategoryRow } from "../utils/categoryData";

function row(category: string, total: number): CategoryRow {
  return { category, total, percentage: 100 };
}

function renderPanel(
  budgets: Record<string, number>,
  rows: CategoryRow[],
  onManageBudgets = vi.fn(),
) {
  return render(
    <BudgetComparisonPanel
      budgets={budgets}
      rows={rows}
      onManageBudgets={onManageBudgets}
    />,
  );
}

describe("BudgetComparisonPanel — empty state", () => {
  it("shows empty message when no budgets are set", () => {
    renderPanel({}, []);
    expect(screen.getByText(/No budgets set/)).toBeInTheDocument();
  });

  it("calls onManageBudgets when 'Add a budget' link is clicked", async () => {
    const onManageBudgets = vi.fn();
    renderPanel({}, [], onManageBudgets);
    await userEvent.click(screen.getByRole("button", { name: "Add a budget" }));
    expect(onManageBudgets).toHaveBeenCalled();
  });

  it("calls onManageBudgets when '+ Add budget' button in header is clicked", async () => {
    const onManageBudgets = vi.fn();
    renderPanel({}, [], onManageBudgets);
    await userEvent.click(screen.getByRole("button", { name: "+ Add budget" }));
    expect(onManageBudgets).toHaveBeenCalled();
  });
});

describe("BudgetComparisonPanel — table", () => {
  it("renders the section title", () => {
    renderPanel({ Groceries: 500 }, [row("Groceries", 200)]);
    expect(screen.getByText("Budget vs Actual")).toBeInTheDocument();
  });

  it("renders a row for each budgeted category", () => {
    renderPanel({ Groceries: 500, Transport: 200 }, [
      row("Groceries", 300),
      row("Transport", 100),
    ]);
    expect(screen.getByTestId("budget-row-Groceries")).toBeInTheDocument();
    expect(screen.getByTestId("budget-row-Transport")).toBeInTheDocument();
  });

  it("renders a total row", () => {
    renderPanel({ Groceries: 500 }, [row("Groceries", 200)]);
    expect(screen.getByTestId("budget-row-total")).toBeInTheDocument();
  });

  it("shows budget and actual amounts", () => {
    renderPanel({ Groceries: 500 }, [row("Groceries", 200)]);
    expect(screen.getByTestId("budget-row-Groceries")).toHaveTextContent(
      "$500.00",
    );
    expect(screen.getByTestId("budget-row-Groceries")).toHaveTextContent(
      "$200.00",
    );
  });

  it("shows remaining as budget minus actual", () => {
    renderPanel({ Groceries: 500 }, [row("Groceries", 200)]);
    expect(screen.getByTestId("budget-row-Groceries")).toHaveTextContent(
      "$300.00",
    );
  });

  it("shows zero actual for a category with no spend", () => {
    renderPanel({ Groceries: 500 }, []);
    expect(screen.getByTestId("budget-row-Groceries")).toHaveTextContent(
      "$0.00",
    );
  });

  it("renders 'Manage budgets' button when budgets exist", () => {
    renderPanel({ Groceries: 500 }, [row("Groceries", 200)]);
    expect(
      screen.getByRole("button", { name: "Manage budgets" }),
    ).toBeInTheDocument();
  });

  it("calls onManageBudgets when 'Manage budgets' is clicked", async () => {
    const onManageBudgets = vi.fn();
    renderPanel({ Groceries: 500 }, [row("Groceries", 200)], onManageBudgets);
    await userEvent.click(
      screen.getByRole("button", { name: "Manage budgets" }),
    );
    expect(onManageBudgets).toHaveBeenCalled();
  });
});

describe("BudgetComparisonPanel — status colours", () => {
  it("marks a row red when spend exceeds budget", () => {
    renderPanel({ Groceries: 500 }, [row("Groceries", 600)]);
    expect(screen.getByTestId("budget-row-Groceries")).toHaveClass(
      "budget-comparison__row--over",
    );
  });

  it("marks a row amber when spend is within 5% of budget", () => {
    renderPanel({ Groceries: 500 }, [row("Groceries", 490)]);
    expect(screen.getByTestId("budget-row-Groceries")).toHaveClass(
      "budget-comparison__row--on-budget",
    );
  });

  it("marks a row green when spend is below 95% of budget", () => {
    renderPanel({ Groceries: 500 }, [row("Groceries", 300)]);
    expect(screen.getByTestId("budget-row-Groceries")).toHaveClass(
      "budget-comparison__row--under",
    );
  });

  it("marks total row red when total spend exceeds total budget", () => {
    renderPanel({ Groceries: 500 }, [row("Groceries", 600)]);
    expect(screen.getByTestId("budget-row-total")).toHaveClass(
      "budget-comparison__row--over",
    );
  });

  it("marks total row green when total spend is well under total budget", () => {
    renderPanel({ Groceries: 500 }, [row("Groceries", 200)]);
    expect(screen.getByTestId("budget-row-total")).toHaveClass(
      "budget-comparison__row--under",
    );
  });
});
