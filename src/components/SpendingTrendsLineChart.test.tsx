import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ApiTransaction } from "../types/api";
import { SpendingTrendsLineChart } from "./SpendingTrendsLineChart";

// ── Fixtures ──────────────────────────────────────────────────────────────

function makeTxn(
  overrides: Partial<ApiTransaction> & {
    date: string;
    amount: number;
    category?: string;
  },
): ApiTransaction {
  return {
    id: Math.random().toString(),
    userId: "user1",
    accountId: "acc1",
    date: overrides.date,
    description: "Test",
    amount: overrides.amount,
    category: overrides.category ?? "Groceries",
    isTransfer: false,
    isManualTransfer: false,
    createdAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

// Two months of expense data, 5 categories.
const MULTI_MONTH: ApiTransaction[] = [
  makeTxn({ date: "2025-01-10", amount: -200, category: "Groceries" }),
  makeTxn({ date: "2025-01-15", amount: -100, category: "Transport" }),
  makeTxn({ date: "2025-01-20", amount: -80, category: "Dining" }),
  makeTxn({ date: "2025-01-25", amount: -60, category: "Entertainment" }),
  makeTxn({ date: "2025-01-28", amount: -40, category: "Utilities" }),
  makeTxn({ date: "2025-02-10", amount: -220, category: "Groceries" }),
  makeTxn({ date: "2025-02-15", amount: -110, category: "Transport" }),
  makeTxn({ date: "2025-02-20", amount: -90, category: "Dining" }),
  makeTxn({ date: "2025-02-25", amount: -70, category: "Entertainment" }),
  makeTxn({ date: "2025-02-28", amount: -50, category: "Utilities" }),
];

// Single month — card should be hidden.
const SINGLE_MONTH: ApiTransaction[] = [
  makeTxn({ date: "2025-01-10", amount: -200, category: "Groceries" }),
  makeTxn({ date: "2025-01-15", amount: -100, category: "Transport" }),
];

// Credits should be excluded.
const WITH_CREDITS: ApiTransaction[] = [
  ...MULTI_MONTH,
  makeTxn({ date: "2025-01-05", amount: 1000, category: "Income" }),
  makeTxn({ date: "2025-02-05", amount: 1000, category: "Income" }),
];

// Transfers should be excluded.
const WITH_TRANSFERS: ApiTransaction[] = [
  ...MULTI_MONTH,
  {
    ...makeTxn({ date: "2025-01-03", amount: -500, category: "Transfer" }),
    isTransfer: true,
  },
  {
    ...makeTxn({ date: "2025-02-03", amount: -500, category: "Transfer" }),
    isTransfer: true,
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────

describe("SpendingTrendsLineChart", () => {
  describe("visibility guard", () => {
    it("renders the card when at least 2 months of data exist", () => {
      render(
        <SpendingTrendsLineChart
          transactions={MULTI_MONTH}
          activeAccountId="all"
        />,
      );
      expect(
        screen.getByTestId("spending-trends-line-chart"),
      ).toBeInTheDocument();
    });

    it("renders nothing when fewer than 2 months of data exist", () => {
      const { container } = render(
        <SpendingTrendsLineChart
          transactions={SINGLE_MONTH}
          activeAccountId="all"
        />,
      );
      expect(
        container.querySelector("[data-testid='spending-trends-line-chart']"),
      ).toBeNull();
    });

    it("renders nothing when transactions array is empty", () => {
      const { container } = render(
        <SpendingTrendsLineChart transactions={[]} activeAccountId="all" />,
      );
      expect(
        container.querySelector("[data-testid='spending-trends-line-chart']"),
      ).toBeNull();
    });
  });

  describe("category chips", () => {
    it("renders one chip per top-5 category", () => {
      render(
        <SpendingTrendsLineChart
          transactions={MULTI_MONTH}
          activeAccountId="all"
        />,
      );
      // 5 categories present in MULTI_MONTH
      expect(screen.getByTestId("cat-chip-Groceries")).toBeInTheDocument();
      expect(screen.getByTestId("cat-chip-Transport")).toBeInTheDocument();
      expect(screen.getByTestId("cat-chip-Dining")).toBeInTheDocument();
      expect(screen.getByTestId("cat-chip-Entertainment")).toBeInTheDocument();
      expect(screen.getByTestId("cat-chip-Utilities")).toBeInTheDocument();
    });

    it("chips are not dimmed by default (all categories visible)", () => {
      render(
        <SpendingTrendsLineChart
          transactions={MULTI_MONTH}
          activeAccountId="all"
        />,
      );
      const chip = screen.getByTestId("cat-chip-Groceries");
      expect(chip.className).not.toContain("stlc-chip--dimmed");
    });

    it("applies dimmed class when a chip is clicked", () => {
      render(
        <SpendingTrendsLineChart
          transactions={MULTI_MONTH}
          activeAccountId="all"
        />,
      );
      const chip = screen.getByTestId("cat-chip-Groceries");
      fireEvent.click(chip);
      expect(chip.className).toContain("stlc-chip--dimmed");
    });

    it("removes dimmed class when a chip is clicked again (toggle off)", () => {
      render(
        <SpendingTrendsLineChart
          transactions={MULTI_MONTH}
          activeAccountId="all"
        />,
      );
      const chip = screen.getByTestId("cat-chip-Groceries");
      fireEvent.click(chip);
      expect(chip.className).toContain("stlc-chip--dimmed");
      fireEvent.click(chip);
      expect(chip.className).not.toContain("stlc-chip--dimmed");
    });

    it("chip has aria-pressed=true when category is visible", () => {
      render(
        <SpendingTrendsLineChart
          transactions={MULTI_MONTH}
          activeAccountId="all"
        />,
      );
      const chip = screen.getByTestId("cat-chip-Groceries");
      expect(chip.getAttribute("aria-pressed")).toBe("true");
    });

    it("chip has aria-pressed=false when category is hidden", () => {
      render(
        <SpendingTrendsLineChart
          transactions={MULTI_MONTH}
          activeAccountId="all"
        />,
      );
      const chip = screen.getByTestId("cat-chip-Groceries");
      fireEvent.click(chip);
      expect(chip.getAttribute("aria-pressed")).toBe("false");
    });
  });

  describe("data filtering", () => {
    it("excludes credit transactions (positive amounts)", () => {
      render(
        <SpendingTrendsLineChart
          transactions={WITH_CREDITS}
          activeAccountId="all"
        />,
      );
      // Income chip should NOT appear since credits are excluded
      expect(screen.queryByTestId("cat-chip-Income")).toBeNull();
    });

    it("excludes transfer transactions", () => {
      render(
        <SpendingTrendsLineChart
          transactions={WITH_TRANSFERS}
          activeAccountId="all"
        />,
      );
      expect(screen.queryByTestId("cat-chip-Transfer")).toBeNull();
    });

    it("filters to selected account when activeAccountId is not 'all'", () => {
      const acc2Only: ApiTransaction[] = [
        {
          ...makeTxn({
            date: "2025-01-10",
            amount: -200,
            category: "Groceries",
          }),
          accountId: "acc2",
        },
        {
          ...makeTxn({
            date: "2025-02-10",
            amount: -220,
            category: "Groceries",
          }),
          accountId: "acc2",
        },
        makeTxn({ date: "2025-01-15", amount: -100, category: "Transport" }), // acc1
        makeTxn({ date: "2025-02-15", amount: -110, category: "Transport" }), // acc1
      ];
      render(
        <SpendingTrendsLineChart
          transactions={acc2Only}
          activeAccountId="acc2"
        />,
      );
      // Only Groceries (acc2) should appear; Transport (acc1) should not
      expect(screen.getByTestId("cat-chip-Groceries")).toBeInTheDocument();
      expect(screen.queryByTestId("cat-chip-Transport")).toBeNull();
    });
  });

  describe("SVG rendering", () => {
    it("renders an SVG element inside the chart", () => {
      const { container } = render(
        <SpendingTrendsLineChart
          transactions={MULTI_MONTH}
          activeAccountId="all"
        />,
      );
      expect(container.querySelector("svg.stlc-svg")).toBeInTheDocument();
    });

    it("renders a gradient fill path for the top category", () => {
      const { container } = render(
        <SpendingTrendsLineChart
          transactions={MULTI_MONTH}
          activeAccountId="all"
        />,
      );
      // Gradient defs should be present
      expect(
        container.querySelector("defs linearGradient#stlc-tg"),
      ).toBeInTheDocument();
    });

    it("gradient fill is removed when top category chip is toggled off", () => {
      const { container } = render(
        <SpendingTrendsLineChart
          transactions={MULTI_MONTH}
          activeAccountId="all"
        />,
      );
      // Top category should be Groceries (highest spend)
      const topChip = screen.getByTestId("cat-chip-Groceries");
      fireEvent.click(topChip);
      expect(container.querySelector("defs linearGradient#stlc-tg")).toBeNull();
    });
  });

  describe("card header", () => {
    it("shows the card title", () => {
      render(
        <SpendingTrendsLineChart
          transactions={MULTI_MONTH}
          activeAccountId="all"
        />,
      );
      expect(
        screen.getByText("Spending Trends by Category"),
      ).toBeInTheDocument();
    });

    it("shows a subtitle with the month range", () => {
      render(
        <SpendingTrendsLineChart
          transactions={MULTI_MONTH}
          activeAccountId="all"
        />,
      );
      // Jan '25 – Feb '25
      const subtitle = screen.getByText(/Jan '25.*Feb '25/);
      expect(subtitle).toBeInTheDocument();
    });
  });

  describe("tooltip", () => {
    it("renders the tooltip element (initially hidden)", () => {
      render(
        <SpendingTrendsLineChart
          transactions={MULTI_MONTH}
          activeAccountId="all"
        />,
      );
      const tooltip = screen.getByTestId("spending-trends-tooltip");
      expect(tooltip).toBeInTheDocument();
      expect(tooltip.className).not.toContain("stlc-tooltip--visible");
    });
  });
});
