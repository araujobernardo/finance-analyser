import { useState } from "react";
import { parseCsv } from "../utils/csvParser";
import type { ParseError, Transaction } from "../utils/csvParser";
import { getStoredMonths, monthKeyFromDate, saveTransactions } from "../services/storage";

interface PendingUpload {
  monthKey: string;
  transactions: Transaction[];
}

export interface UseFileUploadResult {
  selectedFile: File | null;
  parseErrors: ParseError[];
  isDuplicate: boolean;
  duplicateMonth: string | null;
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
        saveTransactions(monthKey, transactions);
        setPending(null);
      }
    };
    reader.readAsText(file);
  }

  function confirmReplace(): void {
    if (pending) {
      saveTransactions(pending.monthKey, pending.transactions);
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
    handleFile,
    confirmReplace,
    cancelReplace,
  };
}
