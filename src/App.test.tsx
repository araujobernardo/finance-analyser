import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

function renderApp(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
}

describe("App routing", () => {
  it("renders DashboardPage on /", () => {
    renderApp("/");
    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
  });

  it("renders UploadPage on /upload", () => {
    renderApp("/upload");
    expect(
      screen.getByRole("heading", { name: /Upload Transactions/ }),
    ).toBeInTheDocument();
  });

  it("renders HistoryPage on /history", () => {
    renderApp("/history");
    expect(screen.getByRole("heading", { name: "Trends" })).toBeInTheDocument();
  });

  it("renders SettingsPage on /settings", () => {
    renderApp("/settings");
    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
  });

  it("renders NotFoundPage on an unknown route", () => {
    renderApp("/this-does-not-exist");
    expect(screen.getByRole("heading", { name: /404/i })).toBeInTheDocument();
  });

  it("renders the NavBar on every page", () => {
    renderApp("/upload");
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
