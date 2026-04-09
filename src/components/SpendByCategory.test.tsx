import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpendByCategory } from "./SpendByCategory";
import type { Transaction } from "../utils/csvParser";

function tx(amount: number, category = "Food"): Transaction {
  return {
    date: new Date("2025-03-01"),
    description: "Test",
    amount,
    category,
  };
}

function renderPanel(
  transactions: Transaction[],
  selectedCategory: string | null = null,
  onCategoryClick = vi.fn(),
) {
  return render(
    <SpendByCategory
      transactions={transactions}
      selectedCategory={selectedCategory}
      onCategoryClick={onCategoryClick}
    />,
  );
}

describe("SpendByCategory", () => {
  it("shows empty state when no transactions", () => {
    renderPanel([]);
    expect(
      screen.getByText("No expense transactions for this month."),
    ).toBeInTheDocument();
  });

  it("shows empty state when only income transactions", () => {
    renderPanel([tx(100), tx(200)]);
    expect(
      screen.getByText("No expense transactions for this month."),
    ).toBeInTheDocument();
  });

  it("renders a row for each spending category", () => {
    renderPanel([tx(-50, "Food"), tx(-30, "Transport"), tx(100, "Food")]);
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
  });

  it("excludes income from totals", () => {
    renderPanel([tx(-100, "Food"), tx(500, "Food")]);
    expect(screen.getByText("$100.00")).toBeInTheDocument();
  });

  it("sums amounts correctly per category", () => {
    renderPanel([tx(-40, "Food"), tx(-60, "Food"), tx(-30, "Transport")]);
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("$30.00")).toBeInTheDocument();
  });

  it("shows percentages for each row", () => {
    renderPanel([tx(-75, "Food"), tx(-25, "Transport")]);
    expect(screen.getByText("75.0%")).toBeInTheDocument();
    expect(screen.getByText("25.0%")).toBeInTheDocument();
  });

  it("sorts rows by amount descending", () => {
    renderPanel([tx(-20, "Transport"), tx(-80, "Food")]);
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Food");
    expect(rows[1]).toHaveTextContent("Transport");
  });

  it("puts Uncategorised last regardless of amount", () => {
    renderPanel([
      tx(-200, "Uncategorised"),
      tx(-10, "Food"),
      tx(-10, "Transport"),
    ]);
    const rows = screen.getAllByRole("listitem");
    expect(rows[rows.length - 1]).toHaveTextContent("Uncategorised");
  });

  it("applies uncategorised style to Uncategorised row", () => {
    renderPanel([tx(-50, "Uncategorised")]);
    expect(screen.getByRole("listitem")).toHaveClass(
      "spend-row--uncategorised",
    );
  });

  it("groups transactions without a category under Uncategorised", () => {
    const noCategory: Transaction = {
      date: new Date("2025-03-01"),
      description: "Mystery",
      amount: -40,
    };
    renderPanel([noCategory]);
    expect(screen.getByText("Uncategorised")).toBeInTheDocument();
  });

  it("handles single category — 100%", () => {
    renderPanel([tx(-150, "Food")]);
    expect(screen.getByText("100.0%")).toBeInTheDocument();
  });

  it("renders the section title", () => {
    renderPanel([]);
    expect(screen.getByText("Spend by Category")).toBeInTheDocument();
  });

  it("applies selected class to the active category row", () => {
    renderPanel([tx(-50, "Food"), tx(-30, "Transport")], "Food");
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveClass("spend-row--selected");
    expect(rows[1]).not.toHaveClass("spend-row--selected");
  });

  it("calls onCategoryClick with category name when a row is clicked", async () => {
    const onCategoryClick = vi.fn();
    renderPanel([tx(-50, "Food")], null, onCategoryClick);
    await userEvent.click(screen.getByText("Food"));
    expect(onCategoryClick).toHaveBeenCalledWith("Food");
  });

  it("calls onCategoryClick with null when the selected row is clicked again", async () => {
    const onCategoryClick = vi.fn();
    renderPanel([tx(-50, "Food")], "Food", onCategoryClick);
    await userEvent.click(screen.getByText("Food"));
    expect(onCategoryClick).toHaveBeenCalledWith(null);
  });
});
