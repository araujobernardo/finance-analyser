import { useState } from "react";
import { CsvUpload } from "../components/CsvUpload";
import { DuplicateWarningModal } from "../components/DuplicateWarningModal";
import { MonthToggleBar } from "../components/MonthToggleBar";
import { MonthlySummary } from "../components/MonthlySummary";
import { SpendByCategory } from "../components/SpendByCategory";
import { SpendingDonutChart } from "../components/SpendingDonutChart";
import { LargestTransactions } from "../components/LargestTransactions";
import { BudgetComparisonPanel } from "../components/BudgetComparisonPanel";
import { TransactionTable } from "../components/TransactionTable";
import { buildCategoryRows } from "../utils/categoryData";
import { TransactionList } from "../components/TransactionList";
import { CategoryRulesList } from "../components/CategoryRulesList";
import { useFileUpload } from "../hooks/useFileUpload";
import { useAccount } from "../context/AccountContext";
import { loadRules } from "../services/categoryRules";
import { loadBudgets } from "../services/budgets";
import {
  getAccountMonths,
  getTransactions,
  deleteMonth,
} from "../services/storage";
import type { Transaction } from "../utils/csvParser";

export function UploadPage() {
  const { accounts, activeAccountId } = useAccount();
  const activeAccount = accounts.find((a) => a.id === activeAccountId);
  const accountName = activeAccount?.name ?? "My Account";
  const accountColour = activeAccount?.colour;

  const {
    selectedFile,
    parseErrors,
    isDuplicate,
    duplicateMonth,
    isCategorising,
    savedMonthKey,
    savedMonthCount,
    handleFile,
    confirmReplace,
    cancelReplace,
  } = useFileUpload({ accountId: activeAccountId });

  // Track which month the user (or a fresh upload) has selected
  const [storedMonths, setStoredMonths] = useState<string[]>(() =>
    getAccountMonths(activeAccountId),
  );
  const [selectedMonth, setSelectedMonth] = useState<string | null>(() => {
    const months = getAccountMonths(activeAccountId);
    return months.length > 0 ? months[months.length - 1] : null;
  });

  // When a new upload completes, refresh month list and jump to new month
  // (render-phase update — avoids setState-in-effect lint rule)
  const [prevSavedMonthKey, setPrevSavedMonthKey] = useState(savedMonthKey);
  if (savedMonthKey !== prevSavedMonthKey) {
    setPrevSavedMonthKey(savedMonthKey);
    const months = getAccountMonths(activeAccountId);
    setStoredMonths(months);
    if (savedMonthKey) setSelectedMonth(savedMonthKey);
  }

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Keep displayed transactions in sync with the selected month.
  // Initialise from storage so transactions are visible immediately on refresh.
  const [displayedTransactions, setDisplayedTransactions] = useState<
    Transaction[]
  >(() => {
    const months = getAccountMonths(activeAccountId);
    if (months.length === 0) return [];
    return getTransactions(activeAccountId, months[months.length - 1])
      .transactions;
  });
  const [prevSelectedMonth, setPrevSelectedMonth] = useState(selectedMonth);
  if (selectedMonth !== prevSelectedMonth) {
    setPrevSelectedMonth(selectedMonth);
    if (!selectedMonth) {
      setDisplayedTransactions([]);
    } else {
      const { transactions } = getTransactions(activeAccountId, selectedMonth);
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
    setSelectedCategory(null);
  }
  const categoryRows = buildCategoryRows(displayedTransactions);

  const filteredTransactions = selectedCategory
    ? displayedTransactions.filter(
        (t) => (t.category || "Uncategorised") === selectedCategory,
      )
    : displayedTransactions;

  const [rules, setRules] = useState<Record<string, string>>(() => loadRules());
  const [budgets, setBudgets] = useState<Record<string, number>>(() =>
    loadBudgets(),
  );
  const [showBudgetForm, setShowBudgetForm] = useState(false);

  function handleDeleteMonth(monthKey: string) {
    deleteMonth(activeAccountId, monthKey);
    const months = getAccountMonths(activeAccountId);
    setStoredMonths(months);
    if (selectedMonth === monthKey) {
      setSelectedMonth(months.length > 0 ? months[months.length - 1] : null);
    }
    setDisplayedTransactions([]);
    setSelectedCategory(null);
  }

  return (
    <div className="page-content">
      <h1>
        Upload Transactions
        {accountColour ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              marginLeft: "0.6rem",
              padding: "0.15rem 0.55rem",
              borderRadius: "999px",
              background: accountColour + "22",
              border: `1px solid ${accountColour}55`,
              fontSize: "0.6em",
              fontWeight: 500,
              color: accountColour,
              verticalAlign: "middle",
            }}
            aria-label={`Active account: ${accountName}`}
          >
            <span
              style={{
                display: "inline-block",
                width: "0.6em",
                height: "0.6em",
                borderRadius: "50%",
                background: accountColour,
              }}
            />
            {accountName}
          </span>
        ) : (
          <span
            style={{
              marginLeft: "0.5rem",
              fontSize: "0.6em",
              fontWeight: 400,
              color: "var(--text-muted, #6b7280)",
              verticalAlign: "middle",
            }}
          >
            ({accountName})
          </span>
        )}
      </h1>
      <CsvUpload onFileSelected={handleFile} />
      {isCategorising && (
        <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>
          Categorising transactions…
        </p>
      )}
      {selectedFile &&
        !isDuplicate &&
        !isCategorising &&
        parseErrors.length > 0 && (
          <div
            style={{
              marginTop: "0.5rem",
              padding: "0.6rem 0.85rem",
              borderRadius: "6px",
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              fontSize: "0.85rem",
              color: "#b91c1c",
            }}
          >
            <strong>Could not read {selectedFile.name}</strong>
            <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.2rem" }}>
              {parseErrors.slice(0, 3).map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
              {parseErrors.length > 3 && (
                <li>…and {parseErrors.length - 3} more row errors</li>
              )}
            </ul>
          </div>
        )}
      {selectedFile &&
        !isDuplicate &&
        !isCategorising &&
        parseErrors.length === 0 && (
          <p style={{ fontSize: "0.8rem", color: "#6b7280" }}>
            Stored: {selectedFile.name} for <strong>{accountName}</strong>
            {savedMonthCount > 1 && ` (${savedMonthCount} months)`}
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
        onMonthDelete={handleDeleteMonth}
      />
      <MonthlySummary transactions={filteredTransactions} />
      <TransactionTable transactions={displayedTransactions} />
      <SpendingDonutChart
        rows={categoryRows}
        selectedCategory={selectedCategory}
        onCategoryClick={setSelectedCategory}
      />
      <SpendByCategory
        rows={categoryRows}
        selectedCategory={selectedCategory}
        onCategoryClick={setSelectedCategory}
        budgets={budgets}
        onBudgetsChange={setBudgets}
        showForm={showBudgetForm}
        onShowFormChange={setShowBudgetForm}
      />
      {selectedCategory && (
        <div style={{ marginBottom: "0.75rem" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.2rem 0.6rem",
              borderRadius: "999px",
              border: "1px solid var(--accent-border)",
              background: "var(--accent-bg)",
              fontSize: "0.85rem",
              color: "var(--accent)",
            }}
          >
            Showing: {selectedCategory}
            <button
              type="button"
              aria-label="Clear filter"
              onClick={() => setSelectedCategory(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "inherit",
                padding: 0,
                lineHeight: 1,
                fontSize: "1rem",
              }}
            >
              ×
            </button>
          </span>
        </div>
      )}
      {selectedMonth && displayedTransactions.length > 0 && !isCategorising && (
        <TransactionList
          monthKey={selectedMonth}
          transactions={filteredTransactions}
          onTransactionsChange={(updated) => {
            setDisplayedTransactions(updated);
            setRules(loadRules());
          }}
        />
      )}
      <LargestTransactions
        transactions={displayedTransactions}
        onCategoryClick={setSelectedCategory}
      />
      <BudgetComparisonPanel
        budgets={budgets}
        rows={categoryRows}
        onManageBudgets={() => setShowBudgetForm(true)}
      />
      <CategoryRulesList rules={rules} onRulesChange={setRules} />
    </div>
  );
}
