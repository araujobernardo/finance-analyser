import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryTrendChart } from "./CategoryTrendChart";
import type { MonthCategoryData } from "./CategoryTrendChart";

function month(
  monthKey: string,
  label: string,
  byCategory: Record<string, number>,
): MonthCategoryData {
  return { monthKey, label, byCategory };
}

describe("CategoryTrendChart", () => {
  it("shows empty message when no data", () => {
    render(<CategoryTrendChart months={[]} />);
    expect(screen.getByText(/No data yet/)).toBeInTheDocument();
  });

  it("shows single-month message when only one month", () => {
    render(
      <CategoryTrendChart
        months={[month("2025-01", "Jan 25", { Food: 200 })]}
      />,
    );
    expect(screen.getByText(/at least two months/)).toBeInTheDocument();
  });

  it("renders the scrollable chart container when two or more months", () => {
    const { container } = render(
      <CategoryTrendChart
        months={[
          month("2025-01", "Jan 25", { Food: 200 }),
          month("2025-02", "Feb 25", { Food: 180, Transport: 50 }),
        ]}
      />,
    );
    expect(container.querySelector(".cat-trend-scroll")).toBeInTheDocument();
  });

  it("does not render empty message when two months are present", () => {
    render(
      <CategoryTrendChart
        months={[
          month("2025-01", "Jan 25", { Food: 200 }),
          month("2025-02", "Feb 25", { Food: 180 }),
        ]}
      />,
    );
    expect(screen.queryByText(/No data yet/)).not.toBeInTheDocument();
    expect(screen.queryByText(/at least two months/)).not.toBeInTheDocument();
  });

  it("applies a min-width style for many months", () => {
    const months = Array.from({ length: 8 }, (_, i) =>
      month(`2025-${String(i + 1).padStart(2, "0")}`, `M${i}`, { Food: 100 }),
    );
    const { container } = render(<CategoryTrendChart months={months} />);
    const inner = container.querySelector(
      ".cat-trend-scroll > div",
    ) as HTMLElement;
    // minWidth = max(480, 8 * 80) = 640
    expect(inner?.style.minWidth).toBe("640px");
  });

  it("renders category names in the legend", () => {
    render(
      <CategoryTrendChart
        months={[
          month("2025-01", "Jan 25", { Food: 200, Transport: 80 }),
          month("2025-02", "Feb 25", { Food: 180, Transport: 60 }),
        ]}
      />,
    );
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
  });

  it("toggles a category to hidden state when clicking the legend item", () => {
    const { container } = render(
      <CategoryTrendChart
        months={[
          month("2025-01", "Jan 25", { Food: 200 }),
          month("2025-02", "Feb 25", { Food: 180 }),
        ]}
      />,
    );
    const legendItem = container.querySelector(".cat-trend-legend__item");
    expect(legendItem).toBeInTheDocument();
    expect(
      legendItem?.classList.contains("cat-trend-legend__item--hidden"),
    ).toBe(false);

    fireEvent.click(legendItem!);
    expect(
      legendItem?.classList.contains("cat-trend-legend__item--hidden"),
    ).toBe(true);
  });

  it("places Uncategorised last in the legend", () => {
    render(
      <CategoryTrendChart
        months={[
          month("2025-01", "Jan 25", { Food: 200, Uncategorised: 30 }),
          month("2025-02", "Feb 25", { Food: 180, Uncategorised: 20 }),
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");
    const labels = items.map((el) => el.textContent?.trim());
    expect(labels[labels.length - 1]).toBe("Uncategorised");
    expect(labels[0]).toBe("Food");
  });
});
