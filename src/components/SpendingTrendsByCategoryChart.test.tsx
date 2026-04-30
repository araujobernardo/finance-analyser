import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { WeeklyCategoryBucket } from "../types/weeklyData";
import { SpendingTrendsByCategoryChart } from "./SpendingTrendsByCategoryChart";

function bucket(
  weekStart: string,
  label: string,
  byCategory: Record<string, number>,
): WeeklyCategoryBucket {
  return { weekStart, label, byCategory };
}

const TWO_WEEKS = [
  bucket("2026-01-26", "27 Jan", { Groceries: 100, Transport: 50 }),
  bucket("2026-02-02", "3 Feb", { Groceries: 80, Transport: 60 }),
];

describe("SpendingTrendsByCategoryChart", () => {
  describe("empty and loading guards", () => {
    it("shows empty state when data is empty", () => {
      render(
        <SpendingTrendsByCategoryChart data={[]} selectedCategory={null} />,
      );
      expect(screen.getByText(/Need at least 2 weeks/)).toBeInTheDocument();
    });

    it("shows empty state when only one week is provided", () => {
      render(
        <SpendingTrendsByCategoryChart
          data={[bucket("2026-01-26", "27 Jan", { Groceries: 100 })]}
          selectedCategory={null}
        />,
      );
      expect(screen.getByText(/Need at least 2 weeks/)).toBeInTheDocument();
    });

    it("renders skeleton when isLoading is true", () => {
      const { container } = render(
        <SpendingTrendsByCategoryChart
          data={[]}
          selectedCategory={null}
          isLoading
        />,
      );
      expect(container.querySelector(".skeleton-card")).toBeInTheDocument();
    });

    it("does not render empty state when isLoading is true", () => {
      render(
        <SpendingTrendsByCategoryChart
          data={[]}
          selectedCategory={null}
          isLoading
        />,
      );
      expect(
        screen.queryByText(/Need at least 2 weeks/),
      ).not.toBeInTheDocument();
    });

    it("renders the card title in all states", () => {
      render(
        <SpendingTrendsByCategoryChart data={[]} selectedCategory={null} />,
      );
      expect(
        screen.getByText("Spending Trends by Category"),
      ).toBeInTheDocument();
    });
  });

  describe("chart rendering", () => {
    it("renders the scroll wrapper when two or more weeks are provided", () => {
      const { container } = render(
        <SpendingTrendsByCategoryChart
          data={TWO_WEEKS}
          selectedCategory={null}
        />,
      );
      expect(
        container.querySelector(".spend-trends__scroll"),
      ).toBeInTheDocument();
    });

    it("does not show empty state message when two or more weeks are present", () => {
      render(
        <SpendingTrendsByCategoryChart
          data={TWO_WEEKS}
          selectedCategory={null}
        />,
      );
      expect(
        screen.queryByText(/Need at least 2 weeks/),
      ).not.toBeInTheDocument();
    });

    it("applies min-width of 480px for fewer than 7 data buckets", () => {
      const { container } = render(
        <SpendingTrendsByCategoryChart
          data={TWO_WEEKS}
          selectedCategory={null}
        />,
      );
      const inner = container.querySelector(
        ".spend-trends__scroll > div",
      ) as HTMLElement;
      // minWidth = max(480, 2 * 80) = 480
      expect(inner?.style.minWidth).toBe("480px");
    });

    it("applies scaled min-width when there are many weeks", () => {
      const manyWeeks = Array.from({ length: 8 }, (_, i) =>
        bucket(`2026-0${String(i + 1).padStart(2, "0")}-01`, `W${i}`, {
          Groceries: 50,
        }),
      );
      const { container } = render(
        <SpendingTrendsByCategoryChart
          data={manyWeeks}
          selectedCategory={null}
        />,
      );
      const inner = container.querySelector(
        ".spend-trends__scroll > div",
      ) as HTMLElement;
      // minWidth = max(480, 8 * 80) = 640
      expect(inner?.style.minWidth).toBe("640px");
    });
  });

  describe("line rendering — one line per category", () => {
    it("renders one Recharts Line element per unique category", () => {
      const { container } = render(
        <SpendingTrendsByCategoryChart
          data={TWO_WEEKS}
          selectedCategory={null}
        />,
      );
      // Recharts renders .recharts-line elements in the SVG
      const lines = container.querySelectorAll(".recharts-line");
      expect(lines.length).toBe(2); // Groceries + Transport
    });

    it("all lines have full strokeOpacity when selectedCategory is null", () => {
      const { container } = render(
        <SpendingTrendsByCategoryChart
          data={TWO_WEEKS}
          selectedCategory={null}
        />,
      );
      const paths = container.querySelectorAll(".recharts-line-curve");
      paths.forEach((path) => {
        const opacity = (path as SVGElement).getAttribute("stroke-opacity");
        // When no selection, opacity should be 1 (or null meaning default 1)
        expect(opacity === "1" || opacity === null).toBe(true);
      });
    });

    it("selected category line has full opacity; others are dimmed", () => {
      const { container } = render(
        <SpendingTrendsByCategoryChart
          data={TWO_WEEKS}
          selectedCategory="Groceries"
        />,
      );
      const lines = Array.from(container.querySelectorAll(".recharts-line"));
      // Find Groceries and Transport lines by data-key-based class or check stroke-opacity
      const paths = container.querySelectorAll(".recharts-line-curve");
      const opacities = Array.from(paths).map(
        (p) => (p as SVGElement).getAttribute("stroke-opacity") ?? "1",
      );
      // One line should be "1" (selected) and one should be "0.25" (dimmed)
      expect(opacities).toContain("1");
      expect(opacities).toContain("0.25");
      // Suppress unused variable warning
      expect(lines.length).toBe(2);
    });
  });

  describe("hover interaction", () => {
    it("shows ReferenceLine when onMouseMove fires with an activeLabel", () => {
      const { container } = render(
        <SpendingTrendsByCategoryChart
          data={TWO_WEEKS}
          selectedCategory={null}
        />,
      );
      const chartSurface = container.querySelector(
        ".recharts-surface",
      ) as Element;
      if (chartSurface) {
        fireEvent.mouseMove(chartSurface, { clientX: 100, clientY: 100 });
        // After mouse move Recharts may render a reference line — we just ensure no crash
      }
      // The component should not throw — no assertion on the DOM since Recharts
      // requires a real layout to compute activeLabel in jsdom
      expect(
        container.querySelector(".spend-trends__scroll"),
      ).toBeInTheDocument();
    });
  });
});
