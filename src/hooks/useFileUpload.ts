import { useState } from "react";
import { parseCsv } from "../utils/csvParser";
import type { ParseError, Transaction } from "../utils/csvParser";
import { categoriseTransactions } from "../services/categorisation";
import { useApi } from "../lib/api";

// DEFAULT_ACCOUNT_ID has been removed — callers must supply a valid accountId.
// If accountId is undefined the hook will not attempt an upload.

/** Derives a stable month key (e.g. "2024-03") from a transaction Date. */
function monthKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

interface MonthGroup {
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
  savedMonthCount: number;
  importedCount: number;
  skippedCount: number;
  /** Non-null when the upload API returned a non-ok response. */
  uploadError: string | null;
  handleFile: (file: File) => void;
  confirmReplace: () => void;
  cancelReplace: () => void;
}

export interface UseFileUploadOptions {
  /** The account ID to scope uploads to. Defaults to DEFAULT_ACCOUNT_ID. */
  accountId?: string;
  /**
   * FA-NW-004 US3: Optional callback invoked after a successful import so
   * callers can refresh net-worth data (assets/liabilities) that may be linked
   * to the account that just received new transactions.
   */
  onImportComplete?: () => void;
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

/** Formats a Date to "YYYY-MM-DD" for the API. */
function formatDateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function useFileUpload(
  options: UseFileUploadOptions = {},
): UseFileUploadResult {
  const accountId = options.accountId;
  const onImportComplete = options.onImportComplete;
  const { apiFetch } = useApi();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseErrors, setParseErrors] = useState<ParseError[]>([]);
  const [isCategorising, setIsCategorising] = useState(false);
  const [savedMonthKey, setSavedMonthKey] = useState<string | null>(null);
  const [savedMonthCount, setSavedMonthCount] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function saveGroup(group: MonthGroup): Promise<{
    imported: number;
    skipped: number;
    error?: string;
  }> {
    if (!accountId) {
      return {
        imported: 0,
        skipped: 0,
        error:
          "No account selected. Please select a specific account before uploading.",
      };
    }

    const { transactions } = group;
    const categorised = await categoriseTransactions(transactions);

    const payload = {
      transactions: categorised.map((t) => ({
        date: formatDateToYMD(t.date),
        amount: t.amount,
        description: t.description,
        category: t.category ?? undefined,
        isTransfer: false,
        isManualTransfer: false,
      })),
    };

    try {
      const res = await apiFetch(
        `/api/accounts/${accountId}/transactions/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`);
        return {
          imported: 0,
          skipped: 0,
          error: `Upload failed: ${errText || `HTTP ${res.status}`}`,
        };
      }
      const data = (await res.json()) as { imported: number; skipped: number };
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      return { imported: 0, skipped: 0, error: `Upload failed: ${message}` };
    }
  }

  async function saveAllGroups(groups: MonthGroup[]): Promise<void> {
    setIsCategorising(true);
    setUploadError(null);
    let totalImported = 0;
    let totalSkipped = 0;
    let firstError: string | undefined;
    try {
      for (const group of groups) {
        const result = await saveGroup(group);
        if (result.error) {
          firstError = result.error;
          break;
        }
        totalImported += result.imported;
        totalSkipped += result.skipped;
      }
      if (firstError) {
        setUploadError(firstError);
      } else {
        const mostRecent = groups[groups.length - 1].monthKey;
        setSavedMonthKey(mostRecent);
        setSavedMonthCount(groups.length);
        setImportedCount(totalImported);
        setSkippedCount(totalSkipped);
        // FA-NW-004 US3: notify caller so net-worth data can be refreshed
        onImportComplete?.();
      }
    } finally {
      setIsCategorising(false);
    }
  }

  function handleFile(file: File): void {
    // Guard: do not attempt upload if no accountId is provided.
    if (!accountId) {
      setUploadError(
        "Please select a specific account before uploading a CSV.",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") return;

      const { transactions, errors } = parseCsv(text);
      setParseErrors(errors);
      setSelectedFile(file);

      if (transactions.length === 0) return;

      const groups = groupByMonth(transactions);
      // Duplicate detection via localStorage has been removed (storage.ts deleted).
      // API-based duplicate detection will be implemented in FA-MIGR-002.
      // For now all uploads proceed immediately (API server handles deduplication).
      void saveAllGroups(groups);
    };
    reader.readAsText(file);
  }

  // confirmReplace and cancelReplace are no-ops now that localStorage-based
  // duplicate detection has been removed. Kept in the public interface for
  // backward compatibility with callers (e.g. DuplicateWarningModal).
  function confirmReplace(): void {}

  function cancelReplace(): void {
    setSelectedFile(null);
  }

  return {
    selectedFile,
    parseErrors,
    isDuplicate: false,
    duplicateMonth: null,
    isCategorising,
    savedMonthKey,
    savedMonthCount,
    importedCount,
    skippedCount,
    uploadError,
    handleFile,
    confirmReplace,
    cancelReplace,
  };
}
