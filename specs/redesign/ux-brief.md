# UX Brief — #786 Dashboard Month Selector Redesign (Option A)

## Decision

The user selected **Option A**: compact inline month pills flush-right in the dashboard header, with a minimal outlined/solid toggle style.

## Page Title Behaviour

The dashboard `<h1>` heading (left side of the header) reflects the current month selection in a condensed format:

| Selection          | Heading                                             | Subtitle                                  |
| ------------------ | --------------------------------------------------- | ----------------------------------------- |
| No month selected  | "No month selected"                                 | unchanged                                 |
| 1 month selected   | Month label e.g. `"May '25"`                        | `"All accounts · N transactions"`         |
| 2+ months selected | Range from first to last e.g. `"Jan '25 – Mar '25"` | `"3 months selected · click to deselect"` |

**Rules:**

- First and last are determined by their DOM/chronological order in the pill row, not click order.
- The range format uses an en-dash (`–`), not a hyphen.
- The subtitle count is the number of active pills (e.g. "3 months selected" even if the range spans 5 calendar months but only 3 are selected).
- "click to deselect" is literal hint text — lowercase, appended with `·` separator.

## Visual Design

### Dashboard header layout

```
[Page title block]                    [Month pills →]
 h1: May '25                          Jan '25  Feb '25  Mar '25  Apr '25  [May '25]
 sub: All accounts · 143 transactions
```

- `display: flex; align-items: center; justify-content: space-between; gap: 12px`
- On narrow viewports (`≤640px`) the pills wrap below the title as a full-width scrollable row.

### Month pills

- **Inactive:** outlined pill — `border: 1.5px solid var(--border-strong)`, transparent background, `color: var(--muted)`
- **Active:** solid teal — `background: var(--accent)`, `color: #fff`, `border-color: var(--accent)`, `font-weight: 700`
- **Hover (inactive):** `border-color: var(--accent)`, `color: var(--accent)`, `background: var(--accent-light)`
- Pill dimensions: `padding: 5px 13px; border-radius: 20px; font-size: 12px; font-weight: 600`
- Pills do not wrap; they scroll horizontally on overflow (`overflow-x: auto; scrollbar-width: none`)

### Page heading

- `font-size: 24px; font-weight: 800; color: var(--text); line-height: 1.2`
- Subtitle: `font-size: 12px; color: var(--muted); font-weight: 500; margin-top: 3px`

## Behaviour

- Pills are **toggleable** — clicking an active pill deactivates it; clicking an inactive pill activates it.
- Multiple months may be active simultaneously (multi-select, no limit).
- The heading and subtitle update immediately on every toggle without page reload.
- When navigating to the dashboard for the first time, the most recent month is pre-selected (1 month active by default).

## Implementation Checklist

1. **DashboardPage.tsx** — Replace the existing single-month selector (or add month state) with a `selectedMonths: string[]` state (array of `"YYYY-MM"` strings).
2. **DashboardPage.tsx** — Render month pills from the list of available months (derived from transaction data). Each pill:
   - `onClick`: toggle the month in/out of `selectedMonths`
   - `aria-pressed={selectedMonths.includes(month)}`
   - `data-testid={`month-pill-${month}`}`
3. **DashboardPage.tsx** — Compute `headingText` and `subtitleText` from `selectedMonths`:
   ```ts
   function getHeading(
     selected: string[],
     monthLabels: Record<string, string>,
   ): { heading: string; subtitle: string } {
     if (selected.length === 0)
       return { heading: "No month selected", subtitle: "..." };
     if (selected.length === 1)
       return {
         heading: monthLabels[selected[0]],
         subtitle: "All accounts · N transactions",
       };
     const sorted = [...selected].sort();
     return {
       heading: `${monthLabels[sorted[0]]} – ${monthLabels[sorted[sorted.length - 1]]}`,
       subtitle: `${selected.length} months selected · click to deselect`,
     };
   }
   ```
4. **DashboardPage.tsx** — Filter all chart and stat data through `selectedMonths` (pass as filter to existing data-build helpers, replacing the current single-month filter).
5. **DashboardPage.css** — Add `.dash-month-pills`, `.pill`, `.pill.active`, `.pill:hover` rules matching the spec above. Remove any legacy month-selector styles.
6. **Tests** — Add/update `DashboardPage.test.tsx`:
   - Single month selected → heading shows month label
   - Two months selected → heading shows range, subtitle shows count
   - All months deselected → heading shows "No month selected"
   - Pill `aria-pressed` reflects `selectedMonths` state
   - Clicking an active pill removes it from selection

## Acceptance Criteria

- The dashboard header shows month pills flush-right; the page title is on the left.
- Selecting 1 month: heading = that month's label (e.g. `"May '25"`), subtitle = account + transaction count.
- Selecting 2+ months: heading = range `"Jan '25 – Mar '25"`, subtitle = `"N months selected · click to deselect"`.
- Selecting 0 months: heading = `"No month selected"`.
- All stats and charts reflect the union of selected months' data.
- Existing single-month filtering tests are updated or replaced; new multi-month tests pass.
- No account filter pills (removed by #755) are present.

## Files to Change

- `src/pages/DashboardPage.tsx`
- `src/pages/DashboardPage.css`
- `src/pages/__tests__/DashboardPage.test.tsx` (or equivalent)
