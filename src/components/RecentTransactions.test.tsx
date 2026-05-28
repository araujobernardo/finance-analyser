import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RecentTransactions } from "./RecentTransactions";
import type { ApiTransaction } from "../types/api";

function makeTxn(
  overrides: Partial<ApiTransaction> & { id: string },
): ApiTransaction {
  return {
    userId: "u1",
    accountId: "acc1",
    date: "2025-05-27",
    amount: -50,
    description: "Test Payee",
    category: "Groceries",
    isTransfer: false,
    isManualTransfer: false,
    createdAt: "2025-05-27T00:00:00Z",
    ...overrides,
  };
}

function renderWidget(transactions: ApiTransaction[], monthLabel = "May 2025") {
  return render(
    <MemoryRouter>
      <RecentTransactions transactions={transactions} monthLabel={monthLabel} />
    </MemoryRouter>,
  );
}

describe("RecentTransactions", () => {
  it("renders the widget container", () => {
    renderWidget([]);
    expect(
      screen.getByTestId("recent-transactions-widget"),
    ).toBeInTheDocument();
  });

  it("renders the card title", () => {
    renderWidget([]);
    expect(screen.getByText("Recent Transactions")).toBeInTheDocument();
  });

  it("renders the month label as subtitle", () => {
    renderWidget([], "April 2025");
    expect(screen.getByText("April 2025")).toBeInTheDocument();
  });

  it("shows empty state when no transactions provided", () => {
    renderWidget([]);
    expect(
      screen.getByText("No transactions for this period."),
    ).toBeInTheDocument();
  });

  it("shows empty state when all transactions are transfers", () => {
    renderWidget([
      makeTxn({ id: "1", isTransfer: true }),
      makeTxn({ id: "2", isTransfer: true }),
    ]);
    expect(
      screen.getByText("No transactions for this period."),
    ).toBeInTheDocument();
  });

  it("excludes transfer transactions from the list", () => {
    renderWidget([
      makeTxn({ id: "1", description: "Bank Transfer", isTransfer: true }),
      makeTxn({ id: "2", description: "Countdown", isTransfer: false }),
    ]);
    expect(screen.queryByText("Bank Transfer")).not.toBeInTheDocument();
    expect(screen.getByText("Countdown")).toBeInTheDocument();
  });

  it("renders non-transfer transaction rows", () => {
    renderWidget([
      makeTxn({ id: "1", description: "Countdown" }),
      makeTxn({ id: "2", description: "Metlink" }),
    ]);
    expect(screen.getAllByTestId("recent-txn-row")).toHaveLength(2);
  });

  it("limits to 7 most recent transactions", () => {
    const txns = Array.from({ length: 10 }, (_, i) =>
      makeTxn({
        id: String(i),
        description: `Payee ${i}`,
        date: `2025-05-${String(i + 1).padStart(2, "0")}`,
      }),
    );
    renderWidget(txns);
    expect(screen.getAllByTestId("recent-txn-row")).toHaveLength(7);
  });

  it("sorts transactions by date descending (most recent first)", () => {
    renderWidget([
      makeTxn({ id: "1", description: "Older", date: "2025-05-20" }),
      makeTxn({ id: "2", description: "Newest", date: "2025-05-27" }),
      makeTxn({ id: "3", description: "Middle", date: "2025-05-23" }),
    ]);
    const rows = screen.getAllByTestId("recent-txn-row");
    expect(rows[0]).toHaveTextContent("Newest");
    expect(rows[1]).toHaveTextContent("Middle");
    expect(rows[2]).toHaveTextContent("Older");
  });

  it("groups transactions by date with date dividers", () => {
    renderWidget([
      makeTxn({ id: "1", date: "2025-05-27", description: "A" }),
      makeTxn({ id: "2", date: "2025-05-25", description: "B" }),
    ]);
    expect(screen.getAllByTestId("date-divider")).toHaveLength(2);
  });

  it("places transactions on the same date under one divider", () => {
    renderWidget([
      makeTxn({ id: "1", date: "2025-05-27", description: "A" }),
      makeTxn({ id: "2", date: "2025-05-27", description: "B" }),
    ]);
    expect(screen.getAllByTestId("date-divider")).toHaveLength(1);
    expect(screen.getAllByTestId("recent-txn-row")).toHaveLength(2);
  });

  it("applies debit class to negative amounts", () => {
    renderWidget([makeTxn({ id: "1", amount: -50 })]);
    const amount = screen.getByText(/−\$50\.00/);
    expect(amount).toHaveClass("recent-txns__amount--debit");
  });

  it("applies credit class to positive amounts", () => {
    renderWidget([makeTxn({ id: "1", amount: 4800 })]);
    const amount = screen.getByText(/\+\$4,800\.00/);
    expect(amount).toHaveClass("recent-txns__amount--credit");
  });

  it("shows correct emoji for known categories", () => {
    renderWidget([
      makeTxn({ id: "1", category: "Groceries", description: "Countdown" }),
    ]);
    expect(screen.getByText("🛒")).toBeInTheDocument();
  });

  it("shows fallback emoji for unknown category", () => {
    renderWidget([
      makeTxn({ id: "1", category: "Miscellaneous", description: "Unknown" }),
    ]);
    expect(screen.getByText("💳")).toBeInTheDocument();
  });

  it("shows fallback emoji and 'Uncategorised' for null category", () => {
    renderWidget([
      makeTxn({ id: "1", category: null, description: "Mystery" }),
    ]);
    expect(screen.getByText("💳")).toBeInTheDocument();
    expect(screen.getByText("Uncategorised")).toBeInTheDocument();
  });

  it("renders 'View all' link pointing to /transactions", () => {
    renderWidget([]);
    const link = screen.getByRole("link", { name: "View all" });
    expect(link).toHaveAttribute("href", "/transactions");
  });

  it("renders footer 'See all transactions' link pointing to /transactions", () => {
    renderWidget([]);
    const link = screen.getByRole("link", { name: /see all transactions/i });
    expect(link).toHaveAttribute("href", "/transactions");
  });
});
