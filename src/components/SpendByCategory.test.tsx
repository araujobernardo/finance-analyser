import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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

describe("SpendByCategory", () => {
  it("shows empty state when no transactions", () => {
    render(<SpendByCategory transactions={[]} />);
    expect(
      screen.getByText("No expense transactions for this month."),
    ).toBeInTheDocument();
  });

  it("shows empty state when only income transactions", () => {
    render(<SpendByCategory transactions={[tx(100), tx(200)]} />);
    expect(
      screen.getByText("No expense transactions for this month."),
    ).toBeInTheDocument();
  });

  it("renders a row for each spending category", () => {
    render(
      <SpendByCategory
        transactions={[tx(-50, "Food"), tx(-30, "Transport"), tx(100, "Food")]}
      />,
    );
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
  });

  it("excludes income from totals", () => {
    render(
      <SpendByCategory transactions={[tx(-100, "Food"), tx(500, "Food")]} />,
    );
    // Only $100 expense should count, not $500 income
    expect(screen.getByText("$100.00")).toBeInTheDocument();
  });

  it("sums amounts correctly per category", () => {
    render(
      <SpendByCategory
        transactions={[tx(-40, "Food"), tx(-60, "Food"), tx(-30, "Transport")]}
      />,
    );
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("$30.00")).toBeInTheDocument();
  });

  it("shows percentages for each row", () => {
    render(
      <SpendByCategory
        transactions={[tx(-75, "Food"), tx(-25, "Transport")]}
      />,
    );
    expect(screen.getByText("75.0%")).toBeInTheDocument();
    expect(screen.getByText("25.0%")).toBeInTheDocument();
  });

  it("sorts rows by amount descending", () => {
    render(
      <SpendByCategory
        transactions={[tx(-20, "Transport"), tx(-80, "Food")]}
      />,
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Food");
    expect(rows[1]).toHaveTextContent("Transport");
  });

  it("puts Uncategorised last regardless of amount", () => {
    render(
      <SpendByCategory
        transactions={[
          tx(-200, "Uncategorised"),
          tx(-10, "Food"),
          tx(-10, "Transport"),
        ]}
      />,
    );
    const rows = screen.getAllByRole("listitem");
    expect(rows[rows.length - 1]).toHaveTextContent("Uncategorised");
  });

  it("applies uncategorised style to Uncategorised row", () => {
    render(<SpendByCategory transactions={[tx(-50, "Uncategorised")]} />);
    const row = screen.getByRole("listitem");
    expect(row).toHaveClass("spend-row--uncategorised");
  });

  it("groups transactions without a category under Uncategorised", () => {
    const noCategory: Transaction = {
      date: new Date("2025-03-01"),
      description: "Mystery",
      amount: -40,
    };
    render(<SpendByCategory transactions={[noCategory]} />);
    expect(screen.getByText("Uncategorised")).toBeInTheDocument();
  });

  it("handles single category — 100%", () => {
    render(<SpendByCategory transactions={[tx(-150, "Food")]} />);
    expect(screen.getByText("100.0%")).toBeInTheDocument();
  });

  it("renders the section title", () => {
    render(<SpendByCategory transactions={[]} />);
    expect(screen.getByText("Spend by Category")).toBeInTheDocument();
  });
});
