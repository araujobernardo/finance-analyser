import { useState } from "react";
import { parseCsv } from "../utils/csvParser";
import type { ParseError, Transaction } from "../utils/csvParser";
import { getStoredMonths, loadTransactions, monthKeyFromDate, saveTransactions } from "../services/storage";
import { categoriseTransactions } from "../services/categorisation";

interface PendingUpload {
  monthKey: string;
  transactions: Transaction[];
}

export interface UseFileUploadResult {
  selectedFile: File | null;
  parseErrors: ParseError[];
  isDuplicate: boolean;
  duplicateMonth: string | null;
  isCategorising: boolean;
  savedMonthKey: string | null;
  savedTransactions: Transaction[];
  handleFile: (file: File) => void;
  confirmReplace: () => void;
  cancelReplace: () => void;
}

/** Formats a "YYYY-MM" key into a human-readable month name, e.g. "March 2024". */
function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString("en", { month: "long", year: "numeric" });
}

export function useFileUpload(): UseFileUploadResult {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [pending, setPending] = useState<PendingUpload | null>(null);
  const [isCategorising, setIsCategorising] = useState(false);
  const [savedMonthKey, setSavedMonthKey] = useState<string | null>(null);
  const [savedTransactions, setSavedTransactions] = useState<Transaction[]>([]);

  async function saveWithCategories(monthKey: string, transactions: Transaction[]): Promise<void> {
    setIsCategorising(true);
    try {
      const categorised = await categoriseTransactions(transactions);
      saveTransactions(monthKey, categorised);
      setSavedMonthKey(monthKey);
      setSavedTransactions(loadTransactions(monthKey).transactions);
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

      const monthKey = monthKeyFromDate(transactions[0].date);
      const storedMonths = getStoredMonths();

      if (storedMonths.includes(monthKey)) {
        setPending({ monthKey, transactions });
      } else {
        void saveWithCategories(monthKey, transactions);
        setPending(null);
      }
    };
    reader.readAsText(file);
  }

  function confirmReplace(): void {
    if (pending) {
      void saveWithCategories(pending.monthKey, pending.transactions);
      setPending(null);
    }
  }

  function cancelReplace(): void {
    setPending(null);
    setSelectedFile(null);
  }

  return {
    selectedFile,
    parseErrors,
    isDuplicate: pending !== null,
    duplicateMonth: pending ? formatMonthKey(pending.monthKey) : null,
    isCategorising,
    savedMonthKey,
    savedTransactions,
    handleFile,
    confirmReplace,
    cancelReplace,
  };
}
