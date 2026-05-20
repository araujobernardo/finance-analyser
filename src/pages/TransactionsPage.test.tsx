import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TransactionsPage } from "./TransactionsPage";
import type { PfaTxn } from "../types/pfa";
import type { ApiTransaction } from "../types/api";
import {
  getCandidates,
  applyFlag,
  applyUnflag,
} from "../utils/transferFlagging";

// ── Mock AccountContext ────────────────────────────────────────────────────────

const mockAccounts = [
  { id: "acc-1", nickname: "Main Account", colour: "#6C8EBF" },
];
let mockRawTransactions: ApiTransaction[] = [];

vi.mock("../context/AccountContext", () => ({
  useAccount: () => ({
    accounts: mockAccounts,
    isLoading: false,
    error: null,
    activeAccountId: "acc-1",
    refetch: vi.fn(),
    setActiveAccountId: vi.fn(),
    addAccount: vi.fn(),
    removeAccount: vi.fn(),
    updateAccount: vi.fn(),
  }),
  useAllTransactions: () => mockRawTransactions,
  ALL_ACCOUNTS_ID: "all",
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeApiTxn(overrides: Partial<ApiTransaction> = {}): ApiTransaction {
  return {
    id: "txn-1",
    userId: "user-1",
    accountId: "acc-1",
    date: "2026-03-15",
    amount: -100,
    description: "Test Payee",
    category: "Groceries",
    isTransfer: false,
    isManualTransfer: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TransactionsPage />
    </MemoryRouter>,
  );
}

// ── PfaTxn fixtures used by the transferFlagging utility tests ──────────────

function makePfaTxn(overrides: Partial<PfaTxn>): PfaTxn {
  return {
    id: "txn-1",
    date: "2026-03-15",
    month: "2026-03",
    type: "",
    payee: "Test Payee",
    memo: "",
    amount: -100,
    isCredit: false,
    account: "Main Account",
    accountShort: "Main",
    category: "Groceries",
    isTransfer: false,
    ...overrides,
  };
}

const txnA = makePfaTxn({ id: "txn-a", amount: -100, category: "Groceries" });
const txnB = makePfaTxn({
  id: "txn-b",
  amount: 100,
  isCredit: true,
  category: "Income",
});
const txnC = makePfaTxn({
  id: "txn-c",
  amount: -100,
  category: "Transport",
  date: "2026-03-16", // different date
});
const txnD = makePfaTxn({
  id: "txn-d",
  amount: -50, // different amount
  category: "Dining & Takeaways",
});
const txnE = makePfaTxn({
  id: "txn-e",
  amount: -100,
  category: "Utilities & Bills",
  isTransfer: true, // already a transfer
});

// ── getCandidates ─────────────────────────────────────────────────────────────

describe("getCandidates", () => {
  it("returns same-day same-amount non-transfer transactions excluding the initiating transaction", () => {
    const txns = [txnA, txnB, txnC, txnD, txnE];
    const result = getCandidates(txns, txnA.id);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("txn-b");
  });

  it("returns empty array when no transactions match the criteria", () => {
    const txns = [txnA, txnC, txnD, txnE];
    const result = getCandidates(txns, txnA.id);
    expect(result).toHaveLength(0);
  });

  it("excludes the initiating transaction itself from candidates", () => {
    const txns = [txnA, txnB];
    const result = getCandidates(txns, txnA.id);
    const ids = result.map((t) => t.id);
    expect(ids).not.toContain(txnA.id);
  });

  it("returns empty array when initiating transaction is not found", () => {
    const txns = [txnA, txnB];
    const result = getCandidates(txns, "nonexistent-id");
    expect(result).toHaveLength(0);
  });
});

// ── applyFlag ─────────────────────────────────────────────────────────────────

describe("applyFlag", () => {
  it("sets isTransfer: true on both transactions", () => {
    const txns = [txnA, txnB];
    const result = applyFlag(txns, txnA.id, txnB.id);
    const a = result.find((t) => t.id === txnA.id)!;
    const b = result.find((t) => t.id === txnB.id)!;
    expect(a.isTransfer).toBe(true);
    expect(b.isTransfer).toBe(true);
  });

  it("sets category to 'Savings' on both transactions", () => {
    const txns = [txnA, txnB];
    const result = applyFlag(txns, txnA.id, txnB.id);
    const a = result.find((t) => t.id === txnA.id)!;
    const b = result.find((t) => t.id === txnB.id)!;
    expect(a.category).toBe("Savings");
    expect(b.category).toBe("Savings");
  });

  it("stores original categories in preFlagCategory for both transactions", () => {
    const txns = [txnA, txnB];
    const result = applyFlag(txns, txnA.id, txnB.id);
    const a = result.find((t) => t.id === txnA.id)!;
    const b = result.find((t) => t.id === txnB.id)!;
    expect(a.preFlagCategory).toBe("Groceries");
    expect(b.preFlagCategory).toBe("Income");
  });

  it("does not modify other transactions", () => {
    const txns = [txnA, txnB, txnC];
    const result = applyFlag(txns, txnA.id, txnB.id);
    const c = result.find((t) => t.id === txnC.id)!;
    expect(c.isTransfer).toBe(false);
    expect(c.category).toBe("Transport");
    expect(c.preFlagCategory).toBeUndefined();
  });
});

// ── applyUnflag ───────────────────────────────────────────────────────────────

describe("applyUnflag", () => {
  it("sets isTransfer: false and restores category from preFlagCategory for manually-flagged pairs", () => {
    const flaggedA = makePfaTxn({
      id: "txn-a",
      amount: -100,
      date: "2026-03-15",
      isTransfer: true,
      category: "Savings",
      preFlagCategory: "Groceries",
    });
    const flaggedB = makePfaTxn({
      id: "txn-b",
      amount: 100,
      isCredit: true,
      date: "2026-03-15",
      isTransfer: true,
      category: "Savings",
      preFlagCategory: "Income",
    });
    const txns = [flaggedA, flaggedB];
    const result = applyUnflag(txns, flaggedA.id);

    const a = result.find((t) => t.id === "txn-a")!;
    const b = result.find((t) => t.id === "txn-b")!;
    expect(a.isTransfer).toBe(false);
    expect(a.category).toBe("Groceries");
    expect(a.preFlagCategory).toBeUndefined();
    expect(b.isTransfer).toBe(false);
    expect(b.category).toBe("Income");
    expect(b.preFlagCategory).toBeUndefined();
  });

  it("sets category to null for auto-detected transfers (no preFlagCategory)", () => {
    const autoA = makePfaTxn({
      id: "txn-a",
      amount: -100,
      date: "2026-03-15",
      isTransfer: true,
      category: "Savings",
    });
    const autoB = makePfaTxn({
      id: "txn-b",
      amount: 100,
      isCredit: true,
      date: "2026-03-15",
      isTransfer: true,
      category: "Savings",
    });
    const txns = [autoA, autoB];
    const result = applyUnflag(txns, autoA.id);

    const a = result.find((t) => t.id === "txn-a")!;
    const b = result.find((t) => t.id === "txn-b")!;
    expect(a.isTransfer).toBe(false);
    expect(a.category).toBeNull();
    expect(b.isTransfer).toBe(false);
    expect(b.category).toBeNull();
  });

  it("only un-flags the pair, leaving other transactions unchanged", () => {
    const flaggedA = makePfaTxn({
      id: "txn-a",
      amount: -100,
      date: "2026-03-15",
      isTransfer: true,
      category: "Savings",
      preFlagCategory: "Groceries",
    });
    const flaggedB = makePfaTxn({
      id: "txn-b",
      amount: 100,
      isCredit: true,
      date: "2026-03-15",
      isTransfer: true,
      category: "Savings",
      preFlagCategory: "Income",
    });
    const unrelated = makePfaTxn({
      id: "txn-c",
      amount: -50,
      date: "2026-03-15",
      isTransfer: false,
      category: "Transport",
    });
    const txns = [flaggedA, flaggedB, unrelated];
    const result = applyUnflag(txns, flaggedA.id);

    const c = result.find((t) => t.id === "txn-c")!;
    expect(c.isTransfer).toBe(false);
    expect(c.category).toBe("Transport");
  });

  it("returns unchanged txns when the target transaction is not found", () => {
    const txns = [txnA, txnB];
    const result = applyUnflag(txns, "nonexistent-id");
    expect(result).toEqual(txns);
  });
});

// ── TransactionsPage — AccountContext integration ─────────────────────────────

describe("TransactionsPage — empty state", () => {
  afterEach(cleanup);

  it("shows empty state when there are no transactions", () => {
    mockRawTransactions = [];
    renderPage();
    expect(screen.getByTestId("txn-empty-state")).toBeInTheDocument();
  });

  it("does not show the table when there are no transactions", () => {
    mockRawTransactions = [];
    renderPage();
    expect(screen.queryByTestId("txn-table")).not.toBeInTheDocument();
  });
});

describe("TransactionsPage — transaction display", () => {
  afterEach(cleanup);

  it("renders the transaction table when transactions are present", () => {
    mockRawTransactions = [makeApiTxn()];
    renderPage();
    expect(screen.getByTestId("txn-table")).toBeInTheDocument();
  });

  it("displays the transaction payee (description)", () => {
    mockRawTransactions = [
      makeApiTxn({ description: "Countdown Supermarket" }),
    ];
    renderPage();
    expect(screen.getByText("Countdown Supermarket")).toBeInTheDocument();
  });

  it("shows row count in txn-row-count span", () => {
    mockRawTransactions = [
      makeApiTxn({ id: "t1" }),
      makeApiTxn({ id: "t2", description: "Another" }),
    ];
    renderPage();
    expect(screen.getByTestId("txn-row-count")).toHaveTextContent("2 rows");
  });
});

// ── TransactionsPage — Uncategorised filter ───────────────────────────────────

describe("TransactionsPage — Uncategorised filter", () => {
  afterEach(cleanup);

  it("T004: shows only transactions with null/empty category when Uncategorised is selected", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "No Cat", category: null }),
      makeApiTxn({ id: "t2", description: "Has Cat", category: "Groceries" }),
    ];
    renderPage();

    const catSelect = screen.getByDisplayValue("All categories");
    await user.selectOptions(catSelect, "__uncategorised__");

    expect(screen.getByText("No Cat")).toBeInTheDocument();
    expect(screen.queryByText("Has Cat")).not.toBeInTheDocument();
  });

  it("T005: named-category transactions are excluded when Uncategorised is selected", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Uncat One", category: null }),
      makeApiTxn({
        id: "t2",
        description: "Groceries Txn",
        category: "Groceries",
      }),
    ];
    renderPage();

    const catSelect = screen.getByDisplayValue("All categories");
    await user.selectOptions(catSelect, "__uncategorised__");

    expect(screen.getByText("Uncat One")).toBeInTheDocument();
    expect(screen.queryByText("Groceries Txn")).not.toBeInTheDocument();
  });

  it("T006: transfer transactions do not appear when Uncategorised is selected, even with Show transfers checked", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Normal Uncat", category: null }),
      makeApiTxn({
        id: "t2",
        description: "Transfer Txn",
        category: null,
        isTransfer: true,
      }),
    ];
    renderPage();

    const showTransfersCheckbox = screen.getByRole("checkbox");
    await user.click(showTransfersCheckbox);

    const catSelect = screen.getByDisplayValue("All categories");
    await user.selectOptions(catSelect, "__uncategorised__");

    expect(screen.getByText("Normal Uncat")).toBeInTheDocument();
    expect(screen.queryByText("Transfer Txn")).not.toBeInTheDocument();
  });

  it("T007: only uncategorised transactions in the selected month appear when both filters are applied", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        description: "March Uncat",
        category: null,
        date: "2026-03-15",
      }),
      makeApiTxn({
        id: "t2",
        description: "April Uncat",
        category: null,
        date: "2026-04-10",
      }),
      makeApiTxn({
        id: "t3",
        description: "March Cat",
        category: "Groceries",
        date: "2026-03-15",
      }),
    ];
    renderPage();

    const monthSelect = screen.getByDisplayValue("All months");
    await user.selectOptions(monthSelect, "2026-03");

    const catSelect = screen.getByDisplayValue("All categories");
    await user.selectOptions(catSelect, "__uncategorised__");

    expect(screen.getByText("March Uncat")).toBeInTheDocument();
    expect(screen.queryByText("April Uncat")).not.toBeInTheDocument();
    expect(screen.queryByText("March Cat")).not.toBeInTheDocument();
  });

  it("T008: search term further narrows the Uncategorised filter results", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Amazon", category: null }),
      makeApiTxn({ id: "t2", description: "Netflix", category: null }),
      makeApiTxn({ id: "t3", description: "Amazon Prime", category: null }),
    ];
    renderPage();

    const catSelect = screen.getByDisplayValue("All categories");
    await user.selectOptions(catSelect, "__uncategorised__");

    const searchInput = screen.getByPlaceholderText("Search payee / memo...");
    await user.type(searchInput, "amazon");

    expect(screen.getByText("Amazon")).toBeInTheDocument();
    expect(screen.getByText("Amazon Prime")).toBeInTheDocument();
    expect(screen.queryByText("Netflix")).not.toBeInTheDocument();
  });

  it("T009: switching back to All categories restores the full non-transfer list", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        description: "Uncategorised Txn",
        category: null,
      }),
      makeApiTxn({
        id: "t2",
        description: "Categorised Txn",
        category: "Groceries",
      }),
    ];
    renderPage();

    const catSelect = screen.getByDisplayValue("All categories");
    await user.selectOptions(catSelect, "__uncategorised__");
    expect(screen.queryByText("Categorised Txn")).not.toBeInTheDocument();

    await user.selectOptions(catSelect, "all");
    expect(screen.getByText("Uncategorised Txn")).toBeInTheDocument();
    expect(screen.getByText("Categorised Txn")).toBeInTheDocument();
  });
});

// ── TransactionsPage — Savings green treatment ────────────────────────────────

describe("TransactionsPage — Savings green treatment", () => {
  afterEach(cleanup);

  it("T-SAV-01: Savings category select has category-badge--savings class", () => {
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        description: "ISA Contribution",
        category: "Savings",
      }),
    ];
    const { container } = renderPage();
    const savingsSelect = container.querySelector(
      "select.txn-cat-select.category-badge--savings",
    );
    expect(savingsSelect).not.toBeNull();
  });

  it("T-SAV-02: Non-Savings category select does NOT have category-badge--savings class", () => {
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        description: "Supermarket",
        category: "Groceries",
      }),
    ];
    const { container } = renderPage();
    const savingsBadgeSelects = container.querySelectorAll(
      "select.txn-cat-select.category-badge--savings",
    );
    expect(savingsBadgeSelects).toHaveLength(0);
    const allSelects = container.querySelectorAll("select.txn-cat-select");
    expect(allSelects).toHaveLength(1);
  });

  it("T-SAV-03: Savings select borderColor inline style uses token reference", () => {
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        description: "Pension Transfer",
        category: "Savings",
      }),
    ];
    const { container } = renderPage();
    const savingsSelect = container.querySelector(
      "select.txn-cat-select.category-badge--savings",
    ) as HTMLSelectElement | null;
    expect(savingsSelect).not.toBeNull();
    const border = savingsSelect!.style.borderColor;
    expect(border).not.toMatch(/#f87171|rgb\(248,\s*113,\s*113\)/);
    expect(border).not.toMatch(/#f97316|rgb\(249,\s*115,\s*22\)/);
    const styleAttr = savingsSelect!.getAttribute("style") ?? "";
    expect(styleAttr).toContain("var(--colour-savings)");
  });

  it("T-SAV-04: Transfer rows do not have category-badge--savings class", () => {
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        description: "Bank Transfer",
        category: "Savings",
        isTransfer: true,
      }),
    ];
    const { container } = renderPage();
    const savingsBadgeSelects = container.querySelectorAll(
      "select.category-badge--savings",
    );
    expect(savingsBadgeSelects).toHaveLength(0);
  });

  it("T-SAV-05: Uncategorised transaction select does NOT have category-badge--savings class", () => {
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Unknown", category: null }),
    ];
    const { container } = renderPage();
    const allSelects = container.querySelectorAll("select.txn-cat-select");
    expect(allSelects).toHaveLength(1);
    expect(allSelects[0].classList.contains("category-badge--savings")).toBe(
      false,
    );
  });

  it("T-SAV-06: only Savings rows carry the savings badge class", () => {
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "ISA", category: "Savings" }),
      makeApiTxn({ id: "t2", description: "Tesco", category: "Groceries" }),
      makeApiTxn({ id: "t3", description: "Bus Pass", category: "Transport" }),
    ];
    const { container } = renderPage();
    const allSelects = container.querySelectorAll("select.txn-cat-select");
    const savingsBadgeSelects = container.querySelectorAll(
      "select.txn-cat-select.category-badge--savings",
    );
    expect(allSelects).toHaveLength(3);
    expect(savingsBadgeSelects).toHaveLength(1);
  });
});

// ── T013: 'Savings & Transfers' never appears in rendered output ──────────────

describe("TransactionsPage -- T013: 'Savings & Transfers' never appears in rendered output", () => {
  afterEach(cleanup);

  it("T013: no occurrence of 'Savings & Transfers' appears in any rendered output", () => {
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        description: "ISA Contribution",
        category: "Savings",
        isTransfer: true,
      }),
      makeApiTxn({ id: "t2", description: "Tesco", category: "Groceries" }),
      makeApiTxn({ id: "t3", description: "Bus Pass", category: "Transport" }),
      makeApiTxn({ id: "t4", description: "Unknown", category: null }),
    ];
    renderPage();
    expect(screen.queryByText("Savings & Transfers")).not.toBeInTheDocument();
  });
});
