import { useMemo } from "react";
import { MonthlySpendChart } from "../components/MonthlySpendChart";
import type { MonthDataPoint } from "../components/MonthlySpendChart";
import { CategoryTrendChart } from "../components/CategoryTrendChart";
import type { MonthCategoryData } from "../components/CategoryTrendChart";
import { getStoredMonths, loadTransactions } from "../services/storage";

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString("en", { month: "short", year: "2-digit" });
}

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

    return { monthKey, label: monthLabel(monthKey), expenses, net };
  });
}

function buildCategoryTrendData(): MonthCategoryData[] {
  const months = getStoredMonths();
  return months.map((monthKey) => {
    const { transactions } = loadTransactions(monthKey);
    const byCategory: Record<string, number> = {};
    for (const t of transactions) {
      if (t.amount >= 0) continue; // skip income
      const cat = t.category || "Uncategorised";
      byCategory[cat] = (byCategory[cat] ?? 0) + Math.abs(t.amount);
    }
    return { monthKey, label: monthLabel(monthKey), byCategory };
  });
}

export function HistoryPage() {
  const data = useMemo(() => buildChartData(), []);
  const categoryData = useMemo(() => buildCategoryTrendData(), []);

  return (
    <div className="page-content">
      <h1>Trends</h1>
      <MonthlySpendChart data={data} />
      <h2>Spending by Category</h2>
      <CategoryTrendChart months={categoryData} />
    </div>
  );
}
