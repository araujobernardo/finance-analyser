import { useMemo } from "react";
import { MonthlySpendChart } from "../components/MonthlySpendChart";
import type { MonthDataPoint } from "../components/MonthlySpendChart";
import { getStoredMonths, loadTransactions } from "../services/storage";

function buildChartData(): MonthDataPoint[] {
  const months = getStoredMonths(); // already chronological
  return months.map((monthKey) => {
    const { transactions } = loadTransactions(monthKey);
    const income = transactions.reduce(
      (s, t) => (t.amount > 0 ? s + t.amount : s),
      0,
    );
    const expenses = transactions.reduce(
      (s, t) => (t.amount < 0 ? s + Math.abs(t.amount) : s),
      0,
    );
    const net = income - expenses;

    // "2025-03" → "Mar 25"
    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    const label = date.toLocaleString("en", {
      month: "short",
      year: "2-digit",
    });

    return { monthKey, label, expenses, net };
  });
}

export function HistoryPage() {
  const data = useMemo(() => buildChartData(), []);

  return (
    <div className="page-content">
      <h1>Trends</h1>
      <MonthlySpendChart data={data} />
    </div>
  );
}
