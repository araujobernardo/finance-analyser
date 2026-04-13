import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { NavBar } from "./NavBar";
import { AccountProvider } from "../context/AccountContext";
import { ACTIVE_ACCOUNT_KEY } from "../context/accountKeys";
import { ACCOUNT_COLOURS } from "../services/storage";
import type { Account } from "../services/storage";

const ACCOUNTS_KEY = "finance_analyser_accounts";

function seedAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function renderNavBar(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AccountProvider>
        <NavBar />
      </AccountProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

// ── Navigation links ───────────────────────────────────────────────────────

describe("NavBar — navigation links", () => {
  it("renders all four navigation links", () => {
    renderNavBar();
    expect(screen.getByRole("link", { name: /Dashboard/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Upload/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /History/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Settings/ })).toBeInTheDocument();
  });

  it("renders the brand name", () => {
    renderNavBar();
    expect(screen.getByText("Finance Analyser")).toBeInTheDocument();
  });

  it("marks the Dashboard link as active on /", () => {
    renderNavBar("/");
    expect(screen.getByRole("link", { name: /Dashboard/ })).toHaveClass(
      "navbar-link--active",
    );
  });

  it("marks the Upload link as active on /upload", () => {
    renderNavBar("/upload");
    expect(screen.getByRole("link", { name: /Upload/ })).toHaveClass(
      "navbar-link--active",
    );
  });

  it("marks the History link as active on /history", () => {
    renderNavBar("/history");
    expect(screen.getByRole("link", { name: /History/ })).toHaveClass(
      "navbar-link--active",
    );
  });

  it("marks the Settings link as active on /settings", () => {
    renderNavBar("/settings");
    expect(screen.getByRole("link", { name: /Settings/ })).toHaveClass(
      "navbar-link--active",
    );
  });

  it("does not mark Dashboard as active on /upload", () => {
    renderNavBar("/upload");
    expect(screen.getByRole("link", { name: /Dashboard/ })).not.toHaveClass(
      "navbar-link--active",
    );
  });
});

// ── Account selector ───────────────────────────────────────────────────────

describe("NavBar — account selector", () => {
  it("does not render the selector when no accounts exist", () => {
    renderNavBar();
    expect(
      screen.queryByRole("button", { name: /active account/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the selector with the active account name", () => {
    seedAccounts([
      { id: "a1", name: "Checking", colour: ACCOUNT_COLOURS[0], createdAt: "" },
    ]);
    renderNavBar();
    expect(
      screen.getByRole("button", { name: /active account: checking/i }),
    ).toBeInTheDocument();
  });

  it("opens the dropdown on click and lists all accounts", async () => {
    seedAccounts([
      { id: "a1", name: "Checking", colour: ACCOUNT_COLOURS[0], createdAt: "" },
      { id: "a2", name: "Savings", colour: ACCOUNT_COLOURS[1], createdAt: "" },
    ]);
    renderNavBar();
    await userEvent.click(
      screen.getByRole("button", { name: /active account/i }),
    );
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /checking/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /savings/i }),
    ).toBeInTheDocument();
  });

  it("marks the active account as selected in the dropdown", async () => {
    seedAccounts([
      { id: "a1", name: "Checking", colour: ACCOUNT_COLOURS[0], createdAt: "" },
      { id: "a2", name: "Savings", colour: ACCOUNT_COLOURS[1], createdAt: "" },
    ]);
    renderNavBar();
    await userEvent.click(
      screen.getByRole("button", { name: /active account/i }),
    );
    expect(screen.getByRole("option", { name: /checking/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("option", { name: /savings/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("switches the active account on option click", async () => {
    seedAccounts([
      { id: "a1", name: "Checking", colour: ACCOUNT_COLOURS[0], createdAt: "" },
      { id: "a2", name: "Savings", colour: ACCOUNT_COLOURS[1], createdAt: "" },
    ]);
    renderNavBar();
    await userEvent.click(
      screen.getByRole("button", { name: /active account/i }),
    );
    await userEvent.click(screen.getByRole("option", { name: /savings/i }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /active account: savings/i }),
    ).toBeInTheDocument();
  });

  it("persists the selected account to localStorage", async () => {
    seedAccounts([
      { id: "a1", name: "Checking", colour: ACCOUNT_COLOURS[0], createdAt: "" },
      { id: "a2", name: "Savings", colour: ACCOUNT_COLOURS[1], createdAt: "" },
    ]);
    renderNavBar();
    await userEvent.click(
      screen.getByRole("button", { name: /active account/i }),
    );
    await userEvent.click(screen.getByRole("option", { name: /savings/i }));
    expect(localStorage.getItem(ACTIVE_ACCOUNT_KEY)).toBe("a2");
  });

  it("closes the dropdown when clicking outside", async () => {
    seedAccounts([
      { id: "a1", name: "Checking", colour: ACCOUNT_COLOURS[0], createdAt: "" },
    ]);
    renderNavBar();
    await userEvent.click(
      screen.getByRole("button", { name: /active account/i }),
    );
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await userEvent.click(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("restores the previously selected account across re-mounts", () => {
    seedAccounts([
      { id: "a1", name: "Checking", colour: ACCOUNT_COLOURS[0], createdAt: "" },
      { id: "a2", name: "Savings", colour: ACCOUNT_COLOURS[1], createdAt: "" },
    ]);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, "a2");
    renderNavBar();
    expect(
      screen.getByRole("button", { name: /active account: savings/i }),
    ).toBeInTheDocument();
  });
});
