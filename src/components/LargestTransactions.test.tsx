import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LargestTransactions } from "./LargestTransactions";
import type { Transaction } from "../utils/csvParser";

function tx(
  amount: number,
  description = "Test",
  category = "Food",
): Transaction {
  return { date: new Date("2025-03-15"), description, amount, category };
}

describe("LargestTransactions", () => {
  it("shows empty state when no transactions", () => {
    render(<LargestTransactions transactions={[]} onCategoryClick={vi.fn()} />);
    expect(
      screen.getByText("No expense transactions for this month."),
    ).toBeInTheDocument();
  });

  it("shows empty state when only income transactions", () => {
    render(
      <LargestTransactions
        transactions={[tx(100), tx(200)]}
        onCategoryClick={vi.fn()}
      />,
    );
    expect(
      screen.getByText("No expense transactions for this month."),
    ).toBeInTheDocument();
  });

  it("excludes income and zero-amount transactions", () => {
    render(
      <LargestTransactions
        transactions={[tx(100), tx(0), tx(-50)]}
        onCategoryClick={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("renders the panel title", () => {
    render(<LargestTransactions transactions={[]} onCategoryClick={vi.fn()} />);
    expect(screen.getByText("Largest Expenses This Month")).toBeInTheDocument();
  });

  it("sorts expenses by absolute amount descending", () => {
    render(
      <LargestTransactions
        transactions={[tx(-20, "Small"), tx(-100, "Big"), tx(-50, "Mid")]}
        onCategoryClick={vi.fn()}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Big");
    expect(items[1]).toHaveTextContent("Mid");
    expect(items[2]).toHaveTextContent("Small");
  });

  it("limits display to top 10 transactions", () => {
    const many = Array.from({ length: 15 }, (_, i) =>
      tx(-(i + 1) * 10, `Txn ${i + 1}`),
    );
    render(
      <LargestTransactions transactions={many} onCategoryClick={vi.fn()} />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
  });

  it("shows all when fewer than 10 transactions", () => {
    render(
      <LargestTransactions
        transactions={[tx(-10, "A"), tx(-20, "B"), tx(-30, "C")]}
        onCategoryClick={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("displays the absolute amount formatted in currency", () => {
    render(
      <LargestTransactions
        transactions={[tx(-1234.5, "Rent")]}
        onCategoryClick={vi.fn()}
      />,
    );
    expect(screen.getByText("$1,234.50")).toBeInTheDocument();
  });

  it("displays description and category for each row", () => {
    render(
      <LargestTransactions
        transactions={[tx(-50, "Supermarket", "Groceries")]}
        onCategoryClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Supermarket")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
  });

  it("uses Uncategorised label for transactions without a category", () => {
    const t: Transaction = {
      date: new Date("2025-03-01"),
      description: "Mystery",
      amount: -40,
    };
    render(
      <LargestTransactions transactions={[t]} onCategoryClick={vi.fn()} />,
    );
    expect(screen.getByText("Uncategorised")).toBeInTheDocument();
  });

  it("calls onCategoryClick with the transaction category when a row is clicked", async () => {
    const onCategoryClick = vi.fn();
    render(
      <LargestTransactions
        transactions={[tx(-50, "Supermarket", "Groceries")]}
        onCategoryClick={onCategoryClick}
      />,
    );
    await userEvent.click(screen.getByRole("listitem"));
    expect(onCategoryClick).toHaveBeenCalledWith("Groceries");
  });

  it("calls onCategoryClick with Uncategorised for transactions without a category", async () => {
    const onCategoryClick = vi.fn();
    const t: Transaction = {
      date: new Date("2025-03-01"),
      description: "Mystery",
      amount: -40,
    };
    render(
      <LargestTransactions
        transactions={[t]}
        onCategoryClick={onCategoryClick}
      />,
    );
    await userEvent.click(screen.getByRole("listitem"));
    expect(onCategoryClick).toHaveBeenCalledWith("Uncategorised");
  });
});
