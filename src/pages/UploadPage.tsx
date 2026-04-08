import { useState } from "react";
import { CsvUpload } from "../components/CsvUpload";
import { DuplicateWarningModal } from "../components/DuplicateWarningModal";
import { MonthToggleBar } from "../components/MonthToggleBar";
import { TransactionList } from "../components/TransactionList";
import { CategoryRulesList } from "../components/CategoryRulesList";
import { useFileUpload } from "../hooks/useFileUpload";
import { loadRules } from "../services/categoryRules";
import { getStoredMonths, loadTransactions } from "../services/storage";
import type { Transaction } from "../utils/csvParser";

export function UploadPage() {
  const {
    selectedFile,
    isDuplicate,
    duplicateMonth,
    isCategorising,
    savedMonthKey,
    handleFile,
    confirmReplace,
    cancelReplace,
  } = useFileUpload();

  // Track which month the user (or a fresh upload) has selected
  const [storedMonths, setStoredMonths] = useState<string[]>(() =>
    getStoredMonths(),
  );
  const [selectedMonth, setSelectedMonth] = useState<string | null>(() => {
    const months = getStoredMonths();
    return months.length > 0 ? months[months.length - 1] : null;
  });

  // When a new upload completes, refresh month list and jump to new month
  // (render-phase update — avoids setState-in-effect lint rule)
  const [prevSavedMonthKey, setPrevSavedMonthKey] = useState(savedMonthKey);
  if (savedMonthKey !== prevSavedMonthKey) {
    setPrevSavedMonthKey(savedMonthKey);
    const months = getStoredMonths();
    setStoredMonths(months);
    if (savedMonthKey) setSelectedMonth(savedMonthKey);
  }

  // Keep displayed transactions in sync with the selected month
  const [displayedTransactions, setDisplayedTransactions] = useState<
    Transaction[]
  >([]);
  const [prevSelectedMonth, setPrevSelectedMonth] = useState(selectedMonth);
  if (selectedMonth !== prevSelectedMonth) {
    setPrevSelectedMonth(selectedMonth);
    if (!selectedMonth) {
      setDisplayedTransactions([]);
    } else {
      const { transactions } = loadTransactions(selectedMonth);
      // Edge case: selected month was deleted — fall back to most recent
      if (transactions.length === 0 && storedMonths.length > 0) {
        const fallback = storedMonths[storedMonths.length - 1];
        if (fallback !== selectedMonth) {
          setSelectedMonth(fallback);
        } else {
          setDisplayedTransactions([]);
        }
      } else {
        setDisplayedTransactions(transactions);
      }
    }
  }

  const [rules, setRules] = useState<Record<string, string>>(() => loadRules());

  return (
    <div className="page-content">
      <h1>Upload Transactions</h1>
      <CsvUpload onFileSelected={handleFile} />
      {isCategorising && (
        <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>
          Categorising transactions…
        </p>
      )}
      {selectedFile && !isDuplicate && !isCategorising && (
        <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>
          Stored: {selectedFile.name}
        </p>
      )}
      {isDuplicate && duplicateMonth && (
        <DuplicateWarningModal
          monthName={duplicateMonth}
          onReplace={confirmReplace}
          onCancel={cancelReplace}
        />
      )}
      <MonthToggleBar
        months={storedMonths}
        selectedMonth={selectedMonth}
        onMonthSelect={setSelectedMonth}
      />
      {selectedMonth && displayedTransactions.length > 0 && !isCategorising && (
        <TransactionList
          monthKey={selectedMonth}
          transactions={displayedTransactions}
          onTransactionsChange={(updated) => {
            setDisplayedTransactions(updated);
            setRules(loadRules());
          }}
        />
      )}
      <CategoryRulesList rules={rules} onRulesChange={setRules} />
    </div>
  );
}
