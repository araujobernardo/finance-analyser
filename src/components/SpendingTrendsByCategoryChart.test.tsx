import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ApiTransaction } from "../types/api";
import { SpendingTrendsByCategoryChart } from "./SpendingTrendsByCategoryChart";

// ── Helpers ───────────────────────────────────────────────────────────────────

let _txnId = 0;

function txn(
  overrides: Partial<ApiTransaction> & {
    date: string;
    amount: number;
    category: string | null;
    accountId?: string;
  },
): ApiTransaction {
  return {
    id: String(++_txnId),
    userId: "u1",
    accountId: overrides.accountId ?? "acc-1",
    date: overrides.date,
    amount: overrides.amount,
    description: "test",
    category: overrides.category,
    isTransfer: false,
    isManualTransfer: false,
    createdAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

// Expense transactions spanning 3 months (negative amounts = spending)
const THREE_MONTH_DATA: ApiTransaction[] = [
  txn({ date: "2025-01-10", amount: -100, category: "Groceries" }),
  txn({ date: "2025-01-15", amount: -50, category: "Transport" }),
  txn({ date: "2025-02-05", amount: -120, category: "Groceries" }),
  txn({ date: "2025-02-20", amount: -60, category: "Transport" }),
  txn({ date: "2025-03-08", amount: -90, category: "Groceries" }),
  txn({ date: "2025-03-22", amount: -40, category: "Transport" }),
];

// Data spanning multiple accounts, 2+ months
const MULTI_ACCOUNT_DATA: ApiTransaction[] = [
  txn({
    date: "2025-04-10",
    amount: -200,
    category: "Dining",
    accountId: "acc-1",
  }),
  txn({
    date: "2025-04-12",
    amount: -150,
    category: "Shopping",
    accountId: "acc-2",
  }),
  txn({
    date: "2025-05-10",
    amount: -180,
    category: "Dining",
    accountId: "acc-1",
  }),
  txn({
    date: "2025-05-14",
    amount: -130,
    category: "Shopping",
    accountId: "acc-2",
  }),
];

// Six categories across 2 months (top-5 test)
const SIX_CATS_DATA: ApiTransaction[] = [
  txn({ date: "2025-06-01", amount: -600, category: "Groceries" }),
  txn({ date: "2025-06-02", amount: -500, category: "Transport" }),
  txn({ date: "2025-06-03", amount: -400, category: "Dining" }),
  txn({ date: "2025-06-04", amount: -300, category: "Shopping" }),
  txn({ date: "2025-06-05", amount: -200, category: "Utilities" }),
  txn({ date: "2025-06-06", amount: -100, category: "Education" }), // 6th — should be excluded
  txn({ date: "2025-07-01", amount: -550, category: "Groceries" }),
  txn({ date: "2025-07-02", amount: -450, category: "Transport" }),
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SpendingTrendsByCategoryChart", () => {
  describe("card title", () => {
    it("renders the card title in all states", () => {
      render(
        <SpendingTrendsByCategoryChart
          transactions={[]}
          activeAccountId="all"
        />,
      );
      expect(
        screen.getByText("Spending Trends by Category"),
      ).toBeInTheDocument();
    });
  });

  describe("empty state — fewer than 2 months of data", () => {
    it("shows empty state when no transactions are provided", () => {
      render(
        <SpendingTrendsByCategoryChart
          transactions={[]}
          activeAccountId="all"
        />,
      );
      expect(
        screen.getByText(/Not enough data to show trends/),
      ).toBeInTheDocument();
    });

    it("shows empty state when transactions cover only 1 month", () => {
      const oneMonth = [
        txn({ date: "2025-03-10", amount: -100, category: "Groceries" }),
        txn({ date: "2025-03-20", amount: -50, category: "Transport" }),
      ];
      render(
        <SpendingTrendsByCategoryChart
          transactions={oneMonth}
          activeAccountId="all"
        />,
      );
      expect(
        screen.getByText(/Not enough data to show trends/),
      ).toBeInTheDocument();
    });

    it("shows empty state when all transactions are filtered out by account", () => {
      render(
        <SpendingTrendsByCategoryChart
          transactions={THREE_MONTH_DATA}
          activeAccountId="acc-99"
        />,
      );
      expect(
        screen.getByText(/Not enough data to show trends/),
      ).toBeInTheDocument();
    });

    it("shows empty state when all transactions are transfers", () => {
      const transfers = [
        {
          ...txn({ date: "2025-01-10", amount: -100, category: "Savings" }),
          isTransfer: true,
        },
        {
          ...txn({ date: "2025-02-10", amount: -200, category: "Savings" }),
          isTransfer: true,
        },
      ];
      render(
        <SpendingTrendsByCategoryChart
          transactions={transfers}
          activeAccountId="all"
        />,
      );
      expect(
        screen.getByText(/Not enough data to show trends/),
      ).toBeInTheDocument();
    });
  });

  describe("bar chart rendering — 3+ months of data", () => {
    it("renders a ResponsiveContainer when 3 months of data are provided", () => {
      const { container } = render(
        <SpendingTrendsByCategoryChart
          transactions={THREE_MONTH_DATA}
          activeAccountId="all"
        />,
      );
      expect(
        container.querySelector(".recharts-responsive-container"),
      ).toBeInTheDocument();
    });

    it("does not show the empty state when 3 months of data are provided", () => {
      render(
        <SpendingTrendsByCategoryChart
          transactions={THREE_MONTH_DATA}
          activeAccountId="all"
        />,
      );
      expect(
        screen.queryByText(/Not enough data to show trends/),
      ).not.toBeInTheDocument();
    });

    it("renders a ResponsiveContainer (not empty state) when data is sufficient", () => {
      const { container } = render(
        <SpendingTrendsByCategoryChart
          transactions={THREE_MONTH_DATA}
          activeAccountId="all"
        />,
      );
      // Recharts ResponsiveContainer renders in jsdom even without real dimensions
      expect(
        container.querySelector(".recharts-responsive-container"),
      ).toBeInTheDocument();
    });
  });

  describe("account filtering", () => {
    it("renders the chart when only the selected account has 2+ months of data", () => {
      render(
        <SpendingTrendsByCategoryChart
          transactions={MULTI_ACCOUNT_DATA}
          activeAccountId="acc-1"
        />,
      );
      expect(
        screen.queryByText(/Not enough data to show trends/),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText("Spending Trends by Category"),
      ).toBeInTheDocument();
    });

    it("shows empty state when the selected account has only 1 month of data", () => {
      // Give acc-2 data only in one month
      const oneMonthAcc2 = [
        txn({
          date: "2025-01-10",
          amount: -100,
          category: "Shopping",
          accountId: "acc-1",
        }),
        txn({
          date: "2025-02-10",
          amount: -120,
          category: "Shopping",
          accountId: "acc-1",
        }),
        txn({
          date: "2025-01-15",
          amount: -80,
          category: "Dining",
          accountId: "acc-2",
        }),
      ];
      render(
        <SpendingTrendsByCategoryChart
          transactions={oneMonthAcc2}
          activeAccountId="acc-2"
        />,
      );
      expect(
        screen.getByText(/Not enough data to show trends/),
      ).toBeInTheDocument();
    });

    it("shows all data when activeAccountId is 'all'", () => {
      render(
        <SpendingTrendsByCategoryChart
          transactions={MULTI_ACCOUNT_DATA}
          activeAccountId="all"
        />,
      );
      expect(
        screen.queryByText(/Not enough data to show trends/),
      ).not.toBeInTheDocument();
    });
  });

  describe("top-5 category selection", () => {
    it("renders the chart (not empty state) when 6 categories are present", () => {
      render(
        <SpendingTrendsByCategoryChart
          transactions={SIX_CATS_DATA}
          activeAccountId="all"
        />,
      );
      // Data spans 2 months so the chart should render, not the empty state
      expect(
        screen.queryByText(/Not enough data to show trends/),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText("Spending Trends by Category"),
      ).toBeInTheDocument();
    });

    it("omits the 6th lowest-spend category from the chart", () => {
      // Recharts Legend is not rendered by jsdom (ResponsiveContainer gets width=0),
      // so we verify the 6th category is absent from the whole document.
      render(
        <SpendingTrendsByCategoryChart
          transactions={SIX_CATS_DATA}
          activeAccountId="all"
        />,
      );
      // "Education" has the lowest total ($100) and must be excluded (top-5 only)
      expect(screen.queryByText("Education")).not.toBeInTheDocument();
    });
  });
});
