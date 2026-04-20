import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { EmptyState } from "./EmptyState";

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("EmptyState", () => {
  it("renders the message", () => {
    renderWithRouter(
      <EmptyState icon={<span>icon</span>} message="No data available." />,
    );
    expect(screen.getByText("No data available.")).toBeInTheDocument();
  });

  it("renders the icon slot", () => {
    renderWithRouter(
      <EmptyState
        icon={<span data-testid="test-icon">★</span>}
        message="msg"
      />,
    );
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });

  it("renders CTA link when ctaLabel and ctaTo are provided", () => {
    renderWithRouter(
      <EmptyState
        icon={<span />}
        message="msg"
        ctaLabel="Upload CSV"
        ctaTo="/upload"
      />,
    );
    const link = screen.getByRole("link", { name: "Upload CSV" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/upload");
  });

  it("does not render CTA when ctaLabel is omitted", () => {
    renderWithRouter(<EmptyState icon={<span />} message="msg" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("has data-testid empty-state", () => {
    renderWithRouter(<EmptyState icon={<span />} message="msg" />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });
});
