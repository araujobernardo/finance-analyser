import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  // New multi-account API
  STORAGE_VERSION,
  DEFAULT_ACCOUNT_ID,
  ACCOUNT_COLOURS,
  runMigration,
  getAccounts,
  saveAccount,
  deleteAccount,
  getAccountMonths,
  getTransactions,
  saveTransactions,
  deleteMonth,
  // Legacy wrappers
  loadTransactions,
  loadAllTransactions,
  getStoredMonths,
  removeMonth,
  monthKeyFromDate,
  updateTransactionCategory,
} from "./storage";
import type { Account } from "./storage";
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

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc-1",
    name: "Test Account",
    colour: ACCOUNT_COLOURS[0],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const MARCH_2024 = "2024-03";
const APRIL_2024 = "2024-04";
const ACC_ID = "acc-test";

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

// ── runMigration ────────────────────────────────────────────────────────────

describe("runMigration", () => {
  it("sets the version key to STORAGE_VERSION", () => {
    runMigration();
    expect(localStorage.getItem("finance_analyser_version")).toBe(
      String(STORAGE_VERSION),
    );
  });

  it("is a no-op when already at current version", () => {
    localStorage.setItem("finance_analyser_version", String(STORAGE_VERSION));
    // Pre-load something to confirm it's not wiped
    localStorage.setItem(
      "finance_analyser_months",
      JSON.stringify([MARCH_2024]),
    );
    runMigration();
    // The old months key should be untouched (migration already ran)
    expect(localStorage.getItem("finance_analyser_months")).not.toBeNull();
  });

  it("migrates v0 month data into the default account", () => {
    // Set up legacy v0 data
    localStorage.setItem(
      "finance_analyser_months",
      JSON.stringify([MARCH_2024]),
    );
    localStorage.setItem(
      "finance_analyser_" + MARCH_2024,
      JSON.stringify([
        {
          date: new Date(2024, 2, 15).toISOString(),
          description: "Legacy Tx",
          amount: -10,
        },
      ]),
    );

    runMigration();

    // Data moved to account-scoped key
    const raw = localStorage.getItem(
      `finance_analyser_${DEFAULT_ACCOUNT_ID}_${MARCH_2024}`,
    );
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed[0].description).toBe("Legacy Tx");

    // Old keys removed
    expect(localStorage.getItem("finance_analyser_months")).toBeNull();
    expect(localStorage.getItem("finance_analyser_" + MARCH_2024)).toBeNull();
  });

  it("creates the default account during v0→v1 migration", () => {
    localStorage.setItem(
      "finance_analyser_months",
      JSON.stringify([MARCH_2024]),
    );
    localStorage.setItem(
      "finance_analyser_" + MARCH_2024,
      JSON.stringify([
        { date: new Date().toISOString(), description: "X", amount: -1 },
      ]),
    );

    runMigration();

    const accounts = JSON.parse(
      localStorage.getItem("finance_analyser_accounts") ?? "[]",
    );
    expect(accounts.some((a: Account) => a.id === DEFAULT_ACCOUNT_ID)).toBe(
      true,
    );
  });

  it("does not duplicate the default account on repeated migration calls", () => {
    localStorage.setItem(
      "finance_analyser_months",
      JSON.stringify([MARCH_2024]),
    );
    localStorage.setItem(
      "finance_analyser_" + MARCH_2024,
      JSON.stringify([
        { date: new Date().toISOString(), description: "X", amount: -1 },
      ]),
    );

    runMigration();
    // Force version back to simulate a second call at v0 (edge case)
    localStorage.removeItem("finance_analyser_version");
    // Re-run — months key is already gone so migration skips account creation
    runMigration();

    const accounts = JSON.parse(
      localStorage.getItem("finance_analyser_accounts") ?? "[]",
    );
    const defaults = accounts.filter(
      (a: Account) => a.id === DEFAULT_ACCOUNT_ID,
    );
    expect(defaults).toHaveLength(1);
  });

  it("does nothing when there is no legacy data to migrate", () => {
    runMigration();
    expect(localStorage.getItem("finance_analyser_accounts")).toBeNull();
  });
});

// ── Account CRUD ────────────────────────────────────────────────────────────

describe("getAccounts / saveAccount / deleteAccount", () => {
  it("returns empty array when no accounts exist", () => {
    expect(getAccounts()).toEqual([]);
  });

  it("saves a new account and retrieves it", () => {
    const acc = makeAccount();
    saveAccount(acc);
    const accounts = getAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].id).toBe("acc-1");
    expect(accounts[0].name).toBe("Test Account");
  });

  it("updates an existing account (upsert by id)", () => {
    saveAccount(makeAccount({ name: "Old Name" }));
    saveAccount(makeAccount({ name: "New Name" }));
    const accounts = getAccounts();
    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe("New Name");
  });

  it("preserves insertion order when adding multiple accounts", () => {
    saveAccount(makeAccount({ id: "a", name: "Alpha" }));
    saveAccount(makeAccount({ id: "b", name: "Beta" }));
    saveAccount(makeAccount({ id: "c", name: "Gamma" }));
    const ids = getAccounts().map((a) => a.id);
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("deleteAccount removes the account from the list", () => {
    saveAccount(makeAccount({ id: "x" }));
    saveAccount(makeAccount({ id: "y" }));
    deleteAccount("x");
    const ids = getAccounts().map((a) => a.id);
    expect(ids).toEqual(["y"]);
  });

  it("deleteAccount removes all month data for that account", () => {
    saveAccount(makeAccount({ id: ACC_ID }));
    saveTransactions(ACC_ID, MARCH_2024, [makeTransaction()]);
    saveTransactions(ACC_ID, APRIL_2024, [makeTransaction()]);
    deleteAccount(ACC_ID);
    expect(getAccountMonths(ACC_ID)).toEqual([]);
    expect(getTransactions(ACC_ID, MARCH_2024).transactions).toHaveLength(0);
  });
});

// ── getAccountMonths ────────────────────────────────────────────────────────

describe("getAccountMonths", () => {
  it("returns empty array for unknown account", () => {
    expect(getAccountMonths("nonexistent")).toEqual([]);
  });

  it("returns months in chronological order", () => {
    saveTransactions(ACC_ID, APRIL_2024, [makeTransaction()]);
    saveTransactions(ACC_ID, MARCH_2024, [makeTransaction()]);
    expect(getAccountMonths(ACC_ID)).toEqual([MARCH_2024, APRIL_2024]);
  });
});

// ── getTransactions / saveTransactions (new 3-arg API) ─────────────────────

describe("saveTransactions (3-arg) / getTransactions", () => {
  it("saves and loads transactions for a specific account", () => {
    saveTransactions(ACC_ID, MARCH_2024, [
      makeTransaction({ description: "Multi Acc" }),
    ]);
    const { transactions } = getTransactions(ACC_ID, MARCH_2024);
    expect(transactions).toHaveLength(1);
    expect(transactions[0].description).toBe("Multi Acc");
  });

  it("restores date as a Date object", () => {
    saveTransactions(ACC_ID, MARCH_2024, [makeTransaction()]);
    const { transactions } = getTransactions(ACC_ID, MARCH_2024);
    expect(transactions[0].date).toBeInstanceOf(Date);
  });

  it("data from different accounts does not bleed across", () => {
    saveTransactions("acc-a", MARCH_2024, [
      makeTransaction({ description: "Account A" }),
    ]);
    saveTransactions("acc-b", MARCH_2024, [
      makeTransaction({ description: "Account B" }),
    ]);
    expect(
      getTransactions("acc-a", MARCH_2024).transactions[0].description,
    ).toBe("Account A");
    expect(
      getTransactions("acc-b", MARCH_2024).transactions[0].description,
    ).toBe("Account B");
  });

  it("returns empty array for unknown account+month", () => {
    const { transactions, error } = getTransactions("nope", MARCH_2024);
    expect(transactions).toHaveLength(0);
    expect(error).toBeUndefined();
  });

  it("returns success: true on valid save", () => {
    const result = saveTransactions(ACC_ID, MARCH_2024, [makeTransaction()]);
    expect(result.success).toBe(true);
  });

  it("returns quota_exceeded error when storage is full", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });
    const result = saveTransactions(ACC_ID, MARCH_2024, [makeTransaction()]);
    expect(result.success).toBe(false);
    expect(result.error?.type).toBe("quota_exceeded");
  });
});

// ── deleteMonth ─────────────────────────────────────────────────────────────

describe("deleteMonth", () => {
  it("removes the month data for the given account", () => {
    saveTransactions(ACC_ID, MARCH_2024, [makeTransaction()]);
    deleteMonth(ACC_ID, MARCH_2024);
    expect(getTransactions(ACC_ID, MARCH_2024).transactions).toHaveLength(0);
    expect(getAccountMonths(ACC_ID)).not.toContain(MARCH_2024);
  });

  it("does not affect other months on the same account", () => {
    saveTransactions(ACC_ID, MARCH_2024, [makeTransaction()]);
    saveTransactions(ACC_ID, APRIL_2024, [makeTransaction()]);
    deleteMonth(ACC_ID, MARCH_2024);
    expect(getAccountMonths(ACC_ID)).toEqual([APRIL_2024]);
  });

  it("does not affect other accounts", () => {
    saveTransactions("acc-a", MARCH_2024, [makeTransaction()]);
    saveTransactions("acc-b", MARCH_2024, [makeTransaction()]);
    deleteMonth("acc-a", MARCH_2024);
    expect(getTransactions("acc-b", MARCH_2024).transactions).toHaveLength(1);
  });
});

// ── Legacy wrappers ─────────────────────────────────────────────────────────

describe("saveTransactions (2-arg legacy) / loadTransactions", () => {
  it("saves via legacy API and loads via legacy API", () => {
    const result = saveTransactions(MARCH_2024, [makeTransaction()]);
    expect(result.success).toBe(true);
    const { transactions } = loadTransactions(MARCH_2024);
    expect(transactions).toHaveLength(1);
  });

  it("legacy save stores in the default account", () => {
    saveTransactions(MARCH_2024, [makeTransaction({ description: "Legacy" })]);
    const { transactions } = getTransactions(DEFAULT_ACCOUNT_ID, MARCH_2024);
    expect(transactions[0].description).toBe("Legacy");
  });

  it("returns empty array with no error when month does not exist", () => {
    const { transactions, error } = loadTransactions(MARCH_2024);
    expect(transactions).toHaveLength(0);
    expect(error).toBeUndefined();
  });

  it("restores date as a Date object", () => {
    saveTransactions(MARCH_2024, [makeTransaction()]);
    const { transactions } = loadTransactions(MARCH_2024);
    expect(transactions[0].date).toBeInstanceOf(Date);
    expect(transactions[0].date).toEqual(new Date(2024, 2, 15));
  });

  it("restores all transaction fields", () => {
    const tx = makeTransaction({
      description: "Power Bill",
      amount: -120,
      balance: 4880,
    });
    saveTransactions(MARCH_2024, [tx]);
    const { transactions } = loadTransactions(MARCH_2024);
    expect(transactions[0].description).toBe("Power Bill");
    expect(transactions[0].amount).toBe(-120);
    expect(transactions[0].balance).toBe(4880);
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

  it("does not duplicate month key in index on repeated saves", () => {
    saveTransactions(MARCH_2024, [makeTransaction()]);
    saveTransactions(MARCH_2024, [makeTransaction()]);
    expect(getStoredMonths().filter((m) => m === MARCH_2024)).toHaveLength(1);
  });

  it("returns parse_error when stored data is corrupt", () => {
    // Write corrupt data directly to the new account-scoped key
    localStorage.setItem(
      `finance_analyser_${DEFAULT_ACCOUNT_ID}_${MARCH_2024}`,
      "{bad json}",
    );
    localStorage.setItem(
      `finance_analyser_${DEFAULT_ACCOUNT_ID}_months`,
      JSON.stringify([MARCH_2024]),
    );
    const { transactions, error } = loadTransactions(MARCH_2024);
    expect(transactions).toHaveLength(0);
    expect(error?.type).toBe("parse_error");
  });

  it("returns unavailable error for other storage failures on save", () => {
    // Ensure the default account exists before mocking setItem,
    // otherwise ensureDefaultAccount() throws before we reach saveTransactionsImpl.
    saveTransactions(MARCH_2024, [makeTransaction()]);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    const result = saveTransactions(MARCH_2024, [makeTransaction()]);
    expect(result.success).toBe(false);
    expect(result.error?.type).toBe("unavailable");
  });
});

// ── loadAllTransactions ─────────────────────────────────────────────────────

describe("loadAllTransactions", () => {
  it("returns empty map when nothing is stored", () => {
    const { byMonth, errors } = loadAllTransactions();
    expect(Object.keys(byMonth)).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it("returns all stored months for the default account", () => {
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
    // Write corrupt data to account-scoped key
    localStorage.setItem(
      `finance_analyser_${DEFAULT_ACCOUNT_ID}_${APRIL_2024}`,
      "{bad json}",
    );
    localStorage.setItem(
      `finance_analyser_${DEFAULT_ACCOUNT_ID}_months`,
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
  it("returns empty array when nothing is stored", () => {
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
  it("removes the month data from storage", () => {
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

  it("does not affect other months", () => {
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
