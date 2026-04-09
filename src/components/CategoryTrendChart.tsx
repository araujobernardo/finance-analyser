import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DONUT_PALETTE } from "./SpendingDonutChart";
import "./CategoryTrendChart.css";

export interface MonthCategoryData {
  monthKey: string;
  label: string;
  /** category → total expenses (absolute value) */
  byCategory: Record<string, number>;
}

interface Props {
  months: MonthCategoryData[];
}

const UNCATEGORISED_COLOR = "#9ca3af";
const FALLBACK_COLORS = ["#f59e0b", "#10b981", "#6366f1", "#f43f5e", "#84cc16"];

function colorFor(category: string, index: number): string {
  if (category === "Uncategorised") return UNCATEGORISED_COLOR;
  return (
    DONUT_PALETTE[category] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]
  );
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
    <div className="cat-trend-tooltip">
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

export function CategoryTrendChart({ months }: Props) {
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const m of months) {
      for (const cat of Object.keys(m.byCategory)) {
        seen.add(cat);
      }
    }
    // Uncategorised last
    const sorted = [...seen].filter((c) => c !== "Uncategorised").sort();
    if (seen.has("Uncategorised")) sorted.push("Uncategorised");
    return sorted;
  }, [months]);

  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const chartData = useMemo(
    () =>
      months.map((m) => ({
        label: m.label,
        ...Object.fromEntries(
          categories.map((cat) => [cat, m.byCategory[cat] ?? 0]),
        ),
      })),
    [months, categories],
  );

  if (months.length < 2) {
    return (
      <p className="cat-trend-empty">
        {months.length === 0
          ? "No data yet — upload at least two months to see category trends."
          : "Upload at least two months of data to see category trends."}
      </p>
    );
  }

  function toggleCategory(category: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }

  const minWidth = Math.max(480, months.length * 80);

  return (
    <>
      <ul className="cat-trend-legend">
        {categories.map((cat, i) => {
          const isHidden = hidden.has(cat);
          return (
            <li
              key={cat}
              className={
                isHidden
                  ? "cat-trend-legend__item cat-trend-legend__item--hidden"
                  : "cat-trend-legend__item"
              }
              onClick={() => toggleCategory(cat)}
            >
              <span
                className="cat-trend-legend__swatch"
                style={{ background: isHidden ? "#d1d5db" : colorFor(cat, i) }}
              />
              {cat}
            </li>
          );
        })}
      </ul>
      <div className="cat-trend-scroll">
        <div style={{ minWidth }}>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={chartData}
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
              {categories.map((cat, i) => (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  name={cat}
                  stroke={hidden.has(cat) ? "#d1d5db" : colorFor(cat, i)}
                  strokeWidth={hidden.has(cat) ? 1 : 2}
                  strokeDasharray={hidden.has(cat) ? "4 4" : undefined}
                  dot={{ r: 3 }}
                  hide={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
