import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { WeeklyCategoryBucket } from "../types/weeklyData";
import { EmptyState } from "./ui/EmptyState";
import { SkeletonCard } from "./ui/SkeletonCard";
import "./SpendingTrendsByCategoryChart.css";

interface SpendingTrendsByCategoryChartProps {
  data: WeeklyCategoryBucket[];
  selectedCategory: string | null;
  isLoading?: boolean;
}

function LineChartIcon() {
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
        d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
      />
    </svg>
  );
}

const CATEGORY_COLOURS: Record<string, string> = {
  Groceries: "#c084fc",
  Transport: "#60a5fa",
  Utilities: "#34d399",
  Dining: "#f97316",
  Entertainment: "#f472b6",
  Healthcare: "#4ade80",
  Shopping: "#fb923c",
  Education: "#a78bfa",
  Income: "#2dd4bf",
  Transfer: "#94a3b8",
  Savings: "#10b981",
  Other: "#e879f9",
  Uncategorised: "#6b7280",
};

const FALLBACK_COLOURS = [
  "#c084fc",
  "#60a5fa",
  "#34d399",
  "#f97316",
  "#f472b6",
  "#4ade80",
  "#fb923c",
  "#a78bfa",
  "#2dd4bf",
  "#e879f9",
];

function getCategoryColour(category: string, index: number): string {
  return (
    CATEGORY_COLOURS[category] ??
    FALLBACK_COLOURS[index % FALLBACK_COLOURS.length]
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

export function SpendingTrendsByCategoryChart({
  data,
  selectedCategory,
  isLoading,
}: SpendingTrendsByCategoryChartProps) {
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const bucket of data) {
      for (const cat of Object.keys(bucket.byCategory)) {
        seen.add(cat);
      }
    }
    const sorted = [...seen].filter((c) => c !== "Uncategorised").sort();
    if (seen.has("Uncategorised")) sorted.push("Uncategorised");
    return sorted;
  }, [data]);

  const chartData = useMemo(
    () =>
      data.map((bucket) => ({
        label: bucket.label,
        ...Object.fromEntries(
          categories.map((cat) => [cat, bucket.byCategory[cat] ?? 0]),
        ),
      })),
    [data, categories],
  );

  if (isLoading) {
    return (
      <div className="spend-trends">
        <div className="card-title">Spending Trends by Category</div>
        <SkeletonCard rows={4} />
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="spend-trends">
        <div className="card-title">Spending Trends by Category</div>
        <EmptyState
          icon={<LineChartIcon />}
          message="Need at least 2 weeks of data to show category trends."
        />
      </div>
    );
  }

  const minWidth = Math.max(480, data.length * 80);

  return (
    <div className="spend-trends">
      <div className="card-title">Spending Trends by Category</div>
      <div className="spend-trends__scroll">
        <div style={{ minWidth }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onMouseMove={(state: any) => {
                setHoveredWeek(state?.activeLabel ?? null);
              }}
              onMouseLeave={() => setHoveredWeek(null)}
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
              {hoveredWeek && (
                <ReferenceLine
                  x={hoveredWeek}
                  stroke="var(--accent)"
                  strokeOpacity={0.4}
                  strokeWidth={1}
                />
              )}
              {categories.map((cat, i) => {
                const isSelected =
                  selectedCategory === null || selectedCategory === cat;
                return (
                  <Line
                    key={cat}
                    type="monotone"
                    dataKey={cat}
                    name={cat}
                    stroke={getCategoryColour(cat, i)}
                    strokeWidth={
                      selectedCategory === null
                        ? 2
                        : selectedCategory === cat
                          ? 3
                          : 1
                    }
                    strokeOpacity={isSelected ? 1 : 0.25}
                    dot={{ r: 3 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
