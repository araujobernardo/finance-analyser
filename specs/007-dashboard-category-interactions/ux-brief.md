# UX Brief — WeeklyTrendChart Component

**Chosen option:** Bar Chart with Trend Line Overlay (Option C — Monarch Money style)
**Date:** 2026-04-30

## Layout & Structure

The component renders as a standard card (matching existing dashboard cards) with
a card title of "Weekly Trends" at the top-left using `--text-lg` / `font-weight: 500`.

**Chart area:**

- A `ResponsiveContainer` (width 100%, height 280px) wraps a Recharts `ComposedChart`
  containing both `Bar` and `Line` series
- A horizontal scroll wrapper (`overflow-x: auto`) enables narrow-viewport scrolling;
  `minWidth = Math.max(480, data.length * 80)` (same formula as `MonthlyTrendChart`)
- X-axis: `WeekBucket.label` (e.g. "Jan 27")
- Y-axis: currency-formatted tick labels (NZD, no decimals), width 80px
- Bar series: `totalSpend` per week
- Line series: 4-week rolling average of `totalSpend`, rendered as a smooth curve
  on top of the bars

**Guards (render order):**

1. `isLoading === true` → render `<SkeletonCard rows={4} />`
2. `data.length < 2` → render `<EmptyState>` (see Copy section)
3. Otherwise → render chart

## Component Decisions

| Element                | Token / Value                                                         |
| ---------------------- | --------------------------------------------------------------------- |
| Card background        | `var(--bg-surface)`                                                   |
| Card border            | `1px solid var(--border-subtle)`                                      |
| Card border-radius     | `var(--radius-lg)`                                                    |
| Card padding           | `var(--space-6)`                                                      |
| Card shadow            | `var(--shadow-sm)`                                                    |
| Grid lines             | stroke `var(--border-subtle)` at 50% opacity, `strokeDasharray="3 3"` |
| X-axis ticks           | `var(--text-muted)`, `var(--text-xs)` (12px)                          |
| Y-axis ticks           | `var(--text-muted)`, 11px                                             |
| Bar fill (default)     | `var(--negative)` — expense bars use the semantic red token           |
| Bar radius             | `[3, 3, 0, 0]` (top corners only)                                     |
| Trend line stroke      | `var(--accent)` (`#2ec4b6`)                                           |
| Trend line strokeWidth | `2px`                                                                 |
| Trend line dot         | `false` (no dots on the line — clean overlay)                         |
| Trend line type        | `"monotone"` (smooth Bezier curve)                                    |
| Tooltip background     | `var(--bg-elevated)`                                                  |
| Tooltip border         | `1px solid var(--border-default)`                                     |
| Tooltip border-radius  | `var(--radius-md)`                                                    |
| Tooltip box-shadow     | `var(--shadow-md)`                                                    |
| Tooltip font-size      | `var(--text-sm)` (14px)                                               |
| Animation duration     | `animationDuration={250}` (matches `--motion-normal`)                 |

**Rolling average calculation (inside the component):**
Compute a derived array alongside `data`:

```ts
const rollingAvg = data.map((_, i) => {
  const window = data.slice(Math.max(0, i - 3), i + 1);
  return window.reduce((sum, d) => sum + d.totalSpend, 0) / window.length;
});
```

Merge into the chart data as `avg` field before passing to Recharts.

**Recharts component structure:**

```
<ComposedChart data={chartData}>
  <CartesianGrid ... />
  <XAxis dataKey="label" ... />
  <YAxis tickFormatter={fmt.format} ... />
  <Tooltip content={<CustomTooltip />} />
  <Bar dataKey="totalSpend" ... />
  <Line dataKey="avg" type="monotone" dot={false} ... />
</ComposedChart>
```

Import `ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer` from `recharts`.

## Interaction Model

- **Hover/tooltip:** Custom tooltip renders on bar hover, showing:
  - Week label (bold)
  - "Spend: NZD X,XXX"
  - "4-wk avg: NZD X,XXX" (rolling average value for that week)
- **No click interaction** on this component — it is display-only in this story
- **Loading state:** `<SkeletonCard rows={4} />` — same pattern as `MonthlyTrendChart`
- **Empty state:** `<EmptyState icon={<TrendIcon />} message={...} />` — same icon
  pattern as `MonthlyTrendChart`
- **Scroll:** Horizontal scroll on narrow viewports via `.weekly-trend-scroll` wrapper

## Copy

| Location              | Text                                                             |
| --------------------- | ---------------------------------------------------------------- |
| Card title            | "Weekly Trends"                                                  |
| Empty state (0 weeks) | "No weekly data yet — upload transactions to see weekly trends." |
| Empty state (1 week)  | "Upload at least two weeks of data to see a weekly trend chart." |
| Tooltip row 1 label   | Week label (e.g. "Jan 27")                                       |
| Tooltip row 2         | "Spend: NZD X,XXX"                                               |
| Tooltip row 3         | "4-wk avg: NZD X,XXX"                                            |

## Constraints

1. **File naming:** `src/components/WeeklyTrendChart.tsx` and `src/components/WeeklyTrendChart.css`
2. **CSS class prefix:** All classes use `weekly-trend-` prefix (e.g. `.weekly-trend-scroll`, `.weekly-trend-tooltip`)
3. **No hardcoded hex or px values** — use design system CSS tokens throughout
4. **TypeScript strict mode** — no `any` unless unavoidable (follow `MonthlyTrendChart` pattern for `CustomTooltip` props)
5. **Props interface** must be exported and named `WeeklyTrendChartProps`:
   ```ts
   export interface WeeklyTrendChartProps {
     data: WeekBucket[];
     isLoading?: boolean;
   }
   ```
6. **Import `WeekBucket` from** `../types/weeklyData`
7. **Responsive:** horizontal scroll wrapper; never let chart overflow clip without scroll
8. **Accessibility:** `ComposedChart` should have `aria-label="Weekly spending trend chart"` on the root wrapper div
9. **Animation:** always set `animationDuration={250}` on both `Bar` and `Line`
10. **No `selectedMonth` prop** — this component does not need active-month highlighting (that belongs to `MonthlyTrendChart`)
