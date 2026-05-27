import { useMemo, useState, useCallback, useRef } from "react";
import type { ApiTransaction } from "../types/api";
import "./SpendingTrendsLineChart.css";

// ── Constants ──────────────────────────────────────────────────────────────

const W = 700;
const H = 130;
const PAD_L = 0;
const PAD_R = 0;
const PAD_T = 10;
const PAD_B = 28;
const CHART_W = W - PAD_L - PAD_R;
const CHART_H = H - PAD_T - PAD_B;
const TOP_5 = 5;

// Maps lowercase category names to CSS token hex values (from index.css).
const CAT_COLOR_MAP: Record<string, string> = {
  groceries: "#4a7c59",
  transport: "#2e6b8a",
  entertainment: "#7b5ea7",
  utilities: "#c07a1a",
  healthcare: "#c53030",
  dining: "#b5541a",
  shopping: "#0f7a7a",
};

const FALLBACK_COLORS = ["#6C8EBF", "#82B366", "#D79B00", "#AE4132", "#9673A6"];

function catColor(name: string, fallbackIndex: number): string {
  return (
    CAT_COLOR_MAP[name.toLowerCase()] ??
    FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length]
  );
}

// ── Types ──────────────────────────────────────────────────────────────────

interface CategorySeries {
  name: string;
  color: string;
  /** One value per month (chronological). */
  values: number[];
}

// ── Data derivation ────────────────────────────────────────────────────────

function buildSeries(
  transactions: ApiTransaction[],
  activeAccountId: string,
): { months: string[]; series: CategorySeries[] } {
  // Expense transactions only: negative amount, not a transfer, matching account.
  const expenses = transactions.filter(
    (t) =>
      t.amount < 0 &&
      !t.isTransfer &&
      (activeAccountId === "all" || t.accountId === activeAccountId),
  );

  if (expenses.length === 0) return { months: [], series: [] };

  // Collect all months and sort chronologically.
  const monthSet = new Set(expenses.map((t) => t.date.slice(0, 7)));
  const months = Array.from(monthSet).sort();

  // Aggregate spend by category × month.
  const totals = new Map<string, Map<string, number>>();
  for (const t of expenses) {
    const cat = t.category ?? "Uncategorised";
    const month = t.date.slice(0, 7);
    if (!totals.has(cat)) totals.set(cat, new Map());
    const mMap = totals.get(cat)!;
    mMap.set(month, (mMap.get(month) ?? 0) + Math.abs(t.amount));
  }

  // Rank categories by total spend, take top 5.
  const ranked = Array.from(totals.entries())
    .map(([name, mMap]) => ({
      name,
      total: Array.from(mMap.values()).reduce((s, v) => s + v, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_5);

  const series: CategorySeries[] = ranked.map(({ name }, i) => ({
    name,
    color: catColor(name, i),
    values: months.map((m) => totals.get(name)?.get(m) ?? 0),
  }));

  return { months, series };
}

// ── SVG geometry helpers ───────────────────────────────────────────────────

function xOf(i: number, count: number): number {
  if (count <= 1) return PAD_L + CHART_W / 2;
  return PAD_L + (i / (count - 1)) * CHART_W;
}

function yOf(v: number, maxVal: number): number {
  return PAD_T + CHART_H - (v / maxVal) * CHART_H;
}

function makePath(values: number[], maxVal: number): string {
  return values
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${xOf(i, values.length).toFixed(1)},${yOf(v, maxVal).toFixed(1)}`,
    )
    .join(" ");
}

// ── Formatters ─────────────────────────────────────────────────────────────

const fmtMonthLabel = (ym: string): string => {
  const [y, mo] = ym.split("-");
  const label = new Date(+y, +mo - 1, 1).toLocaleString("en-NZ", {
    month: "short",
  });
  return `${label} '${y.slice(2)}`;
};

const fmtCurrency = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// ── Props ──────────────────────────────────────────────────────────────────

interface SpendingTrendsLineChartProps {
  transactions: ApiTransaction[];
  activeAccountId: string;
}

// ── Component ──────────────────────────────────────────────────────────────

export function SpendingTrendsLineChart({
  transactions,
  activeAccountId,
}: SpendingTrendsLineChartProps) {
  const { months, series } = useMemo(
    () => buildSeries(transactions, activeAccountId),
    [transactions, activeAccountId],
  );

  const [hiddenCats, setHiddenCats] = useState<Set<string>>(new Set());
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    monthIdx: number;
  }>({ visible: false, x: 0, y: 0, monthIdx: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  // All hooks must be declared before any early return.
  const toggleCat = useCallback((name: string) => {
    setHiddenCats((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!svgRef.current || months.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * W;
      const divisor = months.length > 1 ? CHART_W / (months.length - 1) : 1;
      const idx = Math.max(
        0,
        Math.min(months.length - 1, Math.round(relX / divisor)),
      );
      setTooltip({ visible: true, x: e.clientX, y: e.clientY, monthIdx: idx });
    },
    [months.length],
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
    setHoveredCat(null);
  }, []);

  // Hide the card when fewer than 2 months of data exist.
  if (months.length < 2) return null;

  const visibleSeries = series.filter((s) => !hiddenCats.has(s.name));
  const topCat = series[0]; // series already sorted by total desc

  const allVals = visibleSeries.flatMap((s) => s.values);
  const maxVal = allVals.length > 0 ? Math.max(...allVals) * 1.1 : 1;

  // Subtitle: "Jan '25 – Jun '25"
  const subtitle = `${fmtMonthLabel(months[0])} – ${fmtMonthLabel(months[months.length - 1])}`;

  // ── SVG content ──────────────────────────────────────────────────────────

  const gridLines = [0.25, 0.5, 0.75].map((frac) => {
    const y = (PAD_T + CHART_H * (1 - frac)).toFixed(1);
    return (
      <line
        key={frac}
        x1={0}
        y1={y}
        x2={W}
        y2={y}
        stroke="#ede8e2"
        strokeWidth={1}
      />
    );
  });

  // Gradient fill for top category (only when it is visible).
  const topVisible = topCat && !hiddenCats.has(topCat.name);
  const gradientEl = topVisible ? (
    <>
      <defs>
        <linearGradient id="stlc-tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={topCat.color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={topCat.color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={`${makePath(topCat.values, maxVal)} L${xOf(months.length - 1, months.length).toFixed(1)},${(PAD_T + CHART_H).toFixed(1)} L${xOf(0, months.length).toFixed(1)},${(PAD_T + CHART_H).toFixed(1)} Z`}
        fill="url(#stlc-tg)"
      />
    </>
  ) : null;

  const lineEls = visibleSeries.map((s) => {
    const isHovered = hoveredCat === s.name;
    const anyHovered = hoveredCat !== null;
    const opacity = anyHovered ? (isHovered ? 1 : 0.15) : 1;
    const sw = isHovered ? 3 : s.name === topCat?.name ? 2.5 : 2;
    return (
      <path
        key={s.name}
        d={makePath(s.values, maxVal)}
        fill="none"
        stroke={s.color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={opacity}
        style={{ transition: "stroke-opacity 0.15s, stroke-width 0.15s" }}
        data-cat={s.name}
        onMouseEnter={() => setHoveredCat(s.name)}
        onMouseLeave={() => setHoveredCat(null)}
      />
    );
  });

  // Dots on the hovered line.
  const hoverDots = (() => {
    if (!hoveredCat) return null;
    const s = visibleSeries.find((c) => c.name === hoveredCat);
    if (!s) return null;
    return s.values.map((v, i) => (
      <circle
        key={i}
        cx={xOf(i, months.length).toFixed(1)}
        cy={yOf(v, maxVal).toFixed(1)}
        r={4}
        fill={s.color}
        stroke="#fff"
        strokeWidth={1.5}
        style={{ pointerEvents: "none" }}
      />
    ));
  })();

  const xLabels = months.map((m, i) => (
    <text
      key={m}
      x={xOf(i, months.length).toFixed(1)}
      y={H - 4}
      textAnchor="middle"
      fontSize={10}
      fill="#7a8074"
      fontFamily="Nunito, sans-serif"
      fontWeight={600}
    >
      {fmtMonthLabel(m)}
    </text>
  ));

  // Sort visible series by descending spend for the tooltip month.
  const tooltipRows = [...visibleSeries].sort(
    (a, b) => b.values[tooltip.monthIdx] - a.values[tooltip.monthIdx],
  );

  return (
    <>
      <div className="stlc-card" data-testid="spending-trends-line-chart">
        <div className="stlc-header">
          <div>
            <div className="stlc-title">Spending Trends by Category</div>
            <div className="stlc-subtitle">{subtitle}</div>
          </div>
        </div>

        {/* Category chips — toggle visibility and act as legend */}
        <div className="stlc-chips">
          {series.map((s) => (
            <span
              key={s.name}
              className={`stlc-chip${hiddenCats.has(s.name) ? " stlc-chip--dimmed" : ""}`}
              style={{ background: s.color }}
              onClick={() => toggleCat(s.name)}
              data-testid={`cat-chip-${s.name}`}
              role="button"
              aria-pressed={!hiddenCats.has(s.name)}
            >
              {s.name}
            </span>
          ))}
        </div>

        {/* Chart */}
        <div
          className="stlc-chart-area"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <svg
            ref={svgRef}
            className="stlc-svg"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            aria-label="Spending trends by category line chart"
          >
            {gridLines}
            {gradientEl}
            {lineEls}
            {hoverDots}
            {xLabels}
          </svg>
        </div>
      </div>

      {/* Tooltip — rendered outside the card so it can escape card overflow */}
      <div
        className={`stlc-tooltip${tooltip.visible ? " stlc-tooltip--visible" : ""}`}
        style={{
          left: Math.min(tooltip.x + 16, window.innerWidth - 190),
          top: tooltip.y - 20,
        }}
        data-testid="spending-trends-tooltip"
      >
        <div className="stlc-tooltip-month">
          {months[tooltip.monthIdx]
            ? fmtMonthLabel(months[tooltip.monthIdx])
            : ""}
        </div>
        {tooltipRows.map((s) => (
          <div
            key={s.name}
            className={`stlc-tooltip-row${hoveredCat === s.name ? " stlc-tooltip-row--active" : ""}`}
          >
            <span
              className="stlc-tooltip-dot"
              style={{ background: s.color }}
            />
            <span className="stlc-tooltip-cat">{s.name}</span>
            <span className="stlc-tooltip-amount" style={{ color: s.color }}>
              {fmtCurrency.format(s.values[tooltip.monthIdx])}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
