import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DashboardPage } from "./DashboardPage";
import type { PfaTxn, PfaCategory } from "../types/pfa";

function makeTxn(overrides: Partial<PfaTxn> = {}): PfaTxn {
  return {
    id: "txn-1",
    date: "2026-03-15",
    month: "2026-03",
    type: "",
    payee: "Supermarket",
    memo: "",
    amount: -100,
    isCredit: false,
    account: "Main",
    accountShort: "Main",
    category: "Groceries",
    isTransfer: false,
    ...overrides,
  };
}

const CATEGORIES: PfaCategory[] = [
  { name: "Groceries", color: "#34d399" },
  { name: "Dining & Takeaways", color: "#fbbf24" },
];

function renderDashboard(txns: PfaTxn[]) {
  const months = [...new Set(txns.map((t) => t.month))].sort();
  return render(
    <DashboardPage
      txns={txns}
      months={months}
      selectedMonths={months}
      setSelectedMonths={() => {}}
      budgets={{}}
      accountList={[{ short: "Main", display: "Main" }]}
      categories={CATEGORIES}
    />,
  );
}

describe("DashboardPage — Spending by Category layout (spec 007 FR-004)", () => {
  it("renders .dash-cat-body container when there is category spend data", () => {
    const { container } = renderDashboard([makeTxn()]);
    expect(container.querySelector(".dash-cat-body")).toBeInTheDocument();
  });

  it("legend column appears before the chart column in DOM order", () => {
    const { container } = renderDashboard([makeTxn()]);
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
    const { container } = renderDashboard([makeTxn()]);
    const legendCol = container.querySelector(".dash-cat-legend-col");
    expect(legendCol).not.toBeNull();
    const legendItem = legendCol!.querySelector(".dash-cat-legend-item");
    expect(legendItem).toBeInTheDocument();
  });

  it("chart column is present and contains the Recharts wrapper div", () => {
    const { container } = renderDashboard([makeTxn()]);
    const chartCol = container.querySelector(".dash-cat-chart-col");
    expect(chartCol).toBeInTheDocument();
    // Recharts ResponsiveContainer renders a div child in jsdom (no SVG without real dimensions)
    expect(chartCol!.querySelector("div")).toBeInTheDocument();
  });

  it("does not render .dash-cat-body when there is no category spend", () => {
    // No expense txns → catData is empty → shows empty state instead
    const { container } = renderDashboard([
      makeTxn({ isCredit: true, amount: 500 }),
    ]);
    expect(container.querySelector(".dash-cat-body")).not.toBeInTheDocument();
  });
});
