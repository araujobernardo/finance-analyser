import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { ApiSnapshot } from "../../types/api";

interface Props {
  snapshots: ApiSnapshot[];
}

function formatMonthYear(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-NZ", { month: "short", year: "2-digit" });
}

function formatNZD(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}k`;
  }
  return `$${value.toFixed(0)}`;
}

const NZD = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
});

export function NetWorthHistoryChart({ snapshots }: Props) {
  if (snapshots.length < 2) {
    return (
      <p className="nw-history__empty" data-testid="nw-history-empty">
        Your net worth history will appear here after a few visits.
      </p>
    );
  }

  const chartData = snapshots.map((s) => ({
    snapshotDate: s.snapshotDate,
    netWorth: parseFloat(s.netWorth),
  }));

  return (
    <div data-testid="nw-history-chart">
      <h2 className="nw-history__title">Net Worth History</h2>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="snapshotDate"
            tickFormatter={formatMonthYear}
            tick={{ fontSize: 12 }}
          />
          <YAxis tickFormatter={formatNZD} tick={{ fontSize: 12 }} width={60} />
          <Tooltip
            labelFormatter={(label: unknown) => {
              const labelStr = String(label);
              const date = new Date(labelStr + "T00:00:00");
              return date.toLocaleDateString("en-NZ", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });
            }}
            formatter={(value: ValueType | undefined) => [
              NZD.format(Number(value ?? 0)),
              "Net Worth",
            ]}
          />
          <Line
            type="monotone"
            dataKey="netWorth"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--accent)" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
