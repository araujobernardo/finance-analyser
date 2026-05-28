# UX Brief — #791 Dashboard Recent Transactions Widget (Option A — Compact Timeline)

## Decision

The user selected **Option A**: Compact Timeline — a feed-style list grouped under date-stamp dividers with a hairline rule, emoji category icons, and right-aligned colour-coded amounts. Replaces the current "Largest Transactions" panel.

## Mockup Reference

`specs/redesign/mockups/791/option-a.html`

---

## Visual Design

### Card Shell

- White card, `border-radius: 12px`, `border: 1px solid var(--border)`, `box-shadow: var(--shadow-sm)`
- Card header: title "Recent Transactions" (15px, 700) + subtitle showing selected month (12px, 500, muted) on the left; "View all" link (12px, 600, accent) on the right
- Card footer: centered "See all transactions →" link (12px, 600, accent), separated from list by `border-top: 1px solid var(--border)`

### Date-Group Divider

- `padding: 8px 20px 4px`
- Label: 10px, 700, `letter-spacing: 0.07em`, `text-transform: uppercase`, `color: var(--subtle)`
- Hairline rule: `flex: 1; height: 1px; background: var(--border)` stretching to the right edge

### Transaction Row

- `display: grid; grid-template-columns: 36px 1fr auto; align-items: center; gap: 10px; padding: 8px 20px`
- Hover: `background: var(--surface-hover)` with `transition: background 120ms ease-out`
- `cursor: pointer`

### Emoji Icon (left column)

- 34×34px, `border-radius: 9px`, `font-size: 17px`, centred
- Tinted background colour per category (see table below)

| Category      | Emoji | Icon background | Dot colour                 |
| ------------- | ----- | --------------- | -------------------------- |
| Groceries     | 🛒    | `#e8f4ec`       | `var(--cat-groceries)`     |
| Transport     | 🚌    | `#e9f2f8`       | `var(--cat-transport)`     |
| Income        | 💰    | `#e8f5f3`       | `var(--accent)`            |
| Dining        | 🍽️    | `#fdf3e8`       | `var(--cat-dining)`        |
| Utilities     | ⚡    | `#fef9ec`       | `var(--cat-utilities)`     |
| Entertainment | 🎬    | `#f3f0f9`       | `var(--cat-entertainment)` |
| Healthcare    | 🏥    | `#fdf3f3`       | `var(--cat-healthcare)`    |
| Shopping      | 🛍️    | `#e8f5f3`       | `var(--accent-mid)`        |
| Other/Unknown | 💳    | `#f4f1ed`       | `var(--muted)`             |

### Middle Column (payee + meta)

- Payee name: 13px, 600, `color: var(--text)`, truncated with ellipsis
- Meta row: 11px, 500, `color: var(--muted)`, containing a 6×6px coloured dot + category label only (no date on the meta line — date is shown by the group divider)

### Amount (right column)

- 14px, 700, `font-variant-numeric: tabular-nums`, no wrap
- Debit: `color: var(--red)`, prefixed `−`
- Credit: `color: var(--accent)`, prefixed `+`

---

## Behaviour

- Shows the **7 most recent non-transfer transactions** for the currently selected month(s)
- Sorted by date descending; grouped under date dividers (e.g. "27 May", "25 May")
- Multiple transactions on the same date appear under one divider
- If no transactions: show an empty state message centred in the card (`color: var(--muted); font-size: 13px`)
- "View all" (header) and "See all transactions →" (footer) both navigate to `/transactions`

---

## What to Remove

- Delete `src/components/LargestTransactions.tsx`, `LargestTransactions.css`, `LargestTransactions.test.tsx`
- Remove the `<LargestTransactions>` usage and its associated `txnsForLargest` data-prep logic from `DashboardPage.tsx`
- Remove the "Filtered: [category]" interaction that was part of the old widget

---

## Implementation Checklist

1. **New component** `src/components/RecentTransactions.tsx` + `RecentTransactions.css`
   - Props: `transactions: Transaction[]`, `month: string` (label for subtitle), `onViewAll: () => void`
   - Internally filters to 7 most recent non-transfer, groups by date, renders dividers + rows
   - `data-testid="recent-transactions-widget"` on root element
   - `data-testid="recent-txn-row"` on each `.txn-row`
   - `data-testid="date-divider"` on each `.date-divider`
2. **DashboardPage.tsx**
   - Replace `<LargestTransactions>` with `<RecentTransactions>`
   - Pass relevant transactions + month label + `onViewAll` navigating to `/transactions`
   - Remove `txnsForLargest` memo and `LargestTransactions` import
3. **LargestTransactions files** — delete all three (`.tsx`, `.css`, `.test.tsx`)
4. **Tests** — create `src/components/__tests__/RecentTransactions.test.tsx`
   - Renders 7 most recent non-transfer transactions
   - Excludes transfer transactions
   - Groups correctly under date dividers
   - Debit amounts render in red, credit in accent
   - Empty state renders when no transactions provided
   - "View all" click fires `onViewAll`

---

## CSS Variables Required

The following variables must already exist via the design-token story (#784); no new variables needed:

`--border`, `--border-strong`, `--accent`, `--accent-light`, `--accent-mid`, `--text`, `--muted`, `--subtle`, `--red`, `--surface-hover`, `--shadow-sm`, `--cat-groceries`, `--cat-transport`, `--cat-entertainment`, `--cat-utilities`, `--cat-healthcare`, `--cat-dining`, `--cat-shopping`

---

## Acceptance Criteria (from issue #791)

- [ ] Shows 7 most recent non-transfer transactions for the selected month(s)
- [ ] Emoji icon correct for each category (see table above)
- [ ] Debit amounts red, credit amounts accent green
- [ ] Date-group dividers with hairline rules appear correctly
- [ ] Old Largest Transactions widget is gone from Dashboard
- [ ] "View all" / "See all transactions" links navigate to `/transactions`
- [ ] Empty state shown when no transactions
