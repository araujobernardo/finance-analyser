# UX Brief — #789 Dashboard — Income vs Expenses (Option C: Month Summary Rows)

## Decision

The user selected **Option C**: horizontal month summary rows with proportional track bars (income teal, expenses red), exact NZD amounts on the right of each bar, and a net badge (+/– saved) below each row's bars.

## Mockup Reference

`specs/redesign/mockups/789/option-c.html`

---

## Component

**File:** `src/components/IncomeExpenseChart.tsx`
**CSS:** `src/components/IncomeExpenseChart.css`

This is a new self-contained card component. It replaces the placeholder right-hand card in the `dash-charts-grid` row (currently showing `LargestTransactions`).

> Note: `LargestTransactions` moves to a new row below the charts grid — it is NOT removed.

---

## Visual Design

### Card structure

```
[Card]
  Title: "Income vs Expenses"
  Subtitle: "Last 5 months"
  [Month rows list]
  [Legend]
```

### Month rows

Each of the 5 most-recent months with transaction data gets one row:

```
[Month name]  [I] [████████░░░] $4,200   <- income track + amount
              [E] [██████░░░░░] $3,100   <- expense track + amount
                  [+$1,100 saved]        <- net badge
```

Grid: `grid-template-columns: 52px 1fr`

- **Month name column** (52px): `font-size: 11px; font-weight: 700; color: var(--muted)`. Current/selected month uses `color: var(--accent)`.
- **Bars column**: stacks two bar rows + net badge with `gap: 4px`.

**Bar row:**

| Element           | Style                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| Label (`I` / `E`) | `font-size: 10px; font-weight: 600; color: var(--muted); width: 14px; text-align: right`                 |
| Track             | `flex: 1; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden`                  |
| Fill — income     | `background: var(--accent); border-radius: 4px; transition: width 0.4s cubic-bezier(0.22,0.61,0.36,1)`   |
| Fill — expense    | `background: var(--red); border-radius: 4px; same transition`                                            |
| Amount            | `font-size: 10px; font-weight: 700; white-space: nowrap; width: 54px; text-align: right; flex-shrink: 0` |
| Amount — income   | `color: var(--accent)`                                                                                   |
| Amount — expense  | `color: var(--red)`                                                                                      |

**Track width**: proportional to `maxVal = Math.max(...all income values, ...all expense values)` across all 5 rows. Width = `Math.round((value / maxVal) * 100)%`.

**Net badge**: sits below the two bar rows inside `bars-col`.

| State                           | Style                                                   |
| ------------------------------- | ------------------------------------------------------- |
| Net positive (income > expense) | `background: var(--accent-light); color: var(--accent)` |
| Net negative (expense > income) | `background: var(--red-light); color: var(--red)`       |

Text: `+$X,XXX saved` for positive, `-$X,XXX` for negative. Format NZD with `toLocaleString('en-NZ')`.
Badge: `font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 4px; display: inline-block`

**Current/selected row highlight**: row with the most-recent data month gets `background: var(--accent-light); border: 1px solid #c0e0db; border-radius: 8px`.

**Hover**: all other rows: `background: var(--surface)` on hover.

**Row padding**: `8px 10px; border-radius: 8px`

**Row gap**: `gap: 10px` between rows.

### Legend

Below the rows, separated by `border-top: 1px solid var(--border); padding-top: 14px; margin-top: 14px`:

```
━ Income    ━ Expenses
```

Two items with a 16px swatch (height: 4px, border-radius: 2px):

- Income: `background: var(--accent)`
- Expenses: `background: var(--red)`

Legend: `display: flex; gap: 16px; justify-content: center`
Item: `font-size: 11px; color: var(--text-2); font-weight: 500; gap: 5px`

---

## Data

```ts
interface MonthSummary {
  month: string; // "YYYY-MM"
  label: string; // e.g. "May '25"
  income: number;
  expense: number;
  net: number; // income - expense
  isCurrent: boolean; // true for the most recent month in the list
}
```

- **Source**: all transactions in `adapted` (already filtered by `activeAccountId` if not "all"), excluding transfers (`isTransfer === true`).
- **Income**: sum of `amount` for transactions where `isCredit === true`.
- **Expense**: sum of `Math.abs(amount)` for transactions where `isCredit === false`.
- **Last 5 months**: take the sorted unique `YYYY-MM` months from transaction data (descending), take the first 5, then reverse to display chronologically (oldest left/top → newest right/bottom).
- **Responds to account filter**: when `activeAccountId` changes, the chart re-derives from the account-filtered `adapted` array.

---

## Props Interface

```ts
interface IncomeExpenseChartProps {
  adapted: AdaptedTxn[]; // all transactions (pre-filtered by account)
  currentMonth: string; // "YYYY-MM" — the most recently selected month pill
}
```

The component derives its own last-5-months list from `adapted` independently of the month pills. `currentMonth` is used only to highlight the current-month row; the chart always shows the last 5 months with data regardless of pill selection.

---

## Placement in DashboardPage

The right card in `dash-charts-grid` currently renders `<LargestTransactions>`. Replace it:

```tsx
<div className="card">
  <IncomeExpenseChart
    adapted={selAdaptedAllMonths}
    currentMonth={months[0] ?? ""}
  />
</div>
```

Where `selAdaptedAllMonths` is the adapted array filtered by account but NOT by selected month pills (so the chart always shows the last 5 months regardless of pill selection).

Move `<LargestTransactions>` to a new single-column card row immediately below `dash-charts-grid`:

```tsx
<div className="card">
  <LargestTransactions ... />
</div>
```

---

## Acceptance Criteria

- [ ] Chart renders 5 month summary rows with income track (teal), expense track (red), and net badge for each row.
- [ ] Bar widths are proportional to `Math.max(...all income values, ...all expense values)` across the visible 5 rows.
- [ ] Each bar row shows the exact NZD amount formatted with `toLocaleString('en-NZ')` to the right.
- [ ] Net badge shows `+$X,XXX saved` (teal) when positive or `-$X,XXX` (red) when negative.
- [ ] The most-recent month row has a teal-tinted background highlight.
- [ ] Chart updates when the active account changes (re-derives from account-filtered transactions).
- [ ] Chart always shows the last 5 months with data — independent of month pill selection.
- [ ] Legend shows Income (teal swatch) and Expenses (red swatch) below the rows.
- [ ] `LargestTransactions` is moved to a card row below the charts grid (not removed).
- [ ] `data-testid="income-expense-chart"` on the component root.
- [ ] `data-testid="month-row-{YYYY-MM}"` on each month row div.
- [ ] `data-testid="net-badge-{YYYY-MM}"` on each net badge.

---

## Files to Create / Modify

| File                                         | Action                                           |
| -------------------------------------------- | ------------------------------------------------ |
| `src/components/IncomeExpenseChart.tsx`      | Create — new component                           |
| `src/components/IncomeExpenseChart.css`      | Create — component styles                        |
| `src/components/IncomeExpenseChart.test.tsx` | Create — unit tests                              |
| `src/pages/DashboardPage.tsx`                | Edit — swap right card, move LargestTransactions |
| `src/pages/DashboardPage.css`                | Edit — if any grid adjustments needed            |
