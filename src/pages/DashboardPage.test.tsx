import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";
import type { ApiTransaction } from "../types/api";

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

  it("chart column is present and contains the bar chart wrapper", () => {
    mockRawTransactions = [makeApiTxn()];
    mockIsLoading = false;
    const { getByTestId } = renderDashboard();
    expect(getByTestId("cat-bar-chart")).toBeInTheDocument();
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

describe("DashboardPage — month pill selector (issue #786)", () => {
  it("single month selected: heading shows short month label", () => {
    // One transaction in March 2026 → most-recent month pre-selected
    mockRawTransactions = [makeApiTxn({ date: "2026-03-15" })];
    mockIsLoading = false;
    const { getByTestId } = renderDashboard();
    // fmtMonthSh("2026-03") → "Mar '26"
    expect(getByTestId("dash-heading").textContent).toBe("Mar '26");
  });

  it("single month selected: subtitle shows account and transaction count", () => {
    mockRawTransactions = [makeApiTxn({ date: "2026-03-15" })];
    mockIsLoading = false;
    const { getByTestId } = renderDashboard();
    const subtitle = getByTestId("dash-subtitle");
    expect(subtitle.textContent).toMatch(/transaction/);
  });

  it("pills render for each available month", () => {
    mockRawTransactions = [
      makeApiTxn({ id: "t1", date: "2026-01-10" }),
      makeApiTxn({ id: "t2", date: "2026-02-10" }),
    ];
    mockIsLoading = false;
    const { getByTestId } = renderDashboard();
    expect(getByTestId("month-pill-2026-01")).toBeInTheDocument();
    expect(getByTestId("month-pill-2026-02")).toBeInTheDocument();
  });

  it("active pill has aria-pressed=true, inactive pill has aria-pressed=false", () => {
    mockRawTransactions = [
      makeApiTxn({ id: "t1", date: "2026-01-10" }),
      makeApiTxn({ id: "t2", date: "2026-02-10" }),
    ];
    mockIsLoading = false;
    const { getByTestId } = renderDashboard();
    // Most recent (2026-02) is pre-selected
    expect(getByTestId("month-pill-2026-02").getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(getByTestId("month-pill-2026-01").getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("selecting a second month: heading shows range with en-dash", () => {
    mockRawTransactions = [
      makeApiTxn({ id: "t1", date: "2026-01-10" }),
      makeApiTxn({ id: "t2", date: "2026-02-10" }),
    ];
    mockIsLoading = false;
    const { getByTestId } = renderDashboard();
    // Click the Jan pill (adding it to the selection)
    fireEvent.click(getByTestId("month-pill-2026-01"));
    const heading = getByTestId("dash-heading").textContent ?? "";
    // Should be "Jan '26 – Feb '26"
    expect(heading).toContain("–");
    expect(heading).toMatch(/Jan '26/);
    expect(heading).toMatch(/Feb '26/);
  });

  it("selecting a second month: subtitle shows count and deselect hint", () => {
    mockRawTransactions = [
      makeApiTxn({ id: "t1", date: "2026-01-10" }),
      makeApiTxn({ id: "t2", date: "2026-02-10" }),
    ];
    mockIsLoading = false;
    const { getByTestId } = renderDashboard();
    fireEvent.click(getByTestId("month-pill-2026-01"));
    const subtitle = getByTestId("dash-subtitle").textContent ?? "";
    expect(subtitle).toMatch(/2 months selected/);
    expect(subtitle).toMatch(/click to deselect/);
  });

  it("clicking the only active pill does not deselect it (guard against empty state)", () => {
    // Only one month of data → only one pill
    mockRawTransactions = [makeApiTxn({ date: "2026-03-15" })];
    mockIsLoading = false;
    const { getByTestId } = renderDashboard();
    const pill = getByTestId("month-pill-2026-03");
    fireEvent.click(pill);
    // Pill should still be active (aria-pressed stays true)
    expect(pill.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("DashboardPage — stat cards with coloured bar and badge (issue #787)", () => {
  it("renders all four stat cards", () => {
    mockRawTransactions = [makeApiTxn()];
    mockIsLoading = false;
    const { getByTestId } = renderDashboard();
    expect(getByTestId("stat-income")).toBeInTheDocument();
    expect(getByTestId("stat-spent")).toBeInTheDocument();
    expect(getByTestId("stat-net")).toBeInTheDocument();
    expect(getByTestId("stat-transactions")).toBeInTheDocument();
  });

  it("stat cards have a coloured border-top (top bar)", () => {
    mockRawTransactions = [makeApiTxn()];
    mockIsLoading = false;
    const { getByTestId } = renderDashboard();
    const incomeCard = getByTestId("stat-income") as HTMLElement;
    // border-top is set inline; verify the style attribute contains border-top
    expect(incomeCard.style.borderTop).toContain("var(--accent)");
    const spentCard = getByTestId("stat-spent") as HTMLElement;
    expect(spentCard.style.borderTop).toContain("var(--red)");
  });

  it("savings rate subtitle appears on Net card when income > 0", () => {
    // Income txn of $500, expense txn of $100 → net $400 → 80% savings rate
    mockRawTransactions = [
      makeApiTxn({ id: "t1", amount: 500, date: "2026-03-15" }), // income
      makeApiTxn({ id: "t2", amount: -100, date: "2026-03-15" }), // expense
    ];
    mockIsLoading = false;
    const { getByTestId } = renderDashboard();
    const netSub = getByTestId("stat-net-sub");
    expect(netSub.textContent).toMatch(/savings rate/);
  });

  it("transfers excluded count appears on Transactions card when transfers present", () => {
    // One regular txn + one transfer txn
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        amount: -100,
        date: "2026-03-15",
        isTransfer: false,
      }),
      makeApiTxn({
        id: "t2",
        amount: -50,
        date: "2026-03-15",
        isTransfer: true,
      }),
    ];
    mockIsLoading = false;
    const { getByTestId } = renderDashboard();
    const txnSub = getByTestId("stat-transactions-sub");
    expect(txnSub.textContent).toMatch(/transfers excluded/);
  });

  it("comparison badge does NOT render when only one month of data exists", () => {
    // Only March 2026 data — no prior month → no badge
    mockRawTransactions = [makeApiTxn({ date: "2026-03-15" })];
    mockIsLoading = false;
    const { queryByTestId } = renderDashboard();
    expect(queryByTestId("stat-income-badge")).not.toBeInTheDocument();
  });

  it("comparison badge renders when prior month data exists", () => {
    // Feb + March transactions — selecting March means Feb is prior month
    mockRawTransactions = [
      makeApiTxn({ id: "t1", date: "2026-02-10", amount: 400 }), // Feb income
      makeApiTxn({ id: "t2", date: "2026-03-10", amount: 500 }), // Mar income (higher)
    ];
    mockIsLoading = false;
    const { getByTestId } = renderDashboard();
    // Most recent (March) is pre-selected; Feb exists as prior month
    const badge = getByTestId("stat-income-badge");
    expect(badge).toBeInTheDocument();
    // Delta = 500 - 400 = 100 increase → up badge
    expect(badge.textContent).toContain("↑");
    expect(badge.textContent).toMatch(/Feb/);
  });
});

describe("DashboardPage — Spending by Category bar chart (issue #926)", () => {
  it("renders the bar chart wrapper when spend data exists", () => {
    mockRawTransactions = [makeApiTxn()];
    mockIsLoading = false;
    const { getByTestId } = renderDashboard();
    expect(getByTestId("cat-bar-chart")).toBeInTheDocument();
  });

  it("donut SVG wrapper (data-testid=donut-svg-wrapper) is absent", () => {
    mockRawTransactions = [makeApiTxn()];
    mockIsLoading = false;
    const { queryByTestId } = renderDashboard();
    expect(queryByTestId("donut-svg-wrapper")).not.toBeInTheDocument();
  });

  it("legend items use the square dot (dash-cat-legend-dot)", () => {
    mockRawTransactions = [makeApiTxn({ category: "Groceries" })];
    mockIsLoading = false;
    const { container } = renderDashboard();
    const dot = container.querySelector(".dash-cat-legend-dot") as HTMLElement;
    expect(dot).toBeInTheDocument();
  });

  it("clicking a legend item sets it as the active category (adds --active class)", () => {
    mockRawTransactions = [
      makeApiTxn({ id: "t1", category: "Groceries" }),
      makeApiTxn({ id: "t2", category: "Dining", amount: -50 }),
    ];
    mockIsLoading = false;
    const { container } = renderDashboard();
    const firstItem = container.querySelector(
      ".dash-cat-legend-item",
    ) as HTMLElement;
    expect(firstItem).toBeInTheDocument();
    fireEvent.click(firstItem);
    expect(firstItem.classList.contains("dash-cat-legend-item--active")).toBe(
      true,
    );
  });

  it("does not render bar chart or chart column when there is no expense data", () => {
    // Income-only → catData empty → empty state shown
    mockRawTransactions = [makeApiTxn({ amount: 500 })];
    mockIsLoading = false;
    const { queryByTestId, container } = renderDashboard();
    expect(queryByTestId("cat-bar-chart")).not.toBeInTheDocument();
    expect(
      container.querySelector(".dash-cat-chart-col"),
    ).not.toBeInTheDocument();
  });
});

describe("DashboardPage — chart card order (issue #939)", () => {
  it("Income vs Expenses card appears before Spending by Category card in DOM order", () => {
    mockRawTransactions = [makeApiTxn()];
    mockIsLoading = false;
    const { container } = renderDashboard();

    // .ie-title is rendered by IncomeExpenseChart
    const incomeTitle = container.querySelector(".ie-title") as HTMLElement;
    // .card-title is the Spending by Category heading inside dash-charts-grid
    const spendingTitle = container.querySelector(".card-title") as HTMLElement;

    expect(incomeTitle).toBeInTheDocument();
    expect(spendingTitle).toBeInTheDocument();
    expect(incomeTitle.textContent).toBe("Income vs Expenses");
    expect(spendingTitle.textContent).toBe("Spending by Category");

    // Income vs Expenses must precede Spending by Category in DOM order
    expect(
      incomeTitle.compareDocumentPosition(spendingTitle) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("DashboardPage — removed sections are absent (issue #925)", () => {
  beforeEach(() => {
    mockRawTransactions = [makeApiTxn()];
    mockIsLoading = false;
  });

  it("GoalsSummaryWidget is NOT present on the dashboard", () => {
    const { queryByTestId } = renderDashboard();
    expect(queryByTestId("goals-summary-widget")).not.toBeInTheDocument();
  });

  it("per-account in/out breakdown cards are NOT present on the dashboard", () => {
    const { container } = renderDashboard();
    expect(container.querySelector(".dash-acct-grid")).not.toBeInTheDocument();
  });

  it("RecentTransactions list is NOT present on the dashboard", () => {
    const { queryByTestId } = renderDashboard();
    expect(queryByTestId("recent-transactions-widget")).not.toBeInTheDocument();
  });

  it("SpendingTrendsLineChart is NOT present on the dashboard", () => {
    const { queryByTestId } = renderDashboard();
    expect(queryByTestId("spending-trends-line-chart")).not.toBeInTheDocument();
  });

  it("WeeklyTrendChart is NOT present on the dashboard", () => {
    const { queryByText, container } = renderDashboard();
    expect(queryByText("Weekly Trends")).not.toBeInTheDocument();
    expect(container.querySelector(".dash-trends")).not.toBeInTheDocument();
  });
});
