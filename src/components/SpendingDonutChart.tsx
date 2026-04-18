import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from "recharts";
import type { CategoryRow } from "../utils/categoryData";
import "./SpendingDonutChart.css";

interface Props {
  rows: CategoryRow[];
  selectedCategory: string | null;
  onCategoryClick: (category: string | null) => void;
}

// Fixed palette: one colour per named category + grey for Uncategorised
const PALETTE: Record<string, string> = {
  Groceries: "#16a34a",
  Transport: "#2563eb",
  Utilities: "#d97706",
  Dining: "#ea580c",
  Entertainment: "#7c3aed",
  Healthcare: "#db2777",
  Shopping: "#4f46e5",
  Education: "#0891b2",
  Income: "#65a30d",
  Transfer: "#0284c7",
  Other: "#64748b",
  Uncategorised: "#9ca3af",
};

// Fallback for any category not in CATEGORIES list
const FALLBACK_COLORS = ["#f59e0b", "#10b981", "#6366f1", "#f43f5e", "#84cc16"];

function colorFor(category: string, index: number): string {
  return PALETTE[category] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ActiveShape(props: any) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
  } = props;
  return (
    <g>
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill={fill}
        fontSize={13}
        fontWeight={600}
      >
        {payload.category}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#6b7280" fontSize={12}>
        {(percent * 100).toFixed(1)}%
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 14}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { category, total } = payload[0].payload;
  return (
    <div className="donut-tooltip">
      <span className="donut-tooltip__name">{category}</span>
      <span className="donut-tooltip__amount">{fmt.format(total)}</span>
    </div>
  );
}

export function SpendingDonutChart({
  rows,
  selectedCategory,
  onCategoryClick,
}: Props) {
  if (rows.length < 2) {
    return (
      <div className="donut-empty">
        {rows.length === 0
          ? "No expense data to chart."
          : "Only one spending category — not enough data for a comparison."}
      </div>
    );
  }

  return (
    <div className="donut-wrapper">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={rows}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={110}
            activeShape={ActiveShape}
            onClick={(_, index) => {
              const cat = rows[index].category;
              onCategoryClick(cat === selectedCategory ? null : cat);
            }}
            style={{ cursor: "pointer" }}
          >
            {rows.map((row, index) => (
              <Cell key={row.category} fill={colorFor(row.category, index)} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="donut-legend">
        {rows.map((row, index) => (
          <li
            key={row.category}
            className={
              row.category === selectedCategory
                ? "donut-legend__item donut-legend__item--active"
                : "donut-legend__item"
            }
            onClick={() =>
              onCategoryClick(
                row.category === selectedCategory ? null : row.category,
              )
            }
          >
            <span
              className="donut-legend__swatch"
              style={{ background: colorFor(row.category, index) }}
            />
            {row.category}
          </li>
        ))}
      </ul>
    </div>
  );
}

export { PALETTE as DONUT_PALETTE };
