import { useState, useMemo } from "react";
import { MonthToggleBar } from "../components/MonthToggleBar";
import { MonthlySummary } from "../components/MonthlySummary";
import { getStoredMonths, loadTransactions } from "../services/storage";
import "./DashboardPage.css";

export function DashboardPage() {
  const months = useMemo(() => getStoredMonths(), []);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(
    months[0] ?? null,
  );

  const transactions = useMemo(() => {
    if (!selectedMonth) return [];
    return loadTransactions(selectedMonth).transactions;
  }, [selectedMonth]);

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
              selectedMonth={selectedMonth}
              onMonthSelect={setSelectedMonth}
            />
          </div>
          <div className="dashboard-full">
            <MonthlySummary transactions={transactions} />
          </div>
        </div>
      )}
    </div>
  );
}
