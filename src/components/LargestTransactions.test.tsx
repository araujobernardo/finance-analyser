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
      screen.getByText("No transactions for this period."),
    ).toBeInTheDocument();
  });

  it("renders the panel title", () => {
    render(<LargestTransactions transactions={[]} onCategoryClick={vi.fn()} />);
    expect(screen.getByText("Largest Transactions")).toBeInTheDocument();
  });

  it("includes both debits and credits in the top-10 list", () => {
    render(
      <LargestTransactions
        transactions={[tx(-100, "Expense"), tx(200, "Income")]}
        onCategoryClick={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Expense")).toBeInTheDocument();
    expect(screen.getByText("Income")).toBeInTheDocument();
  });

  it("sorts by absolute amount descending", () => {
    render(
      <LargestTransactions
        transactions={[tx(-20, "Small"), tx(100, "Big"), tx(-50, "Mid")]}
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

  it("renders rank numbers 1 through N", () => {
    render(
      <LargestTransactions
        transactions={[tx(-30, "A"), tx(-20, "B"), tx(-10, "C")]}
        onCategoryClick={vi.fn()}
      />,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("truncates descriptions longer than 40 characters", () => {
    const longDesc = "A".repeat(50);
    render(
      <LargestTransactions
        transactions={[tx(-10, longDesc)]}
        onCategoryClick={vi.fn()}
      />,
    );
    expect(screen.getByText("A".repeat(40) + "…")).toBeInTheDocument();
  });

  it("adds a title tooltip when description is truncated", () => {
    const longDesc = "A".repeat(50);
    render(
      <LargestTransactions
        transactions={[tx(-10, longDesc)]}
        onCategoryClick={vi.fn()}
      />,
    );
    const desc = screen.getByText("A".repeat(40) + "…");
    expect(desc).toHaveAttribute("title", longDesc);
  });

  it("does not add a title tooltip for short descriptions", () => {
    render(
      <LargestTransactions
        transactions={[tx(-10, "Short desc")]}
        onCategoryClick={vi.fn()}
      />,
    );
    const desc = screen.getByText("Short desc");
    expect(desc).not.toHaveAttribute("title");
  });

  it("applies debit styling to negative amounts", () => {
    render(
      <LargestTransactions
        transactions={[tx(-50, "Expense")]}
        onCategoryClick={vi.fn()}
      />,
    );
    const amt = screen.getByText("$50.00");
    expect(amt).toHaveClass("largest-txns__amount--debit");
  });

  it("applies credit styling to positive amounts", () => {
    render(
      <LargestTransactions
        transactions={[tx(200, "Salary")]}
        onCategoryClick={vi.fn()}
      />,
    );
    const amt = screen.getByText("$200.00");
    expect(amt).toHaveClass("largest-txns__amount--credit");
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

describe("LargestTransactions filter chip and category filtering", () => {
  it("does not render the filter chip when selectedCategory is null", () => {
    render(
      <LargestTransactions
        transactions={[tx(-50, "Supermarket", "Groceries")]}
        selectedCategory={null}
        onCategoryClick={vi.fn()}
      />,
    );
    expect(screen.queryByText(/^Filtered:/)).not.toBeInTheDocument();
  });

  it("renders the filter chip with the category name when selectedCategory is set", () => {
    render(
      <LargestTransactions
        transactions={[tx(-50, "Supermarket", "Groceries")]}
        selectedCategory="Groceries"
        onCategoryClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Filtered: Groceries")).toBeInTheDocument();
  });

  it("shows only matching-category transactions when selectedCategory is set", () => {
    render(
      <LargestTransactions
        transactions={[
          tx(-50, "Supermarket", "Groceries"),
          tx(-80, "Fuel", "Transport"),
          tx(-30, "Salad", "Groceries"),
        ]}
        selectedCategory="Groceries"
        onCategoryClick={vi.fn()}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(screen.getByText("Supermarket")).toBeInTheDocument();
    expect(screen.getByText("Salad")).toBeInTheDocument();
    expect(screen.queryByText("Fuel")).not.toBeInTheDocument();
  });

  it("shows all transactions when selectedCategory is null", () => {
    render(
      <LargestTransactions
        transactions={[
          tx(-50, "Supermarket", "Groceries"),
          tx(-80, "Fuel", "Transport"),
        ]}
        selectedCategory={null}
        onCategoryClick={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Supermarket")).toBeInTheDocument();
    expect(screen.getByText("Fuel")).toBeInTheDocument();
  });

  it("restores full list when selectedCategory changes from a value to null", () => {
    const { rerender } = render(
      <LargestTransactions
        transactions={[
          tx(-50, "Supermarket", "Groceries"),
          tx(-80, "Fuel", "Transport"),
        ]}
        selectedCategory="Groceries"
        onCategoryClick={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(1);

    rerender(
      <LargestTransactions
        transactions={[
          tx(-50, "Supermarket", "Groceries"),
          tx(-80, "Fuel", "Transport"),
        ]}
        selectedCategory={null}
        onCategoryClick={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("shows empty state when selectedCategory filter results in no matching transactions", () => {
    render(
      <LargestTransactions
        transactions={[tx(-50, "Supermarket", "Groceries")]}
        selectedCategory="Transport"
        onCategoryClick={vi.fn()}
      />,
    );
    expect(
      screen.getByText("No transactions for this period."),
    ).toBeInTheDocument();
  });
});
