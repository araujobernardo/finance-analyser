import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IncomeExpenseChart } from "./IncomeExpenseChart";

interface TxnSlice {
  month: string;
  amount: number;
  isCredit: boolean;
  isTransfer: boolean;
}

function income(month: string, amount: number): TxnSlice {
  return { month, amount, isCredit: true, isTransfer: false };
}

function expense(month: string, amount: number): TxnSlice {
  return { month, amount: -amount, isCredit: false, isTransfer: false };
}

function transfer(month: string, amount: number): TxnSlice {
  return { month, amount, isCredit: false, isTransfer: true };
}

const BASE_ADAPTED: TxnSlice[] = [
  income("2025-01", 4200),
  expense("2025-01", 3100),
  income("2025-02", 4200),
  expense("2025-02", 3680),
  income("2025-03", 4500),
  expense("2025-03", 2900),
  income("2025-04", 4200),
  expense("2025-04", 4010),
  income("2025-05", 5100),
  expense("2025-05", 3450),
];

describe("IncomeExpenseChart", () => {
  it("renders the card title and subtitle", () => {
    render(
      <IncomeExpenseChart adapted={BASE_ADAPTED} currentMonth="2025-05" />,
    );
    expect(screen.getByText("Income vs Expenses")).toBeInTheDocument();
    expect(screen.getByText("Last 5 months")).toBeInTheDocument();
  });

  it("renders 5 month rows", () => {
    render(
      <IncomeExpenseChart adapted={BASE_ADAPTED} currentMonth="2025-05" />,
    );
    const rows = [
      screen.getByTestId("month-row-2025-01"),
      screen.getByTestId("month-row-2025-02"),
      screen.getByTestId("month-row-2025-03"),
      screen.getByTestId("month-row-2025-04"),
      screen.getByTestId("month-row-2025-05"),
    ];
    expect(rows).toHaveLength(5);
  });

  it("marks only the currentMonth row with ie-row--current", () => {
    render(
      <IncomeExpenseChart adapted={BASE_ADAPTED} currentMonth="2025-05" />,
    );
    const currentRow = screen.getByTestId("month-row-2025-05");
    expect(currentRow.className).toContain("ie-row--current");

    const otherRow = screen.getByTestId("month-row-2025-01");
    expect(otherRow.className).not.toContain("ie-row--current");
  });

  it("renders net badge with positive label for surplus months", () => {
    render(
      <IncomeExpenseChart adapted={BASE_ADAPTED} currentMonth="2025-05" />,
    );
    // Jan: income 4200, expense 3100 → net +1100
    const badge = screen.getByTestId("net-badge-2025-01");
    expect(badge.textContent).toMatch(/^\+/);
    expect(badge.className).toContain("ie-net-badge--positive");
  });

  it("renders net badge with negative label for deficit months", () => {
    const deficitAdapted: TxnSlice[] = [
      income("2025-01", 1000),
      expense("2025-01", 2000),
    ];
    render(
      <IncomeExpenseChart adapted={deficitAdapted} currentMonth="2025-01" />,
    );
    const badge = screen.getByTestId("net-badge-2025-01");
    expect(badge.textContent).toMatch(/^-/);
    expect(badge.className).toContain("ie-net-badge--negative");
  });

  it("excludes transfer transactions from income and expense totals", () => {
    const withTransfers: TxnSlice[] = [
      income("2025-01", 4000),
      expense("2025-01", 1000),
      transfer("2025-01", 500),
    ];
    render(
      <IncomeExpenseChart adapted={withTransfers} currentMonth="2025-01" />,
    );
    // Only one row should appear (transfers don't create extra months)
    expect(screen.getByTestId("month-row-2025-01")).toBeInTheDocument();
    // Net: 4000 - 1000 = +3000 (transfers excluded)
    const badge = screen.getByTestId("net-badge-2025-01");
    expect(badge.className).toContain("ie-net-badge--positive");
  });

  it("shows empty state when no transactions provided", () => {
    render(<IncomeExpenseChart adapted={[]} currentMonth="" />);
    expect(
      screen.getByText("No data for selected account"),
    ).toBeInTheDocument();
  });

  it("limits display to last 5 months when more data is available", () => {
    const sixMonths: TxnSlice[] = [
      income("2024-12", 3000),
      expense("2024-12", 2000),
      ...BASE_ADAPTED, // Jan–May 2025
    ];
    render(<IncomeExpenseChart adapted={sixMonths} currentMonth="2025-05" />);
    // Jan–May 2025 shown (5 most recent)
    expect(screen.getByTestId("month-row-2025-01")).toBeInTheDocument();
    expect(screen.getByTestId("month-row-2025-05")).toBeInTheDocument();
    // Dec 2024 is the 6th most recent — should not be shown
    expect(screen.queryByTestId("month-row-2024-12")).not.toBeInTheDocument();
  });

  it("renders legend with Income and Expenses labels", () => {
    render(
      <IncomeExpenseChart adapted={BASE_ADAPTED} currentMonth="2025-05" />,
    );
    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.getByText("Expenses")).toBeInTheDocument();
  });

  it("has the root data-testid attribute", () => {
    render(
      <IncomeExpenseChart adapted={BASE_ADAPTED} currentMonth="2025-05" />,
    );
    expect(screen.getByTestId("income-expense-chart")).toBeInTheDocument();
  });
});
