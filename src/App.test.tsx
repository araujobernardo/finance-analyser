import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import * as categorisationMod from "./services/categorisation";

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

// -- T010: detectTransfers sets category: "Savings" (not "Savings & Transfers") --

describe("App -- detectTransfers sets category to 'Savings' on detected transfer pairs", () => {
  afterEach(() => {
    localStorage.clear();
    cleanup();
    vi.restoreAllMocks();
  });

  it("T010: uploading CSVs from two accounts with a matching date/amount pair produces transfers categorised as 'Savings'", async () => {
    // Stub categoriseTransactions so no real API call is made.
    // Detected transfer rows have isTransfer:true so they won't be in needsCat,
    // but we stub anyway for safety.
    vi.spyOn(categorisationMod, "categoriseTransactions").mockResolvedValue([]);

    // Two ASB-format CSVs -- different account numbers -> different accountShort values.
    // Same date (15/01/2026) and same absolute amount (500.00) -> detectTransfers pairs them.
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
    render(<App />);

    // Trigger the hidden file input in the sidebar
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    await user.upload(fileInput, [fileA, fileB]);

    // Wait for the upload to complete and the success message to appear
    await waitFor(
      () => expect(screen.getByText(/imported/i)).toBeInTheDocument(),
      { timeout: 5000 },
    );

    // Navigate to Transactions tab
    const txnTab = screen.getByRole("button", { name: /transactions/i });
    await user.click(txnTab);

    // Enable Show transfers to reveal transfer-flagged rows
    const showTransfers = screen.getByRole("checkbox");
    await user.click(showTransfers);

    // The old label must not appear anywhere in the rendered output
    expect(screen.queryByText("Savings & Transfers")).not.toBeInTheDocument();
    // The new label "Savings" must appear as the category tag for the transfer pair
    const savingsTags = screen.getAllByText("Savings");
    expect(savingsTags.length).toBeGreaterThanOrEqual(1);
  });
});

// -- Load-time normalisation (backward-compat: "Savings & Transfers" -> "Savings") --

describe("App -- load-time normalisation of legacy Savings & Transfers category", () => {
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
