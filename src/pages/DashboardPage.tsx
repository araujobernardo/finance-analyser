import { useState } from "react";
import { MonthToggleBar } from "../components/MonthToggleBar";
import { MonthlySummary } from "../components/MonthlySummary";
import { LargestTransactions } from "../components/LargestTransactions";
import {
  useActiveMonths,
  useActiveTransactions,
} from "../context/AccountContext";
import "./DashboardPage.css";

export function DashboardPage() {
  const months = useActiveMonths();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Auto-select the first available month whenever the months list changes
  const resolvedMonth =
    selectedMonth && months.includes(selectedMonth)
      ? selectedMonth
      : (months[0] ?? null);

  const transactions = useActiveTransactions(resolvedMonth);

  return (
    <div className="dashboard-page">
      <h1>Dashboard</h1>
      {months.length === 0 ? (
        <p className="dashboard-empty">
          No data yet — upload a CSV to get started.
        </p>
      ) : (
        <div className="dashboard-grid">
          <div className="dashboard-full">
            <MonthToggleBar
              months={months}
              selectedMonth={resolvedMonth}
              onMonthSelect={setSelectedMonth}
            />
          </div>
          <div className="dashboard-full">
            <MonthlySummary transactions={transactions} />
          </div>
          <div className="dashboard-full">
            <LargestTransactions
              transactions={transactions}
              onCategoryClick={() => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}
