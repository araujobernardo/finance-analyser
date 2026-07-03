import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ApiTransaction } from "../types/api";
import { ALL_ACCOUNTS_ID } from "../context/AccountContext";
import { getCategoryColour } from "../utils/categoryColours";
import { EmptyState } from "./ui/EmptyState";
import "./SpendingTrendsByCategoryChart.css";

interface SpendingTrendsByCategoryChartProps {
  transactions: ApiTransaction[];
  activeAccountId: string;
}

function BarChartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.5V21M9 9.75V21M15 6V21M21 3v18"
      />
    </svg>
  );
}

const fmt = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="spend-trends-tooltip">
      <strong>{label}</strong>
      {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        payload.map((p: any) => (
          <div key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {fmt.format(p.value)}
          </div>
        ))
      }
    </div>
  );
}

function formatMonthLabel(yyyyMm: string): string {
  const [y, mo] = yyyyMm.split("-");
  return (
    new Date(+y, +mo - 1, 1).toLocaleString("en-NZ", { month: "short" }) +
    " '" +
    y.slice(2)
  );
}

export function SpendingTrendsByCategoryChart({
  transactions,
  activeAccountId,
}: SpendingTrendsByCategoryChartProps) {
  // Account-filtered expense transactions (no transfers, negative amounts only)
  const expenses = useMemo(
    () =>
      transactions.filter(
        (t) =>
          !t.isTransfer &&
          t.amount < 0 &&
          t.category !== null &&
          (activeAccountId === ALL_ACCOUNTS_ID ||
            t.accountId === activeAccountId),
      ),
    [transactions, activeAccountId],
  );

  // Derive 6-month window anchored on the most recent data month
  const last6Months = useMemo((): string[] => {
    const monthSet = new Set(expenses.map((t) => t.date.slice(0, 7)));
    if (monthSet.size === 0) return [];
    const sorted = Array.from(monthSet).sort();
    const latest = sorted[sorted.length - 1];
    const [y, mo] = latest.split("-").map(Number);
    const result: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(y, mo - 1 - i, 1);
      result.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      );
    }
    return result;
  }, [expenses]);

  // Restrict expenses to the 6-month window
  const windowExpenses = useMemo(() => {
    const monthSet = new Set(last6Months);
    return expenses.filter((t) => monthSet.has(t.date.slice(0, 7)));
  }, [expenses, last6Months]);

  // Top 5 categories by total spend across the window
  const top5 = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of windowExpenses) {
      const cat = t.category!;
      totals.set(cat, (totals.get(cat) ?? 0) + Math.abs(t.amount));
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);
  }, [windowExpenses]);

  // Monthly aggregation: one row per month, one key per top-5 category
  const chartData = useMemo(
    () =>
      last6Months.map((month) => {
        const row: Record<string, number | string> = {
          month: formatMonthLabel(month),
        };
        for (const cat of top5) {
          row[cat] = windowExpenses
            .filter((t) => t.date.slice(0, 7) === month && t.category === cat)
            .reduce((s, t) => s + Math.abs(t.amount), 0);
        }
        return row;
      }),
    [last6Months, top5, windowExpenses],
  );

  // Count months with any spending data for the empty-state guard
  const monthsWithData = useMemo(
    () =>
      chartData.filter((row) => top5.some((cat) => (row[cat] as number) > 0))
        .length,
    [chartData, top5],
  );

  if (monthsWithData < 2) {
    return (
      <div className="spend-trends" data-testid="spending-trends-cat-empty">
        <div className="card-title">Spending Trends by Category</div>
        <EmptyState
          icon={<BarChartIcon />}
          message="Not enough data to show trends — need at least 2 months"
        />
      </div>
    );
  }

  return (
    <div className="spend-trends" data-testid="spending-trends-cat-chart">
      <div className="card-title">Spending Trends by Category</div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--text)" }} />
          <YAxis
            tickFormatter={(v) => fmt.format(v)}
            tick={{ fontSize: 11, fill: "var(--text)" }}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {top5.map((cat, i) => (
            <Bar
              key={cat}
              dataKey={cat}
              name={cat}
              fill={getCategoryColour(cat, i)}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
