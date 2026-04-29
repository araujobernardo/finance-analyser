import { afterEach, describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransactionsPage } from "./TransactionsPage";
import type { PfaTxn, PfaCategory } from "../types/pfa";
import {
  getCandidates,
  applyFlag,
  applyUnflag,
} from "../utils/transferFlagging";

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeTxn(overrides: Partial<PfaTxn>): PfaTxn {
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

const txnA = makeTxn({ id: "txn-a", amount: -100, category: "Groceries" });
const txnB = makeTxn({
  id: "txn-b",
  amount: 100,
  isCredit: true,
  category: "Income",
});
const txnC = makeTxn({
  id: "txn-c",
  amount: -100,
  category: "Transport",
  date: "2026-03-16", // different date
});
const txnD = makeTxn({
  id: "txn-d",
  amount: -50, // different amount
  category: "Dining & Takeaways",
});
const txnE = makeTxn({
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
    // txnB: same date, |100| === |100| ✓, not transfer ✓, different id ✓
    // txnC: different date ✗
    // txnD: different amount ✗
    // txnE: already a transfer ✗
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
    const flaggedA = makeTxn({
      id: "txn-a",
      amount: -100,
      date: "2026-03-15",
      isTransfer: true,
      category: "Savings",
      preFlagCategory: "Groceries",
    });
    const flaggedB = makeTxn({
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
    const autoA = makeTxn({
      id: "txn-a",
      amount: -100,
      date: "2026-03-15",
      isTransfer: true,
      category: "Savings",
      // preFlagCategory not set
    });
    const autoB = makeTxn({
      id: "txn-b",
      amount: 100,
      isCredit: true,
      date: "2026-03-15",
      isTransfer: true,
      category: "Savings",
      // preFlagCategory not set
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
    const flaggedA = makeTxn({
      id: "txn-a",
      amount: -100,
      date: "2026-03-15",
      isTransfer: true,
      category: "Savings",
      preFlagCategory: "Groceries",
    });
    const flaggedB = makeTxn({
      id: "txn-b",
      amount: 100,
      isCredit: true,
      date: "2026-03-15",
      isTransfer: true,
      category: "Savings",
      preFlagCategory: "Income",
    });
    const unrelated = makeTxn({
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

// ── TransactionsPage — Uncategorised filter (T004–T009) ───────────────────────

function makePageTxn(overrides: Partial<PfaTxn>): PfaTxn {
  return {
    id: "page-txn-1",
    date: "2026-03-15",
    month: "2026-03",
    type: "",
    payee: "Page Payee",
    memo: "",
    amount: -100,
    isCredit: false,
    account: "Main Account",
    accountShort: "Main",
    category: null,
    isTransfer: false,
    ...overrides,
  };
}

const defaultCategories: PfaCategory[] = [
  { name: "Groceries", color: "#ff0000" },
  { name: "Transport", color: "#00ff00" },
];

const defaultAccountList = [{ short: "Main", display: "Main Account" }];

function renderPage(txns: PfaTxn[]) {
  return render(
    <TransactionsPage
      txns={txns}
      accountList={defaultAccountList}
      categories={defaultCategories}
      onBulkCategoryChange={() => {}}
    />,
  );
}

// T004 — selecting "__uncategorised__" shows only uncategorised transactions
describe("TransactionsPage — Uncategorised filter", () => {
  afterEach(cleanup);

  it("T004: shows only transactions with null/undefined/empty category when Uncategorised is selected", async () => {
    const user = userEvent.setup();
    const txns = [
      makePageTxn({ id: "t1", payee: "No Cat", category: null }),
      makePageTxn({ id: "t2", payee: "Empty Cat", category: "" }),
      makePageTxn({ id: "t3", payee: "Has Cat", category: "Groceries" }),
    ];
    renderPage(txns);

    const catSelect = screen.getByDisplayValue("All categories");
    await user.selectOptions(catSelect, "__uncategorised__");

    expect(screen.getByText("No Cat")).toBeInTheDocument();
    expect(screen.getByText("Empty Cat")).toBeInTheDocument();
    expect(screen.queryByText("Has Cat")).not.toBeInTheDocument();
  });

  // T005 — transactions with a non-empty category are excluded
  it("T005: transactions with a named category are not rendered when Uncategorised is selected", async () => {
    const user = userEvent.setup();
    const txns = [
      makePageTxn({ id: "t1", payee: "Uncategorised One", category: null }),
      makePageTxn({ id: "t2", payee: "Groceries Txn", category: "Groceries" }),
      makePageTxn({ id: "t3", payee: "Transport Txn", category: "Transport" }),
    ];
    renderPage(txns);

    const catSelect = screen.getByDisplayValue("All categories");
    await user.selectOptions(catSelect, "__uncategorised__");

    expect(screen.getByText("Uncategorised One")).toBeInTheDocument();
    expect(screen.queryByText("Groceries Txn")).not.toBeInTheDocument();
    expect(screen.queryByText("Transport Txn")).not.toBeInTheDocument();
  });

  // T006 — transfer transactions are absent even when showTransfers is enabled
  it("T006: transfer transactions do not appear when Uncategorised is selected, even with Show transfers checked", async () => {
    const user = userEvent.setup();
    const txns = [
      makePageTxn({ id: "t1", payee: "Normal Uncategorised", category: null }),
      makePageTxn({
        id: "t2",
        payee: "Transfer Txn",
        category: null,
        isTransfer: true,
      }),
    ];
    renderPage(txns);

    // Enable Show transfers first
    const showTransfersCheckbox = screen.getByRole("checkbox");
    await user.click(showTransfersCheckbox);

    // Now select Uncategorised
    const catSelect = screen.getByDisplayValue("All categories");
    await user.selectOptions(catSelect, "__uncategorised__");

    expect(screen.getByText("Normal Uncategorised")).toBeInTheDocument();
    expect(screen.queryByText("Transfer Txn")).not.toBeInTheDocument();
  });

  // T007 — Uncategorised AND month filter: AND composition
  it("T007: only uncategorised transactions in the selected month appear when both filters are applied", async () => {
    const user = userEvent.setup();
    const txns = [
      makePageTxn({
        id: "t1",
        payee: "March Uncat",
        category: null,
        month: "2026-03",
        date: "2026-03-15",
      }),
      makePageTxn({
        id: "t2",
        payee: "April Uncat",
        category: null,
        month: "2026-04",
        date: "2026-04-10",
      }),
      makePageTxn({
        id: "t3",
        payee: "March Cat",
        category: "Groceries",
        month: "2026-03",
        date: "2026-03-15",
      }),
    ];
    renderPage(txns);

    const monthSelect = screen.getByDisplayValue("All months");
    await user.selectOptions(monthSelect, "2026-03");

    const catSelect = screen.getByDisplayValue("All categories");
    await user.selectOptions(catSelect, "__uncategorised__");

    expect(screen.getByText("March Uncat")).toBeInTheDocument();
    expect(screen.queryByText("April Uncat")).not.toBeInTheDocument();
    expect(screen.queryByText("March Cat")).not.toBeInTheDocument();
  });

  // T008 — Uncategorised AND search: further narrows correctly
  it("T008: search term further narrows the Uncategorised filter results", async () => {
    const user = userEvent.setup();
    const txns = [
      makePageTxn({ id: "t1", payee: "Amazon", category: null }),
      makePageTxn({ id: "t2", payee: "Netflix", category: null }),
      makePageTxn({ id: "t3", payee: "Amazon Prime", category: null }),
    ];
    renderPage(txns);

    const catSelect = screen.getByDisplayValue("All categories");
    await user.selectOptions(catSelect, "__uncategorised__");

    const searchInput = screen.getByPlaceholderText("Search payee / memo...");
    await user.type(searchInput, "amazon");

    expect(screen.getByText("Amazon")).toBeInTheDocument();
    expect(screen.getByText("Amazon Prime")).toBeInTheDocument();
    expect(screen.queryByText("Netflix")).not.toBeInTheDocument();
  });

  // T009 — switching back to "all" restores full list
  it("T009: switching back to All categories restores the full non-transfer list", async () => {
    const user = userEvent.setup();
    const txns = [
      makePageTxn({ id: "t1", payee: "Uncategorised Txn", category: null }),
      makePageTxn({
        id: "t2",
        payee: "Categorised Txn",
        category: "Groceries",
      }),
    ];
    renderPage(txns);

    const catSelect = screen.getByDisplayValue("All categories");
    await user.selectOptions(catSelect, "__uncategorised__");
    expect(screen.queryByText("Categorised Txn")).not.toBeInTheDocument();

    await user.selectOptions(catSelect, "all");
    expect(screen.getByText("Uncategorised Txn")).toBeInTheDocument();
    expect(screen.getByText("Categorised Txn")).toBeInTheDocument();
  });
});

// ── Savings green treatment (Issue #113) ─────────────────────────────────────

const savingsCategories: PfaCategory[] = [
  { name: "Groceries", color: "#ff0000" },
  { name: "Transport", color: "#0000ff" },
  { name: "Savings", color: "#10b981" },
];

function renderPageWithCategories(
  txns: PfaTxn[],
  categories: PfaCategory[] = savingsCategories,
) {
  return render(
    <TransactionsPage
      txns={txns}
      accountList={defaultAccountList}
      categories={categories}
      onBulkCategoryChange={() => {}}
    />,
  );
}

describe("TransactionsPage — Savings green treatment", () => {
  afterEach(cleanup);

  it("T-SAV-01: Savings category select has category-badge--savings class", () => {
    const txns = [
      makePageTxn({ id: "t1", payee: "ISA Contribution", category: "Savings" }),
    ];
    const { container } = renderPageWithCategories(txns);
    // className is applied based on t.category === "Savings", not on select's value
    const savingsSelect = container.querySelector(
      "select.txn-cat-select.category-badge--savings",
    );
    expect(savingsSelect).not.toBeNull();
  });

  it("T-SAV-02: Non-Savings category select does NOT have category-badge--savings class", () => {
    const txns = [
      makePageTxn({ id: "t1", payee: "Supermarket", category: "Groceries" }),
    ];
    const { container } = renderPageWithCategories(txns);
    const savingsBadgeSelects = container.querySelectorAll(
      "select.txn-cat-select.category-badge--savings",
    );
    expect(savingsBadgeSelects).toHaveLength(0);
    // Regular category select exists but without the savings class
    const allSelects = container.querySelectorAll("select.txn-cat-select");
    expect(allSelects).toHaveLength(1);
  });

  it("T-SAV-03: Savings select borderColor inline style does not use a hardcoded hex — uses token reference", () => {
    const txns = [
      makePageTxn({ id: "t1", payee: "Pension Transfer", category: "Savings" }),
    ];
    const { container } = renderPageWithCategories(txns);
    const savingsSelect = container.querySelector(
      "select.txn-cat-select.category-badge--savings",
    ) as HTMLSelectElement | null;
    expect(savingsSelect).not.toBeNull();
    // The inline style borderColor must NOT be a hardcoded hex value like #10b981 or rgb(16,185,129)
    // jsdom resolves CSS variables but the value should correspond to the savings token colour
    // not the expense colour (red: #f87171 = rgb(248,113,113)) or orange
    const border = savingsSelect!.style.borderColor;
    expect(border).not.toMatch(/#f87171|rgb\(248,\s*113,\s*113\)/); // not red
    expect(border).not.toMatch(/#f97316|rgb\(249,\s*115,\s*22\)/); // not orange
    // jsdom may resolve var() to the actual colour — either form confirms no hardcoded expense colour
    // The border should resolve to the savings green value (#10b981)
    // We verify the attribute directly (the React prop sets it as a CSS variable string)
    const styleAttr = savingsSelect!.getAttribute("style") ?? "";
    expect(styleAttr).toContain("var(--colour-savings)");
  });

  it("T-SAV-04: Transfer rows do not have category-badge--savings class (no colour bleed)", () => {
    const txns = [
      makePageTxn({
        id: "t1",
        payee: "Bank Transfer",
        category: "Savings",
        isTransfer: true,
      }),
    ];
    const { container } = renderPageWithCategories(txns);
    // Transfer rows render a <span class="tag"> not a <select> — no savings badge
    const savingsBadgeSelects = container.querySelectorAll(
      "select.category-badge--savings",
    );
    expect(savingsBadgeSelects).toHaveLength(0);
  });

  it("T-SAV-05: Uncategorised transaction select does NOT have category-badge--savings class", () => {
    const txns = [makePageTxn({ id: "t1", payee: "Unknown", category: null })];
    const { container } = renderPageWithCategories(txns);
    const allSelects = container.querySelectorAll("select.txn-cat-select");
    expect(allSelects).toHaveLength(1);
    expect(allSelects[0].classList.contains("category-badge--savings")).toBe(
      false,
    );
  });

  it("T-SAV-06: multiple transactions — only Savings rows carry the savings badge class", () => {
    const txns = [
      makePageTxn({ id: "t1", payee: "ISA", category: "Savings" }),
      makePageTxn({ id: "t2", payee: "Tesco", category: "Groceries" }),
      makePageTxn({ id: "t3", payee: "Bus Pass", category: "Transport" }),
    ];
    const { container } = renderPageWithCategories(txns);
    const allSelects = container.querySelectorAll("select.txn-cat-select");
    const savingsBadgeSelects = container.querySelectorAll(
      "select.txn-cat-select.category-badge--savings",
    );
    expect(allSelects).toHaveLength(3);
    expect(savingsBadgeSelects).toHaveLength(1);
  });
});

// -- T013: No occurrence of "Savings & Transfers" in rendered output --

describe("TransactionsPage -- T013: 'Savings & Transfers' never appears in rendered output", () => {
  afterEach(cleanup);

  it("T013: no occurrence of the literal string 'Savings & Transfers' appears in any rendered output", () => {
    const txns = [
      makePageTxn({
        id: "t1",
        payee: "ISA Contribution",
        category: "Savings",
        isTransfer: true,
      }),
      makePageTxn({ id: "t2", payee: "Tesco", category: "Groceries" }),
      makePageTxn({ id: "t3", payee: "Bus Pass", category: "Transport" }),
      makePageTxn({ id: "t4", payee: "Unknown", category: null }),
    ];
    renderPageWithCategories(txns);
    expect(screen.queryByText("Savings & Transfers")).not.toBeInTheDocument();
  });
});
