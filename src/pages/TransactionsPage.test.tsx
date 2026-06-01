import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TransactionsPage } from "./TransactionsPage";
import type { ApiTransaction } from "../types/api";
import {
  getCandidates,
  applyFlag,
  applyUnflag,
} from "../utils/transferFlagging";

// ── Local test type (replaces PfaTxn import from deleted types/pfa.ts) ────────
// Matches the minimal shape required by transferFlagging utilities.
interface TestTxn {
  id: string;
  date: string;
  month: string;
  type: string;
  payee: string;
  memo: string;
  amount: number;
  isCredit: boolean;
  account: string;
  accountShort: string;
  category: string | null;
  isTransfer: boolean;
  preFlagCategory?: string | null;
  [key: string]: unknown;
}

// ── Mock AccountContext ────────────────────────────────────────────────────────

const mockAccounts = [
  { id: "acc-1", nickname: "Main Account", colour: "#6C8EBF" },
];
let mockRawTransactions: ApiTransaction[] = [];

const mockRefetch = vi.fn().mockResolvedValue(undefined);

vi.mock("../context/AccountContext", () => ({
  useAccount: () => ({
    accounts: mockAccounts,
    isLoading: false,
    error: null,
    activeAccountId: "acc-1",
    refetch: mockRefetch,
    setActiveAccountId: vi.fn(),
    addAccount: vi.fn(),
    removeAccount: vi.fn(),
    updateAccount: vi.fn(),
  }),
  useAllTransactions: () => mockRawTransactions,
  ALL_ACCOUNTS_ID: "all",
}));

// ── Mock useApi ───────────────────────────────────────────────────────────────

// Categories returned by the mock GET /api/categories — covers all names used
// across the test file so the category select has the expected options.
const MOCK_API_CATEGORIES = [
  { id: "cat-1", name: "Groceries", colour: "#6366f1" },
  { id: "cat-2", name: "Dining", colour: "#f59e0b" },
  { id: "cat-3", name: "Transport", colour: "#10b981" },
  { id: "cat-4", name: "Savings", colour: "#ef4444" },
  { id: "cat-5", name: "Income", colour: "#3b82f6" },
  { id: "cat-6", name: "Dining & Takeaways", colour: "#8b5cf6" },
  { id: "cat-7", name: "Utilities & Bills", colour: "#ec4899" },
];

// Route by URL: /api/categories always succeeds; other calls use overrideResponse.
function makeApiFetchImpl(
  overrideResponse: Response = { ok: true } as Response,
): (url: string) => Promise<Response> {
  return async (url: string) => {
    if (url === "/api/categories") {
      return {
        ok: true,
        json: () => Promise.resolve({ categories: MOCK_API_CATEGORIES }),
      } as unknown as Response;
    }
    return overrideResponse;
  };
}

const mockApiFetch = vi.fn().mockImplementation(makeApiFetchImpl());

vi.mock("../lib/api", () => ({
  useApi: () => ({ apiFetch: mockApiFetch }),
  API_BASE: "",
}));

// ── Mock categoriseTransactions ───────────────────────────────────────────────

const mockCategoriseTransactions = vi.fn();

vi.mock("../services/categorisation", () => ({
  categoriseTransactions: (
    ...args: Parameters<typeof mockCategoriseTransactions>
  ) => mockCategoriseTransactions(...args),
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

// ── Test fixtures for transferFlagging utility tests ─────────────────────────

function makePfaTxn(overrides: Partial<TestTxn>): TestTxn {
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

  it("shows txn-empty element when all transactions are transfers and Show transfers is off", () => {
    mockRawTransactions = [
      makeApiTxn({ id: "t1", isTransfer: true }),
      makeApiTxn({ id: "t2", isTransfer: true }),
    ];
    const { container } = renderPage();
    // Show transfers is OFF by default — all rows filtered out
    expect(container.querySelector(".txn-empty")).toBeInTheDocument();
  });

  it("shows txn-row-count of 0 rows when all transactions are transfers and Show transfers is off", () => {
    mockRawTransactions = [makeApiTxn({ id: "t1", isTransfer: true })];
    renderPage();
    expect(screen.getByTestId("txn-row-count")).toHaveTextContent("0 rows");
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

// ── T007: Category PATCH persistence ─────────────────────────────────────────

describe("TransactionsPage — T007: category PATCH persistence", () => {
  afterEach(() => {
    cleanup();
    mockApiFetch.mockReset();
    mockRefetch.mockReset();
    mockApiFetch.mockImplementation(makeApiFetchImpl());
    mockRefetch.mockResolvedValue(undefined);
  });

  it("T007-1: changing category calls PATCH /api/transactions/:id", async () => {
    const user = userEvent.setup();
    // Two transactions: t2 has Groceries category (populates the option), t1 is Dining
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Countdown", category: "Dining" }),
      makeApiTxn({
        id: "t2",
        description: "Burger King",
        category: "Groceries",
      }),
    ];
    renderPage();

    // Wait for categories to load from GET /api/categories before interacting
    await screen.findAllByRole("option", { name: "Groceries" });

    // Select the first txn-cat-select (t1 = Dining, switching to Groceries)
    const catSelects = screen
      .getAllByRole("combobox")
      .filter((el) => el.classList.contains("txn-cat-select"));
    await user.selectOptions(catSelects[0], "Groceries");
    // wait for async patch
    await vi.waitFor(() => expect(mockApiFetch).toHaveBeenCalled());
    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/transactions/t1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ category: "Groceries" }),
      }),
    );
  });

  it("T007-2: successful PATCH calls refetch to sync server state", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Countdown", category: "Dining" }),
      makeApiTxn({
        id: "t2",
        description: "Burger King",
        category: "Groceries",
      }),
    ];
    renderPage();

    await screen.findAllByRole("option", { name: "Groceries" });

    const catSelects = screen
      .getAllByRole("combobox")
      .filter((el) => el.classList.contains("txn-cat-select"));
    await user.selectOptions(catSelects[0], "Groceries");
    await vi.waitFor(() => expect(mockRefetch).toHaveBeenCalled());
  });

  it("T007-3: failed PATCH shows error toast", async () => {
    const user = userEvent.setup();
    mockApiFetch.mockImplementation(
      makeApiFetchImpl({ ok: false, status: 500 } as Response),
    );
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Countdown", category: "Dining" }),
      makeApiTxn({
        id: "t2",
        description: "Burger King",
        category: "Groceries",
      }),
    ];
    const { container } = renderPage();

    await screen.findAllByRole("option", { name: "Groceries" });

    const catSelects = screen
      .getAllByRole("combobox")
      .filter((el) => el.classList.contains("txn-cat-select"));
    await user.selectOptions(catSelects[0], "Groceries");
    await vi.waitFor(() =>
      expect(container.querySelector(".txn-toast")).not.toBeNull(),
    );
    expect(container.querySelector(".txn-toast")!.textContent).toContain(
      "Failed to save category",
    );
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

// ── TransactionsPage — Auto-Categorise button ─────────────────────────────────

describe("TransactionsPage — Auto-Categorise button", () => {
  afterEach(() => {
    cleanup();
    mockApiFetch.mockReset();
    mockRefetch.mockReset();
    mockCategoriseTransactions.mockReset();
    mockApiFetch.mockImplementation(makeApiFetchImpl());
    mockRefetch.mockResolvedValue(undefined);
  });

  it("AC-1: button is rendered when transactions exist", () => {
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Amazon", category: null }),
    ];
    renderPage();
    expect(screen.getByTestId("auto-categorise-btn")).toBeInTheDocument();
  });

  it("AC-1: button is not rendered in the empty state (no transactions)", () => {
    mockRawTransactions = [];
    renderPage();
    expect(screen.queryByTestId("auto-categorise-btn")).not.toBeInTheDocument();
  });

  it("AC-2: button is disabled when all visible non-transfer transactions are already categorised", () => {
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Tesco", category: "Groceries" }),
      makeApiTxn({ id: "t2", description: "Bus", category: "Transport" }),
    ];
    renderPage();
    expect(screen.getByTestId("auto-categorise-btn")).toBeDisabled();
  });

  it("AC-2: button is enabled when at least one uncategorised non-transfer transaction exists", () => {
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Unknown", category: null }),
      makeApiTxn({ id: "t2", description: "Tesco", category: "Groceries" }),
    ];
    renderPage();
    expect(screen.getByTestId("auto-categorise-btn")).not.toBeDisabled();
  });

  it("AC-5: success toast appears after successful auto-categorisation", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Amazon", category: null }),
    ];
    mockCategoriseTransactions.mockResolvedValue([
      { description: "Amazon", category: "Shopping" },
    ]);
    mockApiFetch.mockImplementation(makeApiFetchImpl({ ok: true } as Response));

    renderPage();

    await user.click(screen.getByTestId("auto-categorise-btn"));

    await vi.waitFor(() =>
      expect(
        screen.getByText(/Auto-categorised 1 transaction/),
      ).toBeInTheDocument(),
    );
  });

  it("AC-6: refetch is called after successful auto-categorisation", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Amazon", category: null }),
    ];
    mockCategoriseTransactions.mockResolvedValue([
      { description: "Amazon", category: "Shopping" },
    ]);
    mockApiFetch.mockImplementation(makeApiFetchImpl({ ok: true } as Response));

    renderPage();
    await user.click(screen.getByTestId("auto-categorise-btn"));
    await vi.waitFor(() => expect(mockRefetch).toHaveBeenCalled());
  });

  it("AC-7: error toast appears on failure", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Amazon", category: null }),
    ];
    mockCategoriseTransactions.mockRejectedValue(new Error("API down"));

    renderPage();
    await user.click(screen.getByTestId("auto-categorise-btn"));

    await vi.waitFor(() =>
      expect(
        screen.getByText(/Auto-categorisation failed/),
      ).toBeInTheDocument(),
    );
  });

  it("AC-7: error toast has txn-toast--error class", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Amazon", category: null }),
    ];
    mockCategoriseTransactions.mockRejectedValue(new Error("API down"));

    const { container } = renderPage();
    await user.click(screen.getByTestId("auto-categorise-btn"));

    await vi.waitFor(() =>
      expect(container.querySelector(".txn-toast--error")).not.toBeNull(),
    );
  });

  it("AC-9: already-categorised transactions are not sent to categorisation service", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Amazon", category: null }),
      makeApiTxn({ id: "t2", description: "Tesco", category: "Groceries" }),
    ];
    mockCategoriseTransactions.mockResolvedValue([
      { description: "Amazon", category: "Shopping" },
    ]);
    mockApiFetch.mockImplementation(makeApiFetchImpl({ ok: true } as Response));

    renderPage();
    await user.click(screen.getByTestId("auto-categorise-btn"));

    await vi.waitFor(() =>
      expect(mockCategoriseTransactions).toHaveBeenCalled(),
    );
    const callArg = mockCategoriseTransactions.mock.calls[0][0] as Array<{
      description: string;
    }>;
    expect(callArg).toHaveLength(1);
    expect(callArg[0].description).toBe("Amazon");
  });

  it("AC-3/AC-4: button is disabled and shows loading label while request is in-flight", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Amazon", category: null }),
    ];

    // Never resolves so button stays in-flight
    mockCategoriseTransactions.mockReturnValue(new Promise(() => {}));

    renderPage();
    await user.click(screen.getByTestId("auto-categorise-btn"));

    await vi.waitFor(() => {
      const btn = screen.getByTestId("auto-categorise-btn");
      expect(btn).toBeDisabled();
      expect(btn).toHaveTextContent("Categorising…");
    });
  });
});

// ── TransactionsPage — Identify Transfers button ──────────────────────────────

describe("TransactionsPage — Identify Transfers button", () => {
  afterEach(() => {
    cleanup();
    mockApiFetch.mockReset();
    mockRefetch.mockReset();
    mockApiFetch.mockImplementation(makeApiFetchImpl());
    mockRefetch.mockResolvedValue(undefined);
  });

  // AC-1: button is present when transactions exist
  it("AC-1: Identify Transfers button is rendered when transactions exist", () => {
    mockRawTransactions = [
      makeApiTxn({ id: "t1", description: "Amazon", category: null }),
    ];
    renderPage();
    expect(screen.getByTestId("identify-transfers-btn")).toBeInTheDocument();
  });

  it("AC-1: Identify Transfers button is not rendered in the empty state", () => {
    mockRawTransactions = [];
    renderPage();
    expect(
      screen.queryByTestId("identify-transfers-btn"),
    ).not.toBeInTheDocument();
  });

  // AC-6: no pairs found → toast, no strip
  it("AC-6: shows toast when no transfer pairs are found", async () => {
    const user = userEvent.setup();
    // Single transaction — cannot form a pair
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        description: "Amazon",
        amount: -50,
        category: null,
      }),
    ];
    const { container } = renderPage();
    await user.click(screen.getByTestId("identify-transfers-btn"));

    await vi.waitFor(() =>
      expect(container.querySelector(".txn-toast")).not.toBeNull(),
    );
    expect(container.querySelector(".txn-toast")!.textContent).toContain(
      "No transfer pairs found.",
    );
    expect(
      screen.queryByTestId("identify-transfers-strip"),
    ).not.toBeInTheDocument();
  });

  // AC-7: strip opens when pairs are found
  it("AC-7: strip opens when transfer pairs are found", async () => {
    const user = userEvent.setup();
    // Two accounts: debit from acc-1, credit to acc-2 — same date, same absolute amount
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        accountId: "acc-1",
        amount: -100,
        date: "2026-03-15",
        description: "INTERNET BANKING TRANSFER TO SAVINGS",
        isTransfer: false,
        category: null,
      }),
      makeApiTxn({
        id: "t2",
        accountId: "acc-2",
        amount: 100,
        date: "2026-03-15",
        description: "INTERNET BANKING TRANSFER FROM MAIN",
        isTransfer: false,
        category: null,
      }),
    ];
    renderPage();
    await user.click(screen.getByTestId("identify-transfers-btn"));

    await vi.waitFor(() =>
      expect(
        screen.queryByTestId("identify-transfers-strip"),
      ).toBeInTheDocument(),
    );
  });

  // AC-4: confirmed pairs are pre-checked
  it("AC-4: confirmed pairs (payee match) are pre-checked", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        accountId: "acc-1",
        amount: -100,
        date: "2026-03-15",
        description: "INTERNET BANKING TRANSFER",
        isTransfer: false,
        category: null,
      }),
      makeApiTxn({
        id: "t2",
        accountId: "acc-2",
        amount: 100,
        date: "2026-03-15",
        description: "INTERNET BANKING TRANSFER",
        isTransfer: false,
        category: null,
      }),
    ];
    renderPage();
    await user.click(screen.getByTestId("identify-transfers-btn"));

    await vi.waitFor(() =>
      expect(
        screen.queryByTestId("identify-transfers-strip"),
      ).toBeInTheDocument(),
    );

    const checkboxes = screen.getAllByRole("checkbox");
    // Filter to pair checkboxes (not the show-transfers checkbox)
    const pairCheckboxes = checkboxes.filter((cb) =>
      cb.classList.contains("txn-identify-strip__pair-check"),
    );
    expect(pairCheckboxes[0]).toBeChecked();
  });

  // AC-5: ambiguous pairs are pre-unchecked
  it("AC-5: ambiguous pairs (no payee match) are pre-unchecked", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        accountId: "acc-1",
        amount: -100,
        date: "2026-03-15",
        description: "PAYMENT",
        isTransfer: false,
        category: null,
      }),
      makeApiTxn({
        id: "t2",
        accountId: "acc-2",
        amount: 100,
        date: "2026-03-15",
        description: "DIRECT FUNDS RECEIVED",
        isTransfer: false,
        category: null,
      }),
    ];
    renderPage();
    await user.click(screen.getByTestId("identify-transfers-btn"));

    await vi.waitFor(() =>
      expect(
        screen.queryByTestId("identify-transfers-strip"),
      ).toBeInTheDocument(),
    );

    const checkboxes = screen.getAllByRole("checkbox");
    const pairCheckboxes = checkboxes.filter((cb) =>
      cb.classList.contains("txn-identify-strip__pair-check"),
    );
    expect(pairCheckboxes[0]).not.toBeChecked();
  });

  // AC-11: Cancel closes the strip with no API calls
  it("AC-11: Cancel closes the strip without making API calls", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        accountId: "acc-1",
        amount: -100,
        date: "2026-03-15",
        description: "INTERNET BANKING TRANSFER",
        isTransfer: false,
        category: null,
      }),
      makeApiTxn({
        id: "t2",
        accountId: "acc-2",
        amount: 100,
        date: "2026-03-15",
        description: "INTERNET BANKING TRANSFER",
        isTransfer: false,
        category: null,
      }),
    ];
    renderPage();
    await user.click(screen.getByTestId("identify-transfers-btn"));
    await vi.waitFor(() =>
      expect(
        screen.queryByTestId("identify-transfers-strip"),
      ).toBeInTheDocument(),
    );

    // Reset mock call count after opening (categories call may have fired)
    mockApiFetch.mockClear();

    await user.click(screen.getByTestId("identify-transfers-cancel"));

    expect(
      screen.queryByTestId("identify-transfers-strip"),
    ).not.toBeInTheDocument();
    // No PATCH calls should have been made
    const patchCalls = mockApiFetch.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[1] === "object" &&
        call[1] !== null &&
        (call[1] as { method?: string }).method === "PATCH",
    );
    expect(patchCalls).toHaveLength(0);
  });

  // AC-14: Mark as Transfers button disabled when 0 pairs checked
  it("AC-14: Mark as Transfers is disabled when no pairs are checked", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        accountId: "acc-1",
        amount: -100,
        date: "2026-03-15",
        description: "PAYMENT",
        isTransfer: false,
        category: null,
      }),
      makeApiTxn({
        id: "t2",
        accountId: "acc-2",
        amount: 100,
        date: "2026-03-15",
        description: "DIRECT FUNDS RECEIVED",
        isTransfer: false,
        category: null,
      }),
    ];
    renderPage();
    await user.click(screen.getByTestId("identify-transfers-btn"));

    await vi.waitFor(() =>
      expect(
        screen.queryByTestId("identify-transfers-strip"),
      ).toBeInTheDocument(),
    );

    // All pairs are ambiguous (pre-unchecked), so Mark button should be disabled
    expect(screen.getByTestId("identify-transfers-mark")).toBeDisabled();
  });

  // AC-8/AC-9: marking transfers calls PATCH and refetch
  it("AC-8/AC-9: marking calls PATCH for each txn in checked pairs then calls refetch", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        accountId: "acc-1",
        amount: -100,
        date: "2026-03-15",
        description: "INTERNET BANKING TRANSFER",
        isTransfer: false,
        category: null,
      }),
      makeApiTxn({
        id: "t2",
        accountId: "acc-2",
        amount: 100,
        date: "2026-03-15",
        description: "INTERNET BANKING TRANSFER",
        isTransfer: false,
        category: null,
      }),
    ];
    mockApiFetch.mockImplementation(makeApiFetchImpl({ ok: true } as Response));

    renderPage();
    await user.click(screen.getByTestId("identify-transfers-btn"));
    await vi.waitFor(() =>
      expect(
        screen.queryByTestId("identify-transfers-strip"),
      ).toBeInTheDocument(),
    );

    mockApiFetch.mockClear();
    mockRefetch.mockClear();

    await user.click(screen.getByTestId("identify-transfers-mark"));

    await vi.waitFor(() => expect(mockRefetch).toHaveBeenCalled());

    const patchCalls = mockApiFetch.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[1] === "object" &&
        call[1] !== null &&
        (call[1] as { method?: string }).method === "PATCH",
    );
    expect(patchCalls).toHaveLength(2);
    for (const call of patchCalls) {
      expect(JSON.parse((call[1] as { body: string }).body)).toEqual({
        isTransfer: true,
      });
    }
  });

  // AC-9: success toast shown after marking
  it("AC-9: success toast shown after marking transfers", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        accountId: "acc-1",
        amount: -100,
        date: "2026-03-15",
        description: "INTERNET BANKING TRANSFER",
        isTransfer: false,
        category: null,
      }),
      makeApiTxn({
        id: "t2",
        accountId: "acc-2",
        amount: 100,
        date: "2026-03-15",
        description: "INTERNET BANKING TRANSFER",
        isTransfer: false,
        category: null,
      }),
    ];
    mockApiFetch.mockImplementation(makeApiFetchImpl({ ok: true } as Response));

    renderPage();
    await user.click(screen.getByTestId("identify-transfers-btn"));
    await vi.waitFor(() =>
      expect(
        screen.queryByTestId("identify-transfers-strip"),
      ).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("identify-transfers-mark"));

    await vi.waitFor(() =>
      expect(screen.getByText(/Marked 1 transfer pair/)).toBeInTheDocument(),
    );
  });

  // AC-10: error toast on PATCH failure
  it("AC-10: error toast shown when PATCH fails; strip remains open", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      makeApiTxn({
        id: "t1",
        accountId: "acc-1",
        amount: -100,
        date: "2026-03-15",
        description: "INTERNET BANKING TRANSFER",
        isTransfer: false,
        category: null,
      }),
      makeApiTxn({
        id: "t2",
        accountId: "acc-2",
        amount: 100,
        date: "2026-03-15",
        description: "INTERNET BANKING TRANSFER",
        isTransfer: false,
        category: null,
      }),
    ];
    // Return failure for PATCH calls
    mockApiFetch.mockImplementation(async (url: string) => {
      if (url === "/api/categories") {
        return {
          ok: true,
          json: () => Promise.resolve({ categories: MOCK_API_CATEGORIES }),
        } as unknown as Response;
      }
      return { ok: false, status: 500 } as Response;
    });

    const { container } = renderPage();
    await user.click(screen.getByTestId("identify-transfers-btn"));
    await vi.waitFor(() =>
      expect(
        screen.queryByTestId("identify-transfers-strip"),
      ).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("identify-transfers-mark"));

    await vi.waitFor(() =>
      expect(container.querySelector(".txn-toast--error")).not.toBeNull(),
    );
    expect(container.querySelector(".txn-toast--error")!.textContent).toContain(
      "Failed to mark transfers",
    );
    // Strip stays open on error
    expect(
      screen.queryByTestId("identify-transfers-strip"),
    ).toBeInTheDocument();
  });

  // AC-16: existing transactions already marked isTransfer are excluded from scan
  it("AC-16: already-marked transfers are excluded from the scan", async () => {
    const user = userEvent.setup();
    mockRawTransactions = [
      // This pair looks like a match but t1 is already a transfer → should be excluded
      makeApiTxn({
        id: "t1",
        accountId: "acc-1",
        amount: -100,
        date: "2026-03-15",
        description: "INTERNET BANKING TRANSFER",
        isTransfer: true, // already marked
        category: null,
      }),
      makeApiTxn({
        id: "t2",
        accountId: "acc-2",
        amount: 100,
        date: "2026-03-15",
        description: "INTERNET BANKING TRANSFER",
        isTransfer: false,
        category: null,
      }),
    ];
    const { container } = renderPage();
    await user.click(screen.getByTestId("identify-transfers-btn"));

    await vi.waitFor(() =>
      expect(container.querySelector(".txn-toast")).not.toBeNull(),
    );
    expect(container.querySelector(".txn-toast")!.textContent).toContain(
      "No transfer pairs found.",
    );
  });
});
