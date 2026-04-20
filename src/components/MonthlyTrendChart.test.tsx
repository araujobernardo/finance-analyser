import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MonthlyTrendChart } from "./MonthlyTrendChart";
import type { TrendDataPoint } from "./MonthlyTrendChart";

function point(
  monthKey: string,
  label: string,
  totalSpend: number,
): TrendDataPoint {
  return { monthKey, label, totalSpend };
}

describe("MonthlyTrendChart", () => {
  it("shows empty message when no data", () => {
    render(<MonthlyTrendChart data={[]} selectedMonth={null} />);
    expect(screen.getByText(/No monthly data yet/)).toBeInTheDocument();
  });

  it("shows single-month message when only one month provided", () => {
    render(
      <MonthlyTrendChart
        data={[point("2025-01", "Jan 25", 500)]}
        selectedMonth="2025-01"
      />,
    );
    expect(screen.getByText(/at least two months/)).toBeInTheDocument();
  });

  it("renders the scrollable chart container when two or more months", () => {
    const { container } = render(
      <MonthlyTrendChart
        data={[
          point("2025-01", "Jan 25", 500),
          point("2025-02", "Feb 25", 620),
        ]}
        selectedMonth="2025-01"
      />,
    );
    expect(
      container.querySelector(".monthly-trend-scroll"),
    ).toBeInTheDocument();
  });

  it("does not render empty message when two months are present", () => {
    render(
      <MonthlyTrendChart
        data={[
          point("2025-01", "Jan 25", 500),
          point("2025-02", "Feb 25", 620),
        ]}
        selectedMonth="2025-01"
      />,
    );
    expect(screen.queryByText(/No monthly data yet/)).not.toBeInTheDocument();
    expect(screen.queryByText(/at least two months/)).not.toBeInTheDocument();
  });

  it("applies a min-width style for many months", () => {
    const data = Array.from({ length: 8 }, (_, i) =>
      point(`2025-${String(i + 1).padStart(2, "0")}`, `M${i}`, 100 * (i + 1)),
    );
    const { container } = render(
      <MonthlyTrendChart data={data} selectedMonth="2025-01" />,
    );
    const inner = container.querySelector(
      ".monthly-trend-scroll > div",
    ) as HTMLElement;
    // minWidth = max(480, 8 * 80) = 640
    expect(inner?.style.minWidth).toBe("640px");
  });

  it("applies minimum width of 480px for fewer than 6 months", () => {
    const data = [
      point("2025-01", "Jan 25", 500),
      point("2025-02", "Feb 25", 620),
    ];
    const { container } = render(
      <MonthlyTrendChart data={data} selectedMonth="2025-01" />,
    );
    const inner = container.querySelector(
      ".monthly-trend-scroll > div",
    ) as HTMLElement;
    // minWidth = max(480, 2 * 80) = 480
    expect(inner?.style.minWidth).toBe("480px");
  });
});
