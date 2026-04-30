import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeekBucket } from "../types/weeklyData";
import { EmptyState } from "./ui/EmptyState";
import { SkeletonCard } from "./ui/SkeletonCard";
import "./WeeklyTrendChart.css";

export interface WeeklyTrendChartProps {
  data: WeekBucket[];
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

interface ChartDataPoint extends WeekBucket {
  avg: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const spend = payload.find(
    (p: { dataKey: string }) => p.dataKey === "totalSpend",
  )?.value as number | undefined;
  const avg = payload.find((p: { dataKey: string }) => p.dataKey === "avg")
    ?.value as number | undefined;

  return (
    <div className="weekly-trend-tooltip">
      <strong>{label}</strong>
      {spend !== undefined && (
        <div className="weekly-trend-tooltip__row">
          Spend: {fmt.format(spend)}
        </div>
      )}
      {avg !== undefined && (
        <div className="weekly-trend-tooltip__avg">
          4-wk avg: {fmt.format(avg)}
        </div>
      )}
    </div>
  );
}

function buildChartData(data: WeekBucket[]): ChartDataPoint[] {
  return data.map((bucket, i) => {
    const window = data.slice(Math.max(0, i - 3), i + 1);
    const avg =
      window.reduce((sum, d) => sum + d.totalSpend, 0) / window.length;
    return { ...bucket, avg };
  });
}

export function WeeklyTrendChart({ data, isLoading }: WeeklyTrendChartProps) {
  if (isLoading) {
    return <SkeletonCard rows={4} />;
  }

  if (data.length < 2) {
    return (
      <EmptyState
        icon={<TrendIcon />}
        message={
          data.length === 0
            ? "No weekly data yet — upload transactions to see weekly trends."
            : "Upload at least two weeks of data to see a weekly trend chart."
        }
      />
    );
  }

  const chartData = buildChartData(data);
  const minWidth = Math.max(480, data.length * 80);

  return (
    <>
      <div className="weekly-trend-legend">
        <span className="weekly-trend-legend__item">
          <span
            className="weekly-trend-legend__swatch"
            style={{ backgroundColor: "#6366f1" }}
          />
          Weekly spend
        </span>
        <span className="weekly-trend-legend__item">
          <span
            className="weekly-trend-legend__line"
            style={{ backgroundColor: "var(--accent)" }}
          />
          4-wk avg
        </span>
      </div>
      <div
        className="weekly-trend-scroll"
        aria-label="Weekly spending trend chart"
      >
        <div style={{ minWidth }}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-subtle)"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "var(--muted)" }}
              />
              <YAxis
                tickFormatter={(v) => fmt.format(v as number)}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="totalSpend"
                name="Total Spend"
                radius={[3, 3, 0, 0]}
                animationDuration={250}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.weekStart} fill="#6366f1" />
                ))}
              </Bar>
              <Line
                dataKey="avg"
                name="4-wk avg"
                type="monotone"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                animationDuration={250}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
