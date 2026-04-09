import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  ResponsiveContainer,
} from "recharts";
import "./MonthlySpendChart.css";

export interface MonthDataPoint {
  monthKey: string;
  label: string; // e.g. "Mar 25"
  expenses: number;
  net: number;
}

interface Props {
  data: MonthDataPoint[];
}

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="spend-chart-tooltip">
      <strong>{label}</strong>
      {payload.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => (
          <div key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {fmt.format(p.value)}
          </div>
        ),
      )}
    </div>
  );
}

export function MonthlySpendChart({ data }: Props) {
  if (data.length < 2) {
    return (
      <p className="spend-chart-empty">
        {data.length === 0
          ? "No monthly data yet — upload at least two months to see trends."
          : "Upload at least two months of data to see a trend chart."}
      </p>
    );
  }

  // Use a wider minWidth so the chart scrolls horizontally when many months
  const minWidth = Math.max(480, data.length * 80);

  return (
    <div className="spend-chart-scroll">
      <div style={{ minWidth }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "var(--text)" }}
            />
            <YAxis
              tickFormatter={(v) => fmt.format(v)}
              tick={{ fontSize: 11, fill: "var(--text)" }}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: "0.85rem" }} />
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill="#dc2626"
              radius={[3, 3, 0, 0]}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="Net Savings"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
