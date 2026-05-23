import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";
import type { ApiTransaction } from "../types/api";

// GoalsSummaryWidget uses <Link> and useGoals — stub it for DashboardPage tests
vi.mock("../components/goals/GoalsSummaryWidget", () => ({
  GoalsSummaryWidget: () => null,
}));

// ── Mock AccountContext ───────────────────────────────────────────────────────

const mockAccounts = [{ id: "acc-1", nickname: "Main", colour: "#6C8EBF" }];
let mockRawTransactions: ApiTransaction[] = [];
let mockIsLoading = false;

vi.mock("../context/AccountContext", () => ({
  useAccount: () => ({
    accounts: mockAccounts,
    isLoading: mockIsLoading,
    error: null,
    activeAccountId: "acc-1",
    refetch: vi.fn(),
    setActiveAccountId: vi.fn(),
    addAccount: vi.fn(),
    removeAccount: vi.fn(),
    updateAccount: vi.fn(),
  }),
  useAllTransactions: () => mockRawTransactions,
  ALL_ACCOUNTS_ID: "all",
}));

// ── Mock useApi (needed transitively by AccountProvider in some imports) ──────
vi.mock("../lib/api", () => ({
  useApi: () => ({ apiFetch: vi.fn() }),
  API_BASE: "",
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeApiTxn(overrides: Partial<ApiTransaction> = {}): ApiTransaction {
  return {
    id: "txn-1",
    userId: "user-1",
    accountId: "acc-1",
    date: "2026-03-15",
    amount: -100,
    description: "Supermarket",
    category: "Groceries",
    isTransfer: false,
    isManualTransfer: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DashboardPage — Spending by Category layout (spec 007 FR-004)", () => {
  it("renders .dash-cat-body container when there is category spend data", () => {
    mockRawTransactions = [makeApiTxn()];
    mockIsLoading = false;
    const { container } = renderDashboard();
    expect(container.querySelector(".dash-cat-body")).toBeInTheDocument();
  });

  it("legend column appears before the chart column in DOM order", () => {
    mockRawTransactions = [makeApiTxn()];
    mockIsLoading = false;
    const { container } = renderDashboard();
    const legendCol = container.querySelector(
      ".dash-cat-legend-col",
    ) as HTMLElement;
    const chartCol = container.querySelector(
      ".dash-cat-chart-col",
    ) as HTMLElement;
    expect(legendCol).toBeInTheDocument();
    expect(chartCol).toBeInTheDocument();
    // Legend must precede the chart column in the DOM (LEFT = earlier in DOM order)
    expect(
      legendCol.compareDocumentPosition(chartCol) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("legend items are inside the legend column, not outside it", () => {
    mockRawTransactions = [makeApiTxn()];
    mockIsLoading = false;
    const { container } = renderDashboard();
    const legendCol = container.querySelector(".dash-cat-legend-col");
    expect(legendCol).not.toBeNull();
    const legendItem = legendCol!.querySelector(".dash-cat-legend-item");
    expect(legendItem).toBeInTheDocument();
  });

  it("chart column is present and contains the Recharts wrapper div", () => {
    mockRawTransactions = [makeApiTxn()];
    mockIsLoading = false;
    const { container } = renderDashboard();
    const chartCol = container.querySelector(".dash-cat-chart-col");
    expect(chartCol).toBeInTheDocument();
    // Recharts ResponsiveContainer renders a div child in jsdom (no SVG without real dimensions)
    expect(chartCol!.querySelector("div")).toBeInTheDocument();
  });

  it("does not render .dash-cat-body when there is no category spend", () => {
    // Credit txn → not an expense → catData is empty → shows empty chart state
    mockRawTransactions = [makeApiTxn({ amount: 500 })];
    mockIsLoading = false;
    const { container } = renderDashboard();
    expect(container.querySelector(".dash-cat-body")).not.toBeInTheDocument();
  });
});

describe("DashboardPage — loading and empty states", () => {
  it("shows loading state when isLoading and no transactions", () => {
    mockRawTransactions = [];
    mockIsLoading = true;
    const { getByTestId } = renderDashboard();
    expect(getByTestId("dashboard-loading")).toBeInTheDocument();
  });

  it("shows empty state when not loading and no transactions", () => {
    mockRawTransactions = [];
    mockIsLoading = false;
    const { getByText } = renderDashboard();
    expect(getByText("No data yet")).toBeInTheDocument();
  });

  it("shows summary stats when transactions are present", () => {
    mockRawTransactions = [makeApiTxn()];
    mockIsLoading = false;
    const { getByTestId } = renderDashboard();
    expect(getByTestId("summary-stats")).toBeInTheDocument();
  });
});

describe("DashboardPage — no account filter pills (issue #755)", () => {
  it("does not render .dash-acct-pills (dashboard filter tabs removed)", () => {
    mockRawTransactions = [makeApiTxn()];
    mockIsLoading = false;
    const { container } = renderDashboard();
    expect(container.querySelector(".dash-acct-pills")).not.toBeInTheDocument();
  });

  it("shows summary stats driven by AccountContext activeAccountId, not a local filter", () => {
    // With activeAccountId = "acc-1" in the mock, transactions for acc-1 should show
    mockRawTransactions = [makeApiTxn()];
    mockIsLoading = false;
    const { getByTestId } = renderDashboard();
    expect(getByTestId("summary-stats")).toBeInTheDocument();
  });
});
