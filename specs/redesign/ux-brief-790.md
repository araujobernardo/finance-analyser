# UX Brief — #790 Dashboard: Spending Trends Multi-Series Line Chart (Option B — Focus and Fade)

## Decision

The user selected **Option B**: Focus and Fade — a new full-width card placed **below** the existing weekly Recharts `SpendingTrendsByCategoryChart`. Category chips above the chart double as a toggleable legend; hovering a chip or a line amplifies that line and fades all others.

## Mockup Reference

`specs/redesign/mockups/790/option-b.html`

---

## Layout

- Full-width card spanning the dashboard charts grid (below existing chart).
- Card title: **"Spending Trends by Category"**; subtitle: date range e.g. `"Jan 2025 – Jun 2025"`.
- Card hides entirely when fewer than 2 months of data exist.

---

## Category Chips (above chart)

- One chip per category (top 5), ordered by descending total spend.
- Chips use the category colour as background (`color: #fff`).
- Chips are **clickable toggles**: clicking hides/shows that category's line.
- Hidden-chip visual: `opacity: 0.35; filter: saturate(0.3)` — class `dimmed`.
- Hovering a chip highlights that line (same focus/fade as line hover — see below).
- CSS classes: `.cat-chips` container, `.cat-chip`, `.cat-chip.dimmed`.
- `data-testid="cat-chip-{categoryName}"` on each chip.

---

## Chart (SVG)

- `<svg viewBox="0 0 700 130" preserveAspectRatio="none">` — responsive, scales with container.
- Padding: `padL=0, padR=0, padT=10, padB=28`.
- Horizontal grid lines at 25%, 50%, 75% of chart height — stroke `#ede8e2`, 1px.
- One `<path>` per visible category, using `stroke-linecap="round" stroke-linejoin="round"`.
- Stroke widths: top category 2.5px; others 2px; hovered category 3px.
- X-axis month labels at `y = H - 4`, font 10px, fill `#7a8074`, `font-family: Nunito`, `font-weight: 600`.

### Focus and Fade Interaction

- On **line hover** (mouseenter on `path[data-cat]`):
  - Hovered line: `stroke-opacity: 1`, `stroke-width: 3px`.
  - All other visible lines: `stroke-opacity: 0.15`.
  - Transition: `stroke-opacity 0.15s, stroke-width 0.15s`.
  - Dots (`<circle r="4">`) appear at each data point on the hovered line.
- On **mouseleave**: all lines revert to full opacity and normal widths.

### Gradient Fill

- Applied only to the top-spend category line, only when it is visible.
- SVG `<linearGradient id="tg">`: `stop-opacity` 0.18 at 0%, 0 at 100%, using that category's colour.
- Fill path traces the polyline then closes to the chart bottom.
- Gradient is removed from the DOM when the top category chip is toggled off.

---

## Tooltip

- Floating `position: fixed` tooltip, `pointer-events: none`.
- Triggered by `mousemove` on the chart area; hidden on `mouseleave`.
- Snaps to the nearest month index based on cursor X position.
- Shows: month label (bold, 13px) + one row per **visible** category sorted by descending spend for that month.
- Each row: coloured dot (8px circle) + category name + amount (formatted as currency).
- Hovered category row gets class `tooltip-active-row`: `background: var(--bg); border-radius: 6px; padding: 3px 6px`.
- Tooltip positions at `(clientX + 16, clientY - 20)`, clamped so it doesn't overflow the viewport right edge.
- `data-testid="spending-trends-tooltip"` on the tooltip element.

---

## Data

- Source: expense transactions only (not credits, not transfers).
- Grouped by category and month, top 5 categories by total spend.
- X-axis = all months present in data, chronological.
- Y normalised to chart height (130px - padT - padB).
- Filters to the **selected account** when a specific account is active in `AccountContext`.

---

## Implementation Checklist

1. **New component** `src/components/SpendingTrendsByCategoryLineChart.tsx` — pure presentational, receives `data` prop.
2. **New styles** `src/components/SpendingTrendsByCategoryLineChart.css` — all classes above.
3. **`DashboardPage.tsx`** — import and render the new component below the existing `SpendingTrendsByCategoryChart`. Guard: only render when `months.length >= 2`.
4. **Data hook/utility** — derive top-5 category monthly totals from existing transaction data (reuse existing hooks where possible).
5. **`data-testid` attributes**: `spending-trends-line-chart`, `cat-chip-{name}`, `spending-trends-tooltip`.
6. **Tests** (`SpendingTrendsByCategoryLineChart.test.tsx`):
   - Renders chip per top-5 category.
   - Clicking a chip applies `dimmed` class.
   - Card hidden when < 2 months of data.
   - Gradient fill path present for top category.
   - Tooltip visible on mouse move (mock mouse event).

---

## Acceptance Criteria (from issue #790)

- Lines render for top 5 categories with correct colours.
- X-axis labels match available months.
- Gradient fill applied to highest-spend category only.
- Chart is responsive (SVG scales with container).
- Chart filters to selected account when a specific account is active.
- Card hides when fewer than 2 months of data exist.
- Hover focus/fade interaction works: hovered line amplified, others fade to ~15% opacity.
- Category chips toggle line visibility and act as legend.
- Tooltip highlights hovered category row with tinted background.
- New component is placed **below** the existing weekly Recharts `SpendingTrendsByCategoryChart`.
