import { describe, it, expect } from "vitest";
import type { PfaTxn } from "../types/pfa";
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

  it("sets category to 'Savings & Transfers' on both transactions", () => {
    const txns = [txnA, txnB];
    const result = applyFlag(txns, txnA.id, txnB.id);
    const a = result.find((t) => t.id === txnA.id)!;
    const b = result.find((t) => t.id === txnB.id)!;
    expect(a.category).toBe("Savings & Transfers");
    expect(b.category).toBe("Savings & Transfers");
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
      category: "Savings & Transfers",
      preFlagCategory: "Groceries",
    });
    const flaggedB = makeTxn({
      id: "txn-b",
      amount: 100,
      isCredit: true,
      date: "2026-03-15",
      isTransfer: true,
      category: "Savings & Transfers",
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
      category: "Savings & Transfers",
      // preFlagCategory not set
    });
    const autoB = makeTxn({
      id: "txn-b",
      amount: 100,
      isCredit: true,
      date: "2026-03-15",
      isTransfer: true,
      category: "Savings & Transfers",
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
      category: "Savings & Transfers",
      preFlagCategory: "Groceries",
    });
    const flaggedB = makeTxn({
      id: "txn-b",
      amount: 100,
      isCredit: true,
      date: "2026-03-15",
      isTransfer: true,
      category: "Savings & Transfers",
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
