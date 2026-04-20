import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkeletonCard } from "./SkeletonCard";

describe("SkeletonCard", () => {
  it("renders with aria-busy and aria-label", () => {
    render(<SkeletonCard />);
    const el = screen.getByTestId("skeleton-card");
    expect(el).toHaveAttribute("aria-busy", "true");
    expect(el).toHaveAttribute("aria-label", "Loading…");
  });

  it("renders default 4 rows", () => {
    render(<SkeletonCard />);
    const rows = screen
      .getByTestId("skeleton-card")
      .querySelectorAll(".skeleton-card__row");
    expect(rows).toHaveLength(4);
  });

  it("renders custom number of rows", () => {
    render(<SkeletonCard rows={2} />);
    const rows = screen
      .getByTestId("skeleton-card")
      .querySelectorAll(".skeleton-card__row");
    expect(rows).toHaveLength(2);
  });
});
