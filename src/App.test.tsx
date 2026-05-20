import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

// Pre-seed a fake token so ProtectedRoute treats the session as authenticated.
// The client never validates JWT content — it only checks for presence.
const FAKE_TOKEN = "test.jwt.token";

function renderApp(initialPath = "/dashboard") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
}

describe("App shell", () => {
  beforeEach(() => {
    localStorage.setItem("fa-auth-token", FAKE_TOKEN);
    localStorage.setItem(
      "fa-auth-user",
      JSON.stringify({
        id: "test-user-id",
        email: "test@example.com",
        displayName: "Test User",
      }),
    );
  });
  afterEach(() => {
    localStorage.clear();
    cleanup();
  });

  it("renders the sidebar", () => {
    renderApp();
    expect(screen.getByText("Analyser")).toBeInTheDocument();
  });

  it("renders the Dashboard empty state by default", () => {
    renderApp();
    expect(screen.getByText("No data yet")).toBeInTheDocument();
  });
});
