import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveTransactions,
  loadTransactions,
  loadAllTransactions,
  getStoredMonths,
  removeMonth,
  monthKeyFromDate,
  updateTransactionCategory,
} from "./storage";
import type { Transaction } from "../utils/csvParser";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    date: new Date(2024, 2, 15), // 15 Mar 2024
    description: "Countdown Supermarket",
    amount: -85.5,
    balance: 1234.0,
    ...overrides,
  };
}

const MARCH_2024 = "2024-03";
const APRIL_2024 = "2024-04";

// Clear localStorage between every test
beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ── monthKeyFromDate ────────────────────────────────────────────────────────

describe("monthKeyFromDate", () => {
  it("returns YYYY-MM format", () => {
    expect(monthKeyFromDate(new Date(2024, 2, 15))).toBe("2024-03");
  });

  it("pads single-digit months with a leading zero", () => {
    expect(monthKeyFromDate(new Date(2024, 0, 1))).toBe("2024-01");
  });

  it("handles December correctly", () => {
    expect(monthKeyFromDate(new Date(2024, 11, 31))).toBe("2024-12");
  });
});

// ── saveTransactions ────────────────────────────────────────────────────────

describe("saveTransactions", () => {
  it("returns success: true on a valid save", () => {
    const result = saveTransactions(MARCH_2024, [makeTransaction()]);
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("persists data that can be retrieved afterwards", () => {
    const tx = makeTransaction({ description: "Test Save" });
    saveTransactions(MARCH_2024, [tx]);
    const { transactions } = loadTransactions(MARCH_2024);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].description).toBe("Test Save");
  });

  it("adds the month key to the months index", () => {
    saveTransactions(MARCH_2024, [makeTransaction()]);
    expect(getStoredMonths()).toContain(MARCH_2024);
  });

  it("overwrites existing data for the same month", () => {
    saveTransactions(MARCH_2024, [makeTransaction({ description: "Old" })]);
    saveTransactions(MARCH_2024, [
      makeTransaction({ description: "New" }),
      makeTransaction({ description: "New2" }),
    ]);
    const { transactions } = loadTransactions(MARCH_2024);
    expect(transactions).toHaveLength(2);
    expect(transactions[0].description).toBe("New");
  });

  it("does not duplicate the month key in the index when saving the same month twice", () => {
    saveTransactions(MARCH_2024, [makeTransaction()]);
    saveTransactions(MARCH_2024, [makeTransaction()]);
    expect(getStoredMonths().filter((m) => m === MARCH_2024)).toHaveLength(1);
  });

  it("returns quota_exceeded error when localStorage is full", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });
    const result = saveTransactions(MARCH_2024, [makeTransaction()]);
    expect(result.success).toBe(false);
    expect(result.error?.type).toBe("quota_exceeded");
    expect(result.error?.message).toMatch(/quota exceeded/i);
  });

  it("returns unavailable error for other storage failures", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    const result = saveTransactions(MARCH_2024, [makeTransaction()]);
    expect(result.success).toBe(false);
    expect(result.error?.type).toBe("unavailable");
  });
});

// ── loadTransactions ────────────────────────────────────────────────────────

describe("loadTransactions", () => {
  it("returns an empty array with no error when no data exists for a month", () => {
    const { transactions, error } = loadTransactions(MARCH_2024);
    expect(transactions).toHaveLength(0);
    expect(error).toBeUndefined();
  });

  it("restores the date as a Date object (not a string)", () => {
    saveTransactions(MARCH_2024, [makeTransaction()]);
    const { transactions } = loadTransactions(MARCH_2024);
    expect(transactions[0].date).toBeInstanceOf(Date);
    expect(transactions[0].date).toEqual(new Date(2024, 2, 15));
  });

  it("restores all transaction fields correctly", () => {
    const tx = makeTransaction({
      description: "Power Bill",
      amount: -120,
      balance: 4880,
    });
    saveTransactions(MARCH_2024, [tx]);
    const { transactions } = loadTransactions(MARCH_2024);
    const t = transactions[0];
    expect(t.description).toBe("Power Bill");
    expect(t.amount).toBe(-120);
    expect(t.balance).toBe(4880);
  });

  it("returns a parse_error when stored data is corrupt", () => {
    localStorage.setItem("finance_analyser_" + MARCH_2024, "{bad json}");
    const { transactions, error } = loadTransactions(MARCH_2024);
    expect(transactions).toHaveLength(0);
    expect(error?.type).toBe("parse_error");
  });
});

// ── loadAllTransactions ─────────────────────────────────────────────────────

describe("loadAllTransactions", () => {
  it("returns an empty map when nothing is stored", () => {
    const { byMonth, errors } = loadAllTransactions();
    expect(Object.keys(byMonth)).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it("returns all stored months", () => {
    saveTransactions(MARCH_2024, [makeTransaction()]);
    saveTransactions(APRIL_2024, [
      makeTransaction({ date: new Date(2024, 3, 1) }),
    ]);
    const { byMonth, errors } = loadAllTransactions();
    expect(errors).toHaveLength(0);
    expect(Object.keys(byMonth)).toHaveLength(2);
    expect(byMonth[MARCH_2024]).toHaveLength(1);
    expect(byMonth[APRIL_2024]).toHaveLength(1);
  });

  it("includes errors for corrupt months without omitting valid months", () => {
    saveTransactions(MARCH_2024, [makeTransaction()]);
    localStorage.setItem("finance_analyser_" + APRIL_2024, "{bad json}");
    localStorage.setItem(
      "finance_analyser_months",
      JSON.stringify([MARCH_2024, APRIL_2024]),
    );
    const { byMonth, errors } = loadAllTransactions();
    expect(byMonth[MARCH_2024]).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].monthKey).toBe(APRIL_2024);
  });
});

// ── getStoredMonths ─────────────────────────────────────────────────────────

describe("getStoredMonths", () => {
  it("returns an empty array when nothing is stored", () => {
    expect(getStoredMonths()).toEqual([]);
  });

  it("returns months in chronological order regardless of insertion order", () => {
    saveTransactions(APRIL_2024, [makeTransaction()]);
    saveTransactions(MARCH_2024, [makeTransaction()]);
    expect(getStoredMonths()).toEqual([MARCH_2024, APRIL_2024]);
  });
});

// ── removeMonth ─────────────────────────────────────────────────────────────

describe("removeMonth", () => {
  it("removes the month data from localStorage", () => {
    saveTransactions(MARCH_2024, [makeTransaction()]);
    removeMonth(MARCH_2024);
    const { transactions } = loadTransactions(MARCH_2024);
    expect(transactions).toHaveLength(0);
  });

  it("removes the month from the index", () => {
    saveTransactions(MARCH_2024, [makeTransaction()]);
    removeMonth(MARCH_2024);
    expect(getStoredMonths()).not.toContain(MARCH_2024);
  });

  it("does not affect other months when one is removed", () => {
    saveTransactions(MARCH_2024, [makeTransaction()]);
    saveTransactions(APRIL_2024, [makeTransaction()]);
    removeMonth(MARCH_2024);
    expect(getStoredMonths()).toEqual([APRIL_2024]);
    expect(loadTransactions(APRIL_2024).transactions).toHaveLength(1);
  });
});

// ── updateTransactionCategory ─────────────────────────────────────────────

describe("updateTransactionCategory", () => {
  it("updates the category at the given index and persists it", () => {
    saveTransactions(MARCH_2024, [
      makeTransaction({ category: "Groceries" }),
      makeTransaction({ category: "Transport" }),
    ]);
    updateTransactionCategory(MARCH_2024, 0, "Dining");
    const { transactions } = loadTransactions(MARCH_2024);
    expect(transactions[0].category).toBe("Dining");
    expect(transactions[1].category).toBe("Transport");
  });

  it("returns success: true on a valid update", () => {
    saveTransactions(MARCH_2024, [makeTransaction()]);
    const result = updateTransactionCategory(MARCH_2024, 0, "Dining");
    expect(result.success).toBe(true);
  });

  it("returns an error for an out-of-range index", () => {
    saveTransactions(MARCH_2024, [makeTransaction()]);
    const result = updateTransactionCategory(MARCH_2024, 99, "Dining");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns an error for a month that does not exist", () => {
    const result = updateTransactionCategory("2099-01", 0, "Dining");
    expect(result.success).toBe(false);
  });

  it("does not modify other transactions in the month", () => {
    const txns = [
      makeTransaction({ description: "A", category: "Groceries" }),
      makeTransaction({ description: "B", category: "Transport" }),
      makeTransaction({ description: "C", category: "Utilities" }),
    ];
    saveTransactions(MARCH_2024, txns);
    updateTransactionCategory(MARCH_2024, 1, "Dining");
    const { transactions } = loadTransactions(MARCH_2024);
    expect(transactions[0].category).toBe("Groceries");
    expect(transactions[1].category).toBe("Dining");
    expect(transactions[2].category).toBe("Utilities");
  });
});
