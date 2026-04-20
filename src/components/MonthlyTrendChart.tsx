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
import "./MonthlyTrendChart.css";

export interface TrendDataPoint {
  monthKey: string;
  label: string;
  totalSpend: number;
}

interface Props {
  data: TrendDataPoint[];
  selectedMonth: string | null;
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

export function MonthlyTrendChart({ data, selectedMonth }: Props) {
  if (data.length < 2) {
    return (
      <p className="monthly-trend-empty">
        {data.length === 0
          ? "No monthly data yet — upload at least two months to see trends."
          : "Upload at least two months of data to see a trend chart."}
      </p>
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
