import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { EmptyState } from "./ui/EmptyState";
import { SkeletonCard } from "./ui/SkeletonCard";
import "./MonthlyTrendChart.css";

export interface TrendDataPoint {
  monthKey: string;
  label: string;
  totalSpend: number;
}

interface Props {
  data: TrendDataPoint[];
  selectedMonth: string | null;
  isLoading?: boolean;
}

function TrendIcon() {
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
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
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
    <div className="monthly-trend-tooltip">
      <strong>{label}</strong>
      <div>{fmt.format(payload[0].value as number)}</div>
    </div>
  );
}

export function MonthlyTrendChart({ data, selectedMonth, isLoading }: Props) {
  if (isLoading) {
    return <SkeletonCard rows={4} />;
  }

  if (data.length < 2) {
    return (
      <EmptyState
        icon={<TrendIcon />}
        message={
          data.length === 0
            ? "No monthly data yet — upload at least two months to see trends."
            : "Upload at least two months of data to see a trend chart."
        }
      />
    );
  }

  const minWidth = Math.max(480, data.length * 80);

  return (
    <div className="monthly-trend-scroll">
      <div style={{ minWidth }}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={data}
            margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "var(--text)" }}
            />
            <YAxis
              tickFormatter={(v) => fmt.format(v as number)}
              tick={{ fontSize: 11, fill: "var(--text)" }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="totalSpend" name="Total Spend" radius={[3, 3, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.monthKey}
                  fill={
                    entry.monthKey === selectedMonth
                      ? "var(--accent)"
                      : "var(--rules-muted)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
