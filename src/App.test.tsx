import { afterEach, describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("App shell", () => {
  afterEach(cleanup);

  it("renders the sidebar", () => {
    render(<App />);
    expect(screen.getByText("Analyser")).toBeInTheDocument();
  });

  it("renders the Dashboard empty state by default", () => {
    render(<App />);
    expect(screen.getByText("No data yet")).toBeInTheDocument();
  });
});

// ── Load-time normalisation (backward-compat: "Savings & Transfers" → "Savings") ──

describe("App — load-time normalisation of legacy Savings & Transfers category", () => {
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
    render(<App />);

    // Navigate to Transactions tab
    const txnTab = screen.getByRole("button", { name: /transactions/i });
    await user.click(txnTab);

    // Enable Show transfers to make the transfer-flagged transaction visible
    const showTransfers = screen.getByRole("checkbox");
    await user.click(showTransfers);

    // The old label must not appear anywhere
    expect(screen.queryByText("Savings & Transfers")).not.toBeInTheDocument();
    // The new label must appear in the category cell
    expect(screen.getByText("Savings")).toBeInTheDocument();
  });
});
