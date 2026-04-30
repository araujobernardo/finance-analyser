import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { WeekBucket } from "../types/weeklyData";
import { WeeklyTrendChart } from "./WeeklyTrendChart";

function bucket(
  weekStart: string,
  label: string,
  totalSpend: number,
): WeekBucket {
  return { weekStart, label, totalSpend };
}

describe("WeeklyTrendChart", () => {
  describe("empty and loading guards", () => {
    it("shows no-data empty message when data is empty", () => {
      render(<WeeklyTrendChart data={[]} />);
      expect(screen.getByText(/No weekly data yet/)).toBeInTheDocument();
    });

    it("shows single-week empty message when only one week is provided", () => {
      render(<WeeklyTrendChart data={[bucket("2026-01-27", "Jan 27", 500)]} />);
      expect(screen.getByText(/at least two weeks/)).toBeInTheDocument();
    });

    it("renders skeleton when isLoading is true", () => {
      const { container } = render(<WeeklyTrendChart data={[]} isLoading />);
      // SkeletonCard renders .skeleton-card
      expect(container.querySelector(".skeleton-card")).toBeInTheDocument();
    });

    it("does not render empty state when isLoading is true and data is empty", () => {
      render(<WeeklyTrendChart data={[]} isLoading />);
      expect(screen.queryByText(/No weekly data yet/)).not.toBeInTheDocument();
    });
  });

  describe("chart rendering", () => {
    it("renders the scroll wrapper when two or more weeks are provided", () => {
      const { container } = render(
        <WeeklyTrendChart
          data={[
            bucket("2026-01-27", "Jan 27", 500),
            bucket("2026-02-03", "Feb 3", 620),
          ]}
        />,
      );
      expect(
        container.querySelector(".weekly-trend-scroll"),
      ).toBeInTheDocument();
    });

    it("does not render empty message when two weeks are present", () => {
      render(
        <WeeklyTrendChart
          data={[
            bucket("2026-01-27", "Jan 27", 500),
            bucket("2026-02-03", "Feb 3", 620),
          ]}
        />,
      );
      expect(screen.queryByText(/No weekly data yet/)).not.toBeInTheDocument();
      expect(screen.queryByText(/at least two weeks/)).not.toBeInTheDocument();
    });

    it("applies min-width of 480px for fewer than 7 weeks", () => {
      const { container } = render(
        <WeeklyTrendChart
          data={[
            bucket("2026-01-27", "Jan 27", 500),
            bucket("2026-02-03", "Feb 3", 620),
          ]}
        />,
      );
      const inner = container.querySelector(
        ".weekly-trend-scroll > div",
      ) as HTMLElement;
      // minWidth = max(480, 2 * 80) = 480
      expect(inner?.style.minWidth).toBe("480px");
    });

    it("applies scaled min-width when there are many weeks", () => {
      const data = Array.from({ length: 8 }, (_, i) =>
        bucket(
          `2026-0${String(i + 1).padStart(2, "0")}-01`,
          `W${i}`,
          100 * (i + 1),
        ),
      );
      const { container } = render(<WeeklyTrendChart data={data} />);
      const inner = container.querySelector(
        ".weekly-trend-scroll > div",
      ) as HTMLElement;
      // minWidth = max(480, 8 * 80) = 640
      expect(inner?.style.minWidth).toBe("640px");
    });

    it("renders the aria-label on the scroll wrapper", () => {
      const { container } = render(
        <WeeklyTrendChart
          data={[
            bucket("2026-01-27", "Jan 27", 500),
            bucket("2026-02-03", "Feb 3", 620),
          ]}
        />,
      );
      const wrapper = container.querySelector(".weekly-trend-scroll");
      expect(wrapper).toHaveAttribute(
        "aria-label",
        "Weekly spending trend chart",
      );
    });
  });

  describe("legend", () => {
    it("renders the legend when two or more weeks are provided", () => {
      const { container } = render(
        <WeeklyTrendChart
          data={[
            bucket("2026-01-27", "Jan 27", 500),
            bucket("2026-02-03", "Feb 3", 620),
          ]}
        />,
      );
      expect(
        container.querySelector(".weekly-trend-legend"),
      ).toBeInTheDocument();
    });

    it('renders "Weekly spend" label in the legend', () => {
      render(
        <WeeklyTrendChart
          data={[
            bucket("2026-01-27", "Jan 27", 500),
            bucket("2026-02-03", "Feb 3", 620),
          ]}
        />,
      );
      expect(screen.getByText("Weekly spend")).toBeInTheDocument();
    });

    it('renders "4-wk avg" label in the legend', () => {
      render(
        <WeeklyTrendChart
          data={[
            bucket("2026-01-27", "Jan 27", 500),
            bucket("2026-02-03", "Feb 3", 620),
          ]}
        />,
      );
      expect(screen.getByText("4-wk avg")).toBeInTheDocument();
    });

    it("renders the indigo swatch with correct background colour", () => {
      const { container } = render(
        <WeeklyTrendChart
          data={[
            bucket("2026-01-27", "Jan 27", 500),
            bucket("2026-02-03", "Feb 3", 620),
          ]}
        />,
      );
      const swatch = container.querySelector(
        ".weekly-trend-legend__swatch",
      ) as HTMLElement;
      expect(swatch).toBeInTheDocument();
      expect(swatch.style.backgroundColor).toBe("rgb(99, 102, 241)");
    });

    it("renders the accent line with correct background colour", () => {
      const { container } = render(
        <WeeklyTrendChart
          data={[
            bucket("2026-01-27", "Jan 27", 500),
            bucket("2026-02-03", "Feb 3", 620),
          ]}
        />,
      );
      const line = container.querySelector(
        ".weekly-trend-legend__line",
      ) as HTMLElement;
      expect(line).toBeInTheDocument();
      expect(line.style.backgroundColor).toBe("var(--accent)");
    });

    it("does not render the legend in empty state", () => {
      const { container } = render(<WeeklyTrendChart data={[]} />);
      expect(
        container.querySelector(".weekly-trend-legend"),
      ).not.toBeInTheDocument();
    });

    it("does not render the legend in loading state", () => {
      const { container } = render(<WeeklyTrendChart data={[]} isLoading />);
      expect(
        container.querySelector(".weekly-trend-legend"),
      ).not.toBeInTheDocument();
    });
  });
});
