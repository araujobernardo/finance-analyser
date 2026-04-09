import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthlySpendChart } from "./MonthlySpendChart";
import type { MonthDataPoint } from "./MonthlySpendChart";

function point(
  label: string,
  expenses: number,
  net: number,
  monthKey = "2025-01",
): MonthDataPoint {
  return { monthKey, label, expenses, net };
}

describe("MonthlySpendChart", () => {
  it("shows empty message when no data", () => {
    render(<MonthlySpendChart data={[]} />);
    expect(screen.getByText(/No monthly data yet/)).toBeInTheDocument();
  });

  it("shows single-month message when only one data point", () => {
    render(<MonthlySpendChart data={[point("Jan 25", 500, -200)]} />);
    expect(screen.getByText(/at least two months/)).toBeInTheDocument();
  });

  it("renders the scrollable chart container when two or more data points", () => {
    const { container } = render(
      <MonthlySpendChart
        data={[point("Jan 25", 500, -200), point("Feb 25", 400, 100)]}
      />,
    );
    expect(container.querySelector(".spend-chart-scroll")).toBeInTheDocument();
  });

  it("does not render the empty message when there are two data points", () => {
    render(
      <MonthlySpendChart
        data={[point("Jan 25", 500, -200), point("Feb 25", 400, 100)]}
      />,
    );
    expect(screen.queryByText(/No monthly data/)).not.toBeInTheDocument();
    expect(screen.queryByText(/at least two months/)).not.toBeInTheDocument();
  });

  it("applies a min-width style when many months are present", () => {
    const manyMonths = Array.from({ length: 8 }, (_, i) =>
      point(`Mon ${i}`, 500, 100, `2025-0${(i % 9) + 1}`),
    );
    const { container } = render(<MonthlySpendChart data={manyMonths} />);
    const inner = container.querySelector(
      ".spend-chart-scroll > div",
    ) as HTMLElement;
    // minWidth = max(480, 8 * 80) = 640
    expect(inner?.style.minWidth).toBe("640px");
  });
});
