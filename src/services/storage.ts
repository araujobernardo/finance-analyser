import type { Transaction } from "../utils/csvParser";

const STORAGE_PREFIX = "finance_analyser_";
const MONTHS_INDEX_KEY = "finance_analyser_months";

export interface StorageError {
  type: "quota_exceeded" | "parse_error" | "unavailable";
  message: string;
}

export interface SaveResult {
  success: boolean;
  error?: StorageError;
}

export interface LoadResult {
  transactions: Transaction[];
  error?: StorageError;
}

export interface AllTransactionsResult {
  byMonth: Record<string, Transaction[]>;
  errors: Array<{ monthKey: string; error: StorageError }>;
}

/**
 * Derives a stable month key (e.g. "2024-03") from a Transaction's date.
 * Use this to group and key transactions by month.
 */
export function monthKeyFromDate(date: Date): string {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Saves a month's transactions to localStorage, overwriting any existing
 * data for that month key.
 */
export function saveTransactions(monthKey: string, transactions: Transaction[]): SaveResult {
  try {
    const storageKey = STORAGE_PREFIX + monthKey;
    const serialised = JSON.stringify(transactions.map(serialiseTransaction));
    localStorage.setItem(storageKey, serialised);
    updateMonthsIndex(monthKey, "add");
    return { success: true };
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      return {
        success: false,
        error: { type: "quota_exceeded", message: "Storage quota exceeded. Please clear some data and try again." },
      };
    }
    return {
      success: false,
      error: { type: "unavailable", message: `Failed to save data: ${String(err)}` },
    };
  }
}

/**
 * Loads transactions for a single month from localStorage.
 * Returns an empty array (no error) if the month has no stored data.
 */
export function loadTransactions(monthKey: string): LoadResult {
  try {
    const storageKey = STORAGE_PREFIX + monthKey;
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return { transactions: [] };
    const parsed = JSON.parse(raw) as SerialisedTransaction[];
    return { transactions: parsed.map(deserialiseTransaction) };
  } catch (err) {
    return {
      transactions: [],
      error: { type: "parse_error", message: `Failed to load data for ${monthKey}: ${String(err)}` },
    };
  }
}

/**
 * Loads all stored months' transactions on app start.
 * Returns a map of monthKey → Transaction[] plus any per-month errors.
 */
export function loadAllTransactions(): AllTransactionsResult {
  const months = getStoredMonths();
  const byMonth: Record<string, Transaction[]> = {};
  const errors: AllTransactionsResult["errors"] = [];

  for (const monthKey of months) {
    const result = loadTransactions(monthKey);
    byMonth[monthKey] = result.transactions;
    if (result.error) {
      errors.push({ monthKey, error: result.error });
    }
  }

  return { byMonth, errors };
}

/**
 * Returns the list of month keys currently stored, in chronological order.
 */
export function getStoredMonths(): string[] {
  try {
    const raw = localStorage.getItem(MONTHS_INDEX_KEY);
    if (raw === null) return [];
    const months = JSON.parse(raw) as string[];
    return months.sort();
  } catch {
    return [];
  }
}

/**
 * Removes a month's transactions from localStorage.
 */
export function removeMonth(monthKey: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + monthKey);
    updateMonthsIndex(monthKey, "remove");
  } catch {
    // Best-effort removal — silent failure acceptable here
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

interface SerialisedTransaction {
  date: string; // ISO string
  description: string;
  amount: number;
  balance?: number; // absent for NZ bank format transactions
  category?: string;
}

function serialiseTransaction(t: Transaction): SerialisedTransaction {
  return { date: t.date.toISOString(), description: t.description, amount: t.amount, balance: t.balance, category: t.category };
}

function deserialiseTransaction(s: SerialisedTransaction): Transaction {
  return { date: new Date(s.date), description: s.description, amount: s.amount, balance: s.balance, category: s.category };
}

function updateMonthsIndex(monthKey: string, action: "add" | "remove"): void {
  const months = getStoredMonths();
  if (action === "add") {
    if (!months.includes(monthKey)) {
      months.push(monthKey);
      localStorage.setItem(MONTHS_INDEX_KEY, JSON.stringify(months));
    }
  } else {
    const filtered = months.filter(m => m !== monthKey);
    localStorage.setItem(MONTHS_INDEX_KEY, JSON.stringify(filtered));
  }
}
