import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpendByCategory } from "./SpendByCategory";
import type { CategoryRow } from "../utils/categoryData";

beforeEach(() => {
  localStorage.clear();
});

function row(category: string, total: number, percentage: number): CategoryRow {
  return { category, total, percentage };
}

function renderPanel(
  rows: CategoryRow[],
  {
    selectedCategory = null,
    onCategoryClick = vi.fn() as (category: string | null) => void,
    budgets = {},
    onBudgetsChange = vi.fn() as (budgets: Record<string, number>) => void,
  }: {
    selectedCategory?: string | null;
    onCategoryClick?: (category: string | null) => void;
    budgets?: Record<string, number>;
    onBudgetsChange?: (budgets: Record<string, number>) => void;
  } = {},
) {
  return render(
    <SpendByCategory
      rows={rows}
      selectedCategory={selectedCategory}
      onCategoryClick={onCategoryClick}
      budgets={budgets}
      onBudgetsChange={onBudgetsChange}
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
    renderPanel([row("Food", 80, 80), row("Transport", 20, 20)], {
      selectedCategory: "Food",
    });
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveClass("spend-row--selected");
    expect(items[1]).not.toHaveClass("spend-row--selected");
  });

  it("calls onCategoryClick with category name when a row is clicked", async () => {
    const onCategoryClick = vi.fn();
    renderPanel([row("Food", 100, 100)], { onCategoryClick });
    await userEvent.click(screen.getByText("Food"));
    expect(onCategoryClick).toHaveBeenCalledWith("Food");
  });

  it("calls onCategoryClick with null when the selected row is clicked again", async () => {
    const onCategoryClick = vi.fn();
    renderPanel([row("Food", 100, 100)], {
      selectedCategory: "Food",
      onCategoryClick,
    });
    await userEvent.click(screen.getByText("Food"));
    expect(onCategoryClick).toHaveBeenCalledWith(null);
  });

  it("renders the section title", () => {
    renderPanel([]);
    expect(screen.getByText("Spend by Category")).toBeInTheDocument();
  });
});

describe("SpendByCategory budget form", () => {
  it("shows '+ Budget' button", () => {
    renderPanel([row("Food", 100, 100)]);
    expect(
      screen.getByRole("button", { name: "+ Budget" }),
    ).toBeInTheDocument();
  });

  it("reveals the form when '+ Budget' is clicked", async () => {
    renderPanel([row("Food", 100, 100)]);
    await userEvent.click(screen.getByRole("button", { name: "+ Budget" }));
    expect(screen.getByTestId("budget-form")).toBeInTheDocument();
  });

  it("hides the form when 'Cancel' is clicked", async () => {
    renderPanel([row("Food", 100, 100)]);
    await userEvent.click(screen.getByRole("button", { name: "+ Budget" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByTestId("budget-form")).not.toBeInTheDocument();
  });

  it("calls onBudgetsChange when a budget is saved", async () => {
    const onBudgetsChange = vi.fn();
    renderPanel([row("Groceries", 200, 100)], { onBudgetsChange });
    await userEvent.click(screen.getByRole("button", { name: "+ Budget" }));
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Category" }),
      "Groceries",
    );
    await userEvent.clear(
      screen.getByRole("spinbutton", { name: "Budget amount" }),
    );
    await userEvent.type(
      screen.getByRole("spinbutton", { name: "Budget amount" }),
      "500",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onBudgetsChange).toHaveBeenCalledWith(
      expect.objectContaining({ Groceries: 500 }),
    );
  });

  it("does not call onBudgetsChange when amount is empty", async () => {
    const onBudgetsChange = vi.fn();
    renderPanel([row("Groceries", 200, 100)], { onBudgetsChange });
    await userEvent.click(screen.getByRole("button", { name: "+ Budget" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onBudgetsChange).not.toHaveBeenCalled();
  });
});

describe("SpendByCategory budget progress bar", () => {
  it("shows a budget progress bar when category has a budget", () => {
    renderPanel([row("Groceries", 200, 100)], {
      budgets: { Groceries: 500 },
    });
    expect(
      screen.getByLabelText("Budget progress for Groceries"),
    ).toBeInTheDocument();
  });

  it("does not show a progress bar when no budget is set", () => {
    renderPanel([row("Groceries", 200, 100)]);
    expect(
      screen.queryByLabelText("Budget progress for Groceries"),
    ).not.toBeInTheDocument();
  });

  it("shows a green bar when spend is below 80% of budget", () => {
    renderPanel([row("Groceries", 300, 100)], {
      budgets: { Groceries: 500 },
    });
    const fill = document.querySelector(".budget-bar__fill") as HTMLElement;
    expect(fill).toHaveClass("budget-bar__fill--ok");
  });

  it("shows an amber bar when spend is 80–100% of budget", () => {
    renderPanel([row("Groceries", 420, 100)], {
      budgets: { Groceries: 500 },
    });
    const fill = document.querySelector(".budget-bar__fill") as HTMLElement;
    expect(fill).toHaveClass("budget-bar__fill--warn");
  });

  it("shows a red bar when spend exceeds budget", () => {
    renderPanel([row("Groceries", 600, 100)], {
      budgets: { Groceries: 500 },
    });
    const fill = document.querySelector(".budget-bar__fill") as HTMLElement;
    expect(fill).toHaveClass("budget-bar__fill--over");
  });

  it("calls onBudgetsChange when a budget delete button is clicked", async () => {
    const onBudgetsChange = vi.fn();
    renderPanel([row("Groceries", 200, 100)], {
      budgets: { Groceries: 500 },
      onBudgetsChange,
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Remove budget for Groceries" }),
    );
    expect(onBudgetsChange).toHaveBeenCalledWith({});
  });
});

describe("SpendByCategory donut chart", () => {
  it("renders the chart container when rows are present", () => {
    const { container } = renderPanel([
      row("Food", 100, 75),
      row("Transport", 33, 25),
    ]);
    expect(
      container.querySelector(".spend-by-category__chart"),
    ).toBeInTheDocument();
  });

  it("does not render the chart container when there are no rows", () => {
    const { container } = renderPanel([]);
    expect(
      container.querySelector(".spend-by-category__chart"),
    ).not.toBeInTheDocument();
  });

  it("marks the chart container as aria-hidden", () => {
    const { container } = renderPanel([row("Food", 100, 100)]);
    expect(
      container.querySelector(".spend-by-category__chart"),
    ).toHaveAttribute("aria-hidden", "true");
  });
});

describe("SpendByCategory colour swatches", () => {
  it("renders a colour swatch for each category row", () => {
    const { container } = renderPanel([
      row("Food", 100, 75),
      row("Transport", 33, 25),
    ]);
    const swatches = container.querySelectorAll(".spend-row__swatch");
    expect(swatches).toHaveLength(2);
  });

  it("each swatch is aria-hidden", () => {
    const { container } = renderPanel([row("Food", 100, 100)]);
    const swatch = container.querySelector(".spend-row__swatch");
    expect(swatch).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a 4px percentage bar for each row", () => {
    const { container } = renderPanel([
      row("Food", 100, 75),
      row("Transport", 33, 25),
    ]);
    const bars = container.querySelectorAll(".spend-row__pct-bar");
    expect(bars).toHaveLength(2);
  });

  it("known categories receive a non-grey fill colour", () => {
    const { container } = renderPanel([row("Groceries", 200, 100)]);
    const swatch = container.querySelector(".spend-row__swatch") as HTMLElement;
    expect(swatch.style.background).toBe("rgb(192, 132, 252)"); // #c084fc
  });
});

describe("SpendByCategory orphaned budgets", () => {
  it("shows orphaned budgets section when a budget has no matching spend row", () => {
    renderPanel([row("Groceries", 200, 100)], {
      budgets: { Groceries: 500, Entertainment: 100 },
    });
    expect(screen.getByTestId("orphaned-budgets")).toBeInTheDocument();
    expect(screen.getByText("Entertainment")).toBeInTheDocument();
  });

  it("does not show orphaned section when all budgets have matching rows", () => {
    renderPanel([row("Groceries", 200, 100)], {
      budgets: { Groceries: 500 },
    });
    expect(screen.queryByTestId("orphaned-budgets")).not.toBeInTheDocument();
  });

  it("calls onBudgetsChange when an orphaned budget is deleted", async () => {
    const onBudgetsChange = vi.fn();
    renderPanel([row("Groceries", 200, 100)], {
      budgets: { Groceries: 500, Entertainment: 100 },
      onBudgetsChange,
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Remove budget for Entertainment" }),
    );
    expect(onBudgetsChange).toHaveBeenCalledWith({ Groceries: 500 });
  });
});
