import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NavBar } from "./NavBar";

function renderNavBar(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <NavBar />
    </MemoryRouter>,
  );
}

describe("NavBar", () => {
  it("renders all four navigation links", () => {
    renderNavBar();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Upload" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });

  it("renders the brand name", () => {
    renderNavBar();
    expect(screen.getByText("Finance Analyser")).toBeInTheDocument();
  });

  it("marks the Dashboard link as active on /", () => {
    renderNavBar("/");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveClass(
      "navbar-link--active",
    );
  });

  it("marks the Upload link as active on /upload", () => {
    renderNavBar("/upload");
    expect(screen.getByRole("link", { name: "Upload" })).toHaveClass(
      "navbar-link--active",
    );
  });

  it("marks the History link as active on /history", () => {
    renderNavBar("/history");
    expect(screen.getByRole("link", { name: "History" })).toHaveClass(
      "navbar-link--active",
    );
  });

  it("marks the Settings link as active on /settings", () => {
    renderNavBar("/settings");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveClass(
      "navbar-link--active",
    );
  });

  it("does not mark Dashboard as active on /upload", () => {
    renderNavBar("/upload");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveClass(
      "navbar-link--active",
    );
  });
});
