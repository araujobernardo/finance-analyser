import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TransactionList } from "./TransactionList";
import type { ApiTransaction } from "../types/api";

// ── Mock useApi ────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();
vi.mock("../lib/api", () => ({
  useApi: () => ({ apiFetch: mockApiFetch }),
  API_BASE: "",
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function makeTransaction(
  overrides: Partial<ApiTransaction> = {},
): ApiTransaction {
  return {
    id: "txn-1",
    userId: "user-1",
    accountId: "acc-1",
    date: "2024-03-15",
    amount: -85.5,
    description: "COUNTDOWN SUPERMARKET",
    category: "Groceries",
    isTransfer: false,
    isManualTransfer: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("TransactionList", () => {
  it("renders a row for each transaction", () => {
    const txns = [
      makeTransaction({ id: "t1", description: "COUNTDOWN" }),
      makeTransaction({
        id: "t2",
        description: "UBER EATS",
        category: "Dining",
      }),
    ];
    render(
      <TransactionList transactions={txns} onTransactionsChange={vi.fn()} />,
    );
    expect(screen.getByText("COUNTDOWN")).toBeInTheDocument();
    expect(screen.getByText("UBER EATS")).toBeInTheDocument();
  });

  it("shows an empty state message when there are no transactions", () => {
    render(
      <TransactionList transactions={[]} onTransactionsChange={vi.fn()} />,
    );
    expect(screen.getByText(/no transactions/i)).toBeInTheDocument();
  });

  it("displays negative amounts in a negative style", () => {
    const txns = [makeTransaction({ amount: -50 })];
    render(
      <TransactionList transactions={txns} onTransactionsChange={vi.fn()} />,
    );
    const amountCell = screen.getByText("-50.00");
    expect(amountCell).toHaveClass("txn-negative");
  });

  it("displays positive amounts in a positive style with a + prefix", () => {
    const txns = [makeTransaction({ amount: 3000 })];
    render(
      <TransactionList transactions={txns} onTransactionsChange={vi.fn()} />,
    );
    const amountCell = screen.getByText("+3000.00");
    expect(amountCell).toHaveClass("txn-positive");
  });

  it("renders CategoryBadge for each transaction", () => {
    const txns = [
      makeTransaction({ id: "t1", category: "Groceries" }),
      makeTransaction({ id: "t2", category: "Transport" }),
    ];
    render(
      <TransactionList transactions={txns} onTransactionsChange={vi.fn()} />,
    );
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
  });

  it("PATCHes /api/transactions/:id and calls onTransactionsChange when category is changed", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => makeTransaction({ category: "Dining" }),
    });
    const onChange = vi.fn();
    const txns = [makeTransaction({ id: "txn-1", category: "Groceries" })];

    render(
      <TransactionList transactions={txns} onTransactionsChange={onChange} />,
    );

    // Open the dropdown for the first badge
    fireEvent.click(screen.getByRole("button", { name: /groceries/i }));
    // Select a new category
    fireEvent.mouseDown(screen.getByRole("option", { name: "Dining" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/transactions/txn-1",
        expect.objectContaining({ method: "PATCH" }),
      );
      expect(onChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ category: "Dining" }),
        ]),
      );
    });
  });

  it("does not call onTransactionsChange when PATCH fails", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });
    const onChange = vi.fn();
    const txns = [makeTransaction({ id: "txn-1", category: "Groceries" })];

    render(
      <TransactionList transactions={txns} onTransactionsChange={onChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /groceries/i }));
    fireEvent.mouseDown(screen.getByRole("option", { name: "Dining" }));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalled();
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows Uncategorised badge for transactions with no category", () => {
    const txns = [makeTransaction({ category: null })];
    render(
      <TransactionList transactions={txns} onTransactionsChange={vi.fn()} />,
    );
    expect(
      screen.getByRole("button", { name: /uncategorised/i }),
    ).toBeInTheDocument();
  });
});
