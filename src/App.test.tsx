import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import * as categorisationMod from "./services/categorisation";

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

// -- T010: detectTransfers sets category: "Savings" (not "Savings & Transfers") --

describe("App -- detectTransfers sets category to 'Savings' on detected transfer pairs", () => {
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
    vi.restoreAllMocks();
  });

  it("T010: uploading CSVs from two accounts with a matching date/amount pair produces transfers categorised as 'Savings'", async () => {
    vi.spyOn(categorisationMod, "categoriseTransactions").mockResolvedValue([]);

    const csvAccountA =
      "ASB Bank Export\n" +
      "Account 111111 Branch 001 (Everyday)\n" +
      "Date,Description,Amount,Balance\n" +
      "15/01/2026,Transfer to savings,-500.00,1000.00\n";

    const csvAccountB =
      "ASB Bank Export\n" +
      "Account 222222 Branch 001 (Savings)\n" +
      "Date,Description,Amount,Balance\n" +
      "15/01/2026,Transfer from everyday,500.00,2500.00\n";

    const fileA = new File([csvAccountA], "everyday.csv", { type: "text/csv" });
    const fileB = new File([csvAccountB], "savings.csv", { type: "text/csv" });

    const user = userEvent.setup();
    renderApp();

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(fileInput, [fileA, fileB]);

    await waitFor(
      () => expect(screen.getByText(/imported/i)).toBeInTheDocument(),
      { timeout: 5000 },
    );

    // Sidebar nav items are now NavLinks (<a>), not buttons
    const txnTab = screen.getByRole("link", { name: /transactions/i });
    await user.click(txnTab);

    const showTransfers = screen.getByRole("checkbox");
    await user.click(showTransfers);

    expect(screen.queryByText("Savings & Transfers")).not.toBeInTheDocument();
    const savingsTags = screen.getAllByText("Savings");
    expect(savingsTags.length).toBeGreaterThanOrEqual(1);
  });
});

// -- Load-time normalisation (backward-compat: "Savings & Transfers" -> "Savings") --

describe("App -- load-time normalisation of legacy Savings & Transfers category", () => {
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

  it("displays 'Savings' (not 'Savings & Transfers') for transactions loaded from localStorage with the old category name", async () => {
    const legacyTxn = {
      id: "acct::2026-01-01-100.00-0",
      date: "2026-01-01",
      month: "2026-01",
      type: "",
      payee: "Bank Transfer",
      memo: "",
      amount: -100,
      isCredit: false,
      account: "Main Account",
      accountShort: "acct",
      category: "Savings & Transfers",
      isTransfer: true,
    };
    localStorage.setItem("pfa-v3-transactions", JSON.stringify([legacyTxn]));

    const user = userEvent.setup();
    renderApp();

    const txnTab = screen.getByRole("link", { name: /transactions/i });
    await user.click(txnTab);

    const showTransfers = screen.getByRole("checkbox");
    await user.click(showTransfers);

    expect(screen.queryByText("Savings & Transfers")).not.toBeInTheDocument();
    expect(screen.getByText("Savings")).toBeInTheDocument();
  });
});
