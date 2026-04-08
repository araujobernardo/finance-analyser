import { useEffect, useState } from "react";
import { CsvUpload } from "../components/CsvUpload";
import { DuplicateWarningModal } from "../components/DuplicateWarningModal";
import { TransactionList } from "../components/TransactionList";
import { CategoryRulesList } from "../components/CategoryRulesList";
import { useFileUpload } from "../hooks/useFileUpload";
import { loadRules } from "../services/categoryRules";
import type { Transaction } from "../utils/csvParser";

export function UploadPage() {
  const {
    selectedFile,
    isDuplicate,
    duplicateMonth,
    isCategorising,
    savedMonthKey,
    savedTransactions,
    handleFile,
    confirmReplace,
    cancelReplace,
  } = useFileUpload();

  const [displayedTransactions, setDisplayedTransactions] = useState<
    Transaction[]
  >([]);
  const [rules, setRules] = useState<Record<string, string>>(() => loadRules());

  useEffect(() => {
    setDisplayedTransactions(savedTransactions);
  }, [savedTransactions]);

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
      {savedMonthKey && displayedTransactions.length > 0 && !isCategorising && (
        <TransactionList
          monthKey={savedMonthKey}
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
