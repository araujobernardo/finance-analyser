import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TransactionList } from "./TransactionList";
import type { Transaction } from "../utils/csvParser";
import * as storage from "../services/storage";

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    date: new Date("2024-03-15"),
    description: "COUNTDOWN SUPERMARKET",
    amount: -85.5,
    category: "Groceries",
    ...overrides,
  };
}

const MONTH_KEY = "2024-03";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("TransactionList", () => {
  it("renders a row for each transaction", () => {
    const txns = [
      makeTransaction({ description: "COUNTDOWN" }),
      makeTransaction({ description: "UBER EATS", category: "Dining" }),
    ];
    render(
      <TransactionList
        monthKey={MONTH_KEY}
        transactions={txns}
        onTransactionsChange={vi.fn()}
      />,
    );
    expect(screen.getByText("COUNTDOWN")).toBeInTheDocument();
    expect(screen.getByText("UBER EATS")).toBeInTheDocument();
  });

  it("shows an empty state message when there are no transactions", () => {
    render(
      <TransactionList
        monthKey={MONTH_KEY}
        transactions={[]}
        onTransactionsChange={vi.fn()}
      />,
    );
    expect(screen.getByText(/no transactions/i)).toBeInTheDocument();
  });

  it("displays negative amounts in a negative style", () => {
    const txns = [makeTransaction({ amount: -50 })];
    render(
      <TransactionList
        monthKey={MONTH_KEY}
        transactions={txns}
        onTransactionsChange={vi.fn()}
      />,
    );
    const amountCell = screen.getByText("-50.00");
    expect(amountCell).toHaveClass("txn-negative");
  });

  it("displays positive amounts in a positive style with a + prefix", () => {
    const txns = [makeTransaction({ amount: 3000 })];
    render(
      <TransactionList
        monthKey={MONTH_KEY}
        transactions={txns}
        onTransactionsChange={vi.fn()}
      />,
    );
    const amountCell = screen.getByText("+3000.00");
    expect(amountCell).toHaveClass("txn-positive");
  });

  it("renders CategoryBadge for each transaction", () => {
    const txns = [
      makeTransaction({ category: "Groceries" }),
      makeTransaction({ category: "Transport" }),
    ];
    render(
      <TransactionList
        monthKey={MONTH_KEY}
        transactions={txns}
        onTransactionsChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
  });

  it("calls updateTransactionCategory and onTransactionsChange when category is changed", () => {
    const updateSpy = vi
      .spyOn(storage, "updateTransactionCategory")
      .mockReturnValue({ success: true });
    const onChange = vi.fn();
    const txns = [makeTransaction({ category: "Groceries" })];

    render(
      <TransactionList
        monthKey={MONTH_KEY}
        transactions={txns}
        onTransactionsChange={onChange}
      />,
    );

    // Open the dropdown for the first badge
    fireEvent.click(screen.getByRole("button", { name: /groceries/i }));
    // Select a new category
    fireEvent.mouseDown(screen.getByRole("option", { name: "Dining" }));

    expect(updateSpy).toHaveBeenCalledWith(MONTH_KEY, 0, "Dining");
    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ category: "Dining" })]),
    );
  });

  it("shows Uncategorised badge for transactions with no category", () => {
    const txns = [makeTransaction({ category: undefined })];
    render(
      <TransactionList
        monthKey={MONTH_KEY}
        transactions={txns}
        onTransactionsChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /uncategorised/i }),
    ).toBeInTheDocument();
  });
});
