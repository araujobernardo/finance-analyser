import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpendingDonutChart } from "./SpendingDonutChart";
import type { CategoryRow } from "../utils/categoryData";

function row(category: string, total: number, percentage: number): CategoryRow {
  return { category, total, percentage };
}

describe("SpendingDonutChart", () => {
  it("shows empty message when no rows", () => {
    render(
      <SpendingDonutChart
        rows={[]}
        selectedCategory={null}
        onCategoryClick={vi.fn()}
      />,
    );
    expect(screen.getByText("No expense data to chart.")).toBeInTheDocument();
  });

  it("shows single-category message when only one row", () => {
    render(
      <SpendingDonutChart
        rows={[row("Food", 100, 100)]}
        selectedCategory={null}
        onCategoryClick={vi.fn()}
      />,
    );
    expect(screen.getByText(/Only one spending category/)).toBeInTheDocument();
  });

  it("renders the chart when two or more rows provided", () => {
    const { container } = render(
      <SpendingDonutChart
        rows={[row("Food", 75, 75), row("Transport", 25, 25)]}
        selectedCategory={null}
        onCategoryClick={vi.fn()}
      />,
    );
    expect(container.querySelector(".donut-wrapper")).toBeInTheDocument();
  });

  it("renders a legend item for each category", () => {
    render(
      <SpendingDonutChart
        rows={[row("Food", 75, 75), row("Transport", 25, 25)]}
        selectedCategory={null}
        onCategoryClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
  });

  it("highlights the active legend item", () => {
    render(
      <SpendingDonutChart
        rows={[row("Food", 75, 75), row("Transport", 25, 25)]}
        selectedCategory="Food"
        onCategoryClick={vi.fn()}
      />,
    );
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveClass("donut-legend__item--active");
    expect(items[1]).not.toHaveClass("donut-legend__item--active");
  });

  it("calls onCategoryClick when a legend item is clicked", async () => {
    const onCategoryClick = vi.fn();
    render(
      <SpendingDonutChart
        rows={[row("Food", 75, 75), row("Transport", 25, 25)]}
        selectedCategory={null}
        onCategoryClick={onCategoryClick}
      />,
    );
    await userEvent.click(screen.getByText("Food"));
    expect(onCategoryClick).toHaveBeenCalledWith("Food");
  });

  it("calls onCategoryClick with null when active legend item is clicked again", async () => {
    const onCategoryClick = vi.fn();
    render(
      <SpendingDonutChart
        rows={[row("Food", 75, 75), row("Transport", 25, 25)]}
        selectedCategory="Food"
        onCategoryClick={onCategoryClick}
      />,
    );
    await userEvent.click(screen.getByText("Food"));
    expect(onCategoryClick).toHaveBeenCalledWith(null);
  });
});
