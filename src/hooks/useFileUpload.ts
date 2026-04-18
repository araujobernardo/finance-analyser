import { useState } from "react";
import { parseCsv } from "../utils/csvParser";
import type { ParseError, Transaction } from "../utils/csvParser";
import {
  getAccountMonths,
  getTransactions,
  monthKeyFromDate,
  saveTransactions,
  DEFAULT_ACCOUNT_ID,
} from "../services/storage";
import { categoriseTransactions } from "../services/categorisation";

interface MonthGroup {
  monthKey: string;
  transactions: Transaction[];
}

interface PendingUpload {
  groups: MonthGroup[];
  duplicateMonthKeys: string[];
}

export interface UseFileUploadResult {
  selectedFile: File | null;
  parseErrors: ParseError[];
  isDuplicate: boolean;
  duplicateMonth: string | null;
  isCategorising: boolean;
  savedMonthKey: string | null;
  savedMonthCount: number;
  handleFile: (file: File) => void;
  confirmReplace: () => void;
  cancelReplace: () => void;
}

export interface UseFileUploadOptions {
  /** The account ID to scope uploads to. Defaults to DEFAULT_ACCOUNT_ID. */
  accountId?: string;
}

/** Formats a "YYYY-MM" key into a human-readable month name, e.g. "March 2024". */
function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString("en", { month: "long", year: "numeric" });
}

/** Groups an array of transactions into per-month buckets, sorted by month key. */
function groupByMonth(transactions: Transaction[]): MonthGroup[] {
  const map = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const key = monthKeyFromDate(t.date);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, txns]) => ({ monthKey, transactions: txns }));
}

export function useFileUpload(
  options: UseFileUploadOptions = {},
): UseFileUploadResult {
  const accountId = options.accountId ?? DEFAULT_ACCOUNT_ID;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [isCategorising, setIsCategorising] = useState(false);
  const [savedMonthKey, setSavedMonthKey] = useState<string | null>(null);
  const [savedMonthCount, setSavedMonthCount] = useState(0);

  async function saveGroup(group: MonthGroup): Promise<void> {
    const { monthKey, transactions } = group;
    // Preserve manually-set categories already in storage for this month + account
    const { transactions: stored } = getTransactions(accountId, monthKey);
    const storedCats = new Map(
      stored
        .filter((t) => t.category && t.category !== "Uncategorised")
        .map((t) => [`${t.description}|||${t.amount}`, t.category]),
    );
    const withPreserved = transactions.map((t) => {
      const existing = storedCats.get(`${t.description}|||${t.amount}`);
      return existing ? { ...t, category: existing } : t;
    });
    const categorised = await categoriseTransactions(withPreserved);
    saveTransactions(accountId, monthKey, categorised);
  }

  async function saveAllGroups(groups: MonthGroup[]): Promise<void> {
    setIsCategorising(true);
    try {
      for (const group of groups) {
        await saveGroup(group);
      }
      const mostRecent = groups[groups.length - 1].monthKey;
      setSavedMonthKey(mostRecent);
      setSavedMonthCount(groups.length);
    } finally {
      setIsCategorising(false);
    }
  }

  function handleFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") return;

      const { transactions, errors } = parseCsv(text);
      setParseErrors(errors);
      setSelectedFile(file);

      if (transactions.length === 0) return;

      const groups = groupByMonth(transactions);
      // Duplicate detection is scoped to the current account only
      const storedMonths = getAccountMonths(accountId);
      const duplicateMonthKeys = groups
        .map((g) => g.monthKey)
        .filter((key) => storedMonths.includes(key));

      if (duplicateMonthKeys.length > 0) {
        setPending({ groups, duplicateMonthKeys });
      } else {
        void saveAllGroups(groups);
        setPending(null);
      }
    };
    reader.readAsText(file);
  }

  function confirmReplace(): void {
    if (pending) {
      void saveAllGroups(pending.groups);
      setPending(null);
    }
  }

  function cancelReplace(): void {
    setPending(null);
    setSelectedFile(null);
  }

  const duplicateMonth = pending
    ? pending.duplicateMonthKeys.map(formatMonthKey).join(", ")
    : null;

  return {
    selectedFile,
    parseErrors,
    isDuplicate: pending !== null,
    duplicateMonth,
    isCategorising,
    savedMonthKey,
    savedMonthCount,
    handleFile,
    confirmReplace,
    cancelReplace,
  };
}
