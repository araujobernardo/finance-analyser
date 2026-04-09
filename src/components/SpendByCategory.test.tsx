import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpendByCategory } from "./SpendByCategory";
import type { CategoryRow } from "../utils/categoryData";

function row(category: string, total: number, percentage: number): CategoryRow {
  return { category, total, percentage };
}

function renderPanel(
  rows: CategoryRow[],
  selectedCategory: string | null = null,
  onCategoryClick = vi.fn(),
) {
  return render(
    <SpendByCategory
      rows={rows}
      selectedCategory={selectedCategory}
      onCategoryClick={onCategoryClick}
    />,
  );
}

describe("SpendByCategory", () => {
  it("shows empty state when rows is empty", () => {
    renderPanel([]);
    expect(
      screen.getByText("No expense transactions for this month."),
    ).toBeInTheDocument();
  });

  it("renders a list item for each row", () => {
    renderPanel([row("Food", 100, 75), row("Transport", 33.33, 25)]);
    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
  });

  it("displays the formatted amount for each row", () => {
    renderPanel([row("Food", 100, 100)]);
    expect(screen.getByText("$100.00")).toBeInTheDocument();
  });

  it("displays the percentage for each row", () => {
    renderPanel([row("Food", 75, 75), row("Transport", 25, 25)]);
    expect(screen.getByText("75.0%")).toBeInTheDocument();
    expect(screen.getByText("25.0%")).toBeInTheDocument();
  });

  it("applies uncategorised style to Uncategorised row", () => {
    renderPanel([row("Uncategorised", 50, 100)]);
    expect(screen.getByRole("listitem")).toHaveClass(
      "spend-row--uncategorised",
    );
  });

  it("applies selected class to the active category row", () => {
    renderPanel([row("Food", 80, 80), row("Transport", 20, 20)], "Food");
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveClass("spend-row--selected");
    expect(items[1]).not.toHaveClass("spend-row--selected");
  });

  it("calls onCategoryClick with category name when a row is clicked", async () => {
    const onCategoryClick = vi.fn();
    renderPanel([row("Food", 100, 100)], null, onCategoryClick);
    await userEvent.click(screen.getByText("Food"));
    expect(onCategoryClick).toHaveBeenCalledWith("Food");
  });

  it("calls onCategoryClick with null when the selected row is clicked again", async () => {
    const onCategoryClick = vi.fn();
    renderPanel([row("Food", 100, 100)], "Food", onCategoryClick);
    await userEvent.click(screen.getByText("Food"));
    expect(onCategoryClick).toHaveBeenCalledWith(null);
  });

  it("renders the section title", () => {
    renderPanel([]);
    expect(screen.getByText("Spend by Category")).toBeInTheDocument();
  });
});
