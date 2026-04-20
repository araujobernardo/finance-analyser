import { useState, useMemo } from "react";
import { MonthToggleBar } from "../components/MonthToggleBar";
import { MonthlySummary } from "../components/MonthlySummary";
import { LargestTransactions } from "../components/LargestTransactions";
import { MonthlyTrendChart } from "../components/MonthlyTrendChart";
import type { TrendDataPoint } from "../components/MonthlyTrendChart";
import {
  useActiveMonths,
  useActiveTransactions,
  useAccount,
  ALL_ACCOUNTS_ID,
} from "../context/AccountContext";
import { getTransactions } from "../services/storage";
import "./DashboardPage.css";

function formatMonthLabel(monthKey: string): string {
  // monthKey format: "YYYY-MM"
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-NZ", { month: "short", year: "2-digit" });
}

export function DashboardPage() {
  const months = useActiveMonths();
  const { accounts, activeAccountId } = useAccount();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Auto-select the first available month whenever the months list changes
  const resolvedMonth =
    selectedMonth && months.includes(selectedMonth)
      ? selectedMonth
      : (months[0] ?? null);

  const transactions = useActiveTransactions(resolvedMonth);

  const trendData = useMemo<TrendDataPoint[]>(() => {
    return months.map((monthKey) => {
      let totalSpend = 0;
      if (activeAccountId === ALL_ACCOUNTS_ID) {
        for (const acc of accounts) {
          const { transactions: txns } = getTransactions(acc.id, monthKey);
          for (const t of txns) {
            if (t.amount < 0) totalSpend += Math.abs(t.amount);
          }
        }
      } else {
        const { transactions: txns } = getTransactions(
          activeAccountId,
          monthKey,
        );
        for (const t of txns) {
          if (t.amount < 0) totalSpend += Math.abs(t.amount);
        }
      }
      return { monthKey, label: formatMonthLabel(monthKey), totalSpend };
    });
  }, [months, accounts, activeAccountId]);

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
          <div className="dashboard-full">
            <MonthlyTrendChart data={trendData} selectedMonth={resolvedMonth} />
          </div>
        </div>
      )}
    </div>
  );
}
