import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MonthlySummary } from "./MonthlySummary";
import type { Transaction } from "../utils/csvParser";

function makeTransaction(amount: number): Transaction {
  return { date: new Date("2025-03-01"), description: "Test", amount };
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("MonthlySummary", () => {
  it("shows empty state with CTA when no transactions", () => {
    renderWithRouter(<MonthlySummary transactions={[]} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Upload CSV" }),
    ).toBeInTheDocument();
  });

  it("shows skeleton when isLoading is true", () => {
    render(<MonthlySummary transactions={[]} isLoading />);
    expect(screen.getByTestId("skeleton-card")).toBeInTheDocument();
  });

  it("shows summary cards when transactions are present", () => {
    renderWithRouter(<MonthlySummary transactions={[makeTransaction(100)]} />);
    expect(screen.getByText("Total Income")).toBeInTheDocument();
  });

  it("calculates total income from positive amounts", () => {
    render(
      <MonthlySummary
        transactions={[makeTransaction(100), makeTransaction(50)]}
      />,
    );
    expect(screen.getByText("$150.00")).toBeInTheDocument();
  });

  it("calculates total expenses from negative amounts (shown positive)", () => {
    render(
      <MonthlySummary
        transactions={[makeTransaction(-80), makeTransaction(-20)]}
      />,
    );
    expect(screen.getByText("$100.00")).toBeInTheDocument();
  });

  it("calculates net savings as income minus expenses", () => {
    render(
      <MonthlySummary
        transactions={[makeTransaction(200), makeTransaction(-75)]}
      />,
    );
    // Income $200, Expenses $75, Net $125
    expect(screen.getByText(/\$125\.00/)).toBeInTheDocument();
  });

  it("renders net savings with up arrow when positive", () => {
    render(
      <MonthlySummary
        transactions={[makeTransaction(200), makeTransaction(-50)]}
      />,
    );
    expect(screen.getByText(/↑/)).toBeInTheDocument();
  });

  it("renders net savings with down arrow when negative", () => {
    render(
      <MonthlySummary
        transactions={[makeTransaction(50), makeTransaction(-200)]}
      />,
    );
    expect(screen.getByText(/↓/)).toBeInTheDocument();
  });

  it("applies negative class to net savings when net is negative", () => {
    render(
      <MonthlySummary
        transactions={[makeTransaction(50), makeTransaction(-200)]}
      />,
    );
    const netEl = screen.getByText(/↓/);
    expect(netEl).toHaveClass("summary-value--negative");
  });

  it("applies positive class to net savings when net is positive", () => {
    render(
      <MonthlySummary
        transactions={[makeTransaction(200), makeTransaction(-50)]}
      />,
    );
    const netEl = screen.getByText(/↑/);
    expect(netEl).toHaveClass("summary-value--positive");
  });

  it("handles month with only income (no expenses)", () => {
    render(<MonthlySummary transactions={[makeTransaction(500)]} />);
    expect(screen.getByText("$500.00")).toBeInTheDocument();
    expect(screen.getByText(/↑/)).toBeInTheDocument();
  });

  it("handles month with only expenses (no income)", () => {
    render(<MonthlySummary transactions={[makeTransaction(-300)]} />);
    expect(screen.getByText("$300.00")).toBeInTheDocument();
    expect(screen.getByText(/↓/)).toBeInTheDocument();
  });

  it("formats values with two decimal places and $ symbol", () => {
    render(<MonthlySummary transactions={[makeTransaction(1234.5)]} />);
    expect(screen.getByText("$1,234.50")).toBeInTheDocument();
  });

  it("renders the three card labels when transactions are present", () => {
    render(<MonthlySummary transactions={[makeTransaction(100)]} />);
    expect(screen.getByText("Total Income")).toBeInTheDocument();
    expect(screen.getByText("Total Expenses")).toBeInTheDocument();
    expect(screen.getByText("Net Savings")).toBeInTheDocument();
  });
});
