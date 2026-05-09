import type { Transaction } from "../utils/csvParser";

// ── Version & constants ────────────────────────────────────────────────────────

export const STORAGE_VERSION = 1;
export const DEFAULT_ACCOUNT_ID = "default";

const VERSION_KEY = "finance_analyser_version";
const ACCOUNTS_KEY = "finance_analyser_accounts";
const STORAGE_PREFIX = "finance_analyser_";
const LEGACY_MONTHS_KEY = "finance_analyser_months";

/** Six accessible colours for account chart series. */
export const ACCOUNT_COLOURS = [
  "#6366f1", // indigo
  "#22c55e", // green
  "#f59e0b", // amber
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Account {
  id: string;
  name: string;
  colour: string;
  createdAt: string;
}

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

// ── Migration ──────────────────────────────────────────────────────────────────

/**
 * Runs once on app start. Migrates legacy single-account data (v0) to the
 * multi-account schema (v1) by wrapping it in the default account.
 */
export function runMigration(): void {
  try {
    const stored = localStorage.getItem(VERSION_KEY);
    const version = stored === null ? 0 : parseInt(stored, 10);
    if (version >= STORAGE_VERSION) return;

    // v0 → v1: wrap existing data in the default account
    const legacyMonths = readJson<string[]>(LEGACY_MONTHS_KEY) ?? [];

    if (legacyMonths.length > 0) {
      // Create the default account if it doesn't exist
      const accounts = readJson<Account[]>(ACCOUNTS_KEY) ?? [];
      if (!accounts.find((a) => a.id === DEFAULT_ACCOUNT_ID)) {
        accounts.push({
          id: DEFAULT_ACCOUNT_ID,
          name: "My Account",
          colour: ACCOUNT_COLOURS[0],
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
      }

      // Move each month's data to the account-scoped key
      for (const monthKey of legacyMonths) {
        const legacyKey = STORAGE_PREFIX + monthKey;
        const raw = localStorage.getItem(legacyKey);
        if (raw !== null) {
          localStorage.setItem(
            accountTxnKey(DEFAULT_ACCOUNT_ID, monthKey),
            raw,
          );
          localStorage.removeItem(legacyKey);
        }
      }

      // Move months index
      localStorage.setItem(
        accountMonthsKey(DEFAULT_ACCOUNT_ID),
        JSON.stringify(legacyMonths),
      );
      localStorage.removeItem(LEGACY_MONTHS_KEY);
    }

    localStorage.setItem(VERSION_KEY, String(STORAGE_VERSION));
  } catch {
    // Migration failures are non-fatal — app continues with existing data
  }
}

// ── Account API ────────────────────────────────────────────────────────────────

/** Returns all stored accounts in creation order. */
export function getAccounts(): Account[] {
  runMigration();
  return readJson<Account[]>(ACCOUNTS_KEY) ?? [];
}

// ── Account-scoped transaction API ─────────────────────────────────────────────

/** Returns the list of month keys for an account, in chronological order. */
export function getAccountMonths(accountId: string): string[] {
  try {
    return (readJson<string[]>(accountMonthsKey(accountId)) ?? []).sort();
  } catch {
    return [];
  }
}

/** Loads transactions for a specific account + month. */
export function getTransactions(
  accountId: string,
  monthKey: string,
): LoadResult {
  try {
    const raw = localStorage.getItem(accountTxnKey(accountId, monthKey));
    if (raw === null) return { transactions: [] };
    const parsed = JSON.parse(raw) as SerialisedTransaction[];
    return { transactions: parsed.map(deserialiseTransaction) };
  } catch (err) {
    return {
      transactions: [],
      error: {
        type: "parse_error",
        message: `Failed to load data for ${accountId}/${monthKey}: ${String(err)}`,
      },
    };
  }
}

/** Removes a month's transactions for a specific account. */
export function deleteMonth(accountId: string, monthKey: string): void {
  try {
    localStorage.removeItem(accountTxnKey(accountId, monthKey));
    updateAccountMonthsIndex(accountId, monthKey, "remove");
  } catch {
    // Best-effort
  }
}

// ── saveTransactions — overloaded for backward compatibility ───────────────────

/**
 * Saves transactions for a specific account + month.
 * New multi-account signature: saveTransactions(accountId, monthKey, transactions)
 */
export function saveTransactions(
  accountId: string,
  monthKey: string,
  transactions: Transaction[],
): SaveResult;

/**
 * @deprecated Use saveTransactions(accountId, monthKey, transactions) instead.
 * Legacy single-account signature: saveTransactions(monthKey, transactions)
 */
export function saveTransactions(
  monthKey: string,
  transactions: Transaction[],
): SaveResult;

export function saveTransactions(
  accountIdOrMonthKey: string,
  monthKeyOrTransactions: string | Transaction[],
  transactions?: Transaction[],
): SaveResult {
  if (transactions !== undefined) {
    // New API: (accountId, monthKey, transactions)
    return saveTransactionsImpl(
      accountIdOrMonthKey,
      monthKeyOrTransactions as string,
      transactions,
    );
  }
  // Legacy API: (monthKey, transactions) — ensure default account exists
  ensureDefaultAccount();
  return saveTransactionsImpl(
    DEFAULT_ACCOUNT_ID,
    accountIdOrMonthKey,
    monthKeyOrTransactions as Transaction[],
  );
}

// ── Legacy wrappers (keep existing callers working) ────────────────────────────

/**
 * Derives a stable month key (e.g. "2024-03") from a Transaction's date.
 */
export function monthKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Returns month keys for the default account, in chronological order.
 * @deprecated Prefer getAccountMonths(accountId).
 */
export function getStoredMonths(): string[] {
  runMigration();
  return getAccountMonths(DEFAULT_ACCOUNT_ID);
}

/**
 * Loads transactions for the default account.
 * @deprecated Prefer getTransactions(accountId, monthKey).
 */
export function loadTransactions(monthKey: string): LoadResult {
  runMigration();
  return getTransactions(DEFAULT_ACCOUNT_ID, monthKey);
}

/**
 * Loads all transactions across all months for the default account.
 * @deprecated Prefer per-account queries.
 */
export function loadAllTransactions(): AllTransactionsResult {
  const months = getStoredMonths();
  const byMonth: Record<string, Transaction[]> = {};
  const errors: AllTransactionsResult["errors"] = [];
  for (const monthKey of months) {
    const result = loadTransactions(monthKey);
    byMonth[monthKey] = result.transactions;
    if (result.error) errors.push({ monthKey, error: result.error });
  }
  return { byMonth, errors };
}

/**
 * Updates a single transaction's category in the default account.
 */
export function updateTransactionCategory(
  monthKey: string,
  index: number,
  newCategory: string,
): SaveResult {
  const { transactions, error } = loadTransactions(monthKey);
  if (error) return { success: false, error };
  if (index < 0 || index >= transactions.length) {
    return {
      success: false,
      error: { type: "unavailable", message: `Index ${index} out of range.` },
    };
  }
  transactions[index] = { ...transactions[index], category: newCategory };
  return saveTransactions(DEFAULT_ACCOUNT_ID, monthKey, transactions);
}

/**
 * Sets a user-supplied category override on a single transaction.
 * The override is stored in `categoryOverride` (separate from the AI
 * `category` field) consistent with the manual-override model.
 */
export function overrideTransactionCategory(
  monthKey: string,
  index: number,
  newCategory: string,
): SaveResult {
  const { transactions, error } = loadTransactions(monthKey);
  if (error) return { success: false, error };
  if (index < 0 || index >= transactions.length) {
    return {
      success: false,
      error: { type: "unavailable", message: `Index ${index} out of range.` },
    };
  }
  transactions[index] = {
    ...transactions[index],
    categoryOverride: newCategory,
  };
  return saveTransactions(DEFAULT_ACCOUNT_ID, monthKey, transactions);
}

/**
 * Sets a user-supplied category override on multiple transactions (bulk update).
 */
export function bulkOverrideTransactionCategory(
  monthKey: string,
  indices: number[],
  newCategory: string,
): SaveResult {
  if (!getAccountMonths(DEFAULT_ACCOUNT_ID).includes(monthKey)) {
    return {
      success: false,
      error: {
        type: "unavailable",
        message: `Month ${monthKey} does not exist`,
      },
    };
  }
  const { transactions, error } = loadTransactions(monthKey);
  if (error) return { success: false, error };
  const updated = transactions.map((t, i) =>
    indices.includes(i) ? { ...t, categoryOverride: newCategory } : t,
  );
  return saveTransactions(DEFAULT_ACCOUNT_ID, monthKey, updated);
}

/**
 * Removes a month from the default account.
 * @deprecated Prefer deleteMonth(accountId, monthKey).
 */
export function removeMonth(monthKey: string): void {
  deleteMonth(DEFAULT_ACCOUNT_ID, monthKey);
}

// ── Internal helpers ───────────────────────────────────────────────────────────

interface SerialisedTransaction {
  date: string;
  description: string;
  amount: number;
  balance?: number;
  category?: string;
  categoryOverride?: string;
}

function accountMonthsKey(accountId: string): string {
  return `${STORAGE_PREFIX}${accountId}_months`;
}

function accountTxnKey(accountId: string, monthKey: string): string {
  return `${STORAGE_PREFIX}${accountId}_${monthKey}`;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

function ensureDefaultAccount(): void {
  runMigration();
  const accounts = readJson<Account[]>(ACCOUNTS_KEY) ?? [];
  if (!accounts.find((a) => a.id === DEFAULT_ACCOUNT_ID)) {
    accounts.push({
      id: DEFAULT_ACCOUNT_ID,
      name: "My Account",
      colour: ACCOUNT_COLOURS[0],
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  }
}

function saveTransactionsImpl(
  accountId: string,
  monthKey: string,
  transactions: Transaction[],
): SaveResult {
  try {
    const serialised = JSON.stringify(transactions.map(serialiseTransaction));
    localStorage.setItem(accountTxnKey(accountId, monthKey), serialised);
    updateAccountMonthsIndex(accountId, monthKey, "add");
    return { success: true };
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      return {
        success: false,
        error: {
          type: "quota_exceeded",
          message:
            "Storage quota exceeded. Please clear some data and try again.",
        },
      };
    }
    return {
      success: false,
      error: {
        type: "unavailable",
        message: `Failed to save data: ${String(err)}`,
      },
    };
  }
}

function updateAccountMonthsIndex(
  accountId: string,
  monthKey: string,
  action: "add" | "remove",
): void {
  const key = accountMonthsKey(accountId);
  const months = readJson<string[]>(key) ?? [];
  if (action === "add") {
    if (!months.includes(monthKey)) {
      months.push(monthKey);
      localStorage.setItem(key, JSON.stringify(months));
    }
  } else {
    localStorage.setItem(
      key,
      JSON.stringify(months.filter((m) => m !== monthKey)),
    );
  }
}

function serialiseTransaction(t: Transaction): SerialisedTransaction {
  return {
    date: t.date.toISOString(),
    description: t.description,
    amount: t.amount,
    balance: t.balance,
    category: t.category,
    categoryOverride: t.categoryOverride,
  };
}

function deserialiseTransaction(s: SerialisedTransaction): Transaction {
  return {
    date: new Date(s.date),
    description: s.description,
    amount: s.amount,
    balance: s.balance,
    category: s.category,
    categoryOverride: s.categoryOverride,
  };
}
