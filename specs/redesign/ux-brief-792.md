# UX Brief — #792 Transactions Page Styling (Option A — Elevated Card Shell)

## Decision

The user selected **Option A**: two distinct elevated white card surfaces — a filter card above the table card — creating visual hierarchy between "controls" and "data".

## Mockup Reference

`specs/redesign/mockups/792-option-a.html`

---

## Layout Structure

```
Page (padding: 28px, gap: 16px, flex column)
├── Page header row (flex, space-between, align baseline)
│     ├── h1: "Transactions"  (24px, 800, var(--text))
│     └── span: "N rows"      (13px, 500, var(--muted))
├── Filter card   (white card, shadow-sm, 12px radius)
└── Table card    (white card, shadow-sm, 12px radius, flex 1, scrollable body)
```

---

## Page Header

- `h1.page-title`: `font-size: 24px; font-weight: 800; color: var(--text); line-height: 1.2`
- `.page-subtitle` (row count): `font-size: 13px; color: var(--muted); font-weight: 500`

---

## Filter Card

- **Container**: `background: var(--card); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-sm); padding: 14px 18px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap`
- **Row-count pill** (floats right via `margin-left: auto`): `font-size: 12px; font-weight: 600; color: var(--muted); background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px`

### Filter inputs and selects

- `background: var(--surface); border: 1.5px solid var(--border-strong); border-radius: 8px; padding: 7px 11px; font-size: 12px; font-family: Nunito; font-weight: 500`
- Focus: `border-color: var(--accent)` (transition 140ms)
- Search input: `width: 200px`

### Show Transfers checkbox label

- `font-size: 12px; color: var(--muted); font-weight: 500; display: flex; align-items: center; gap: 6px`
- Checkbox: `accent-color: var(--accent); width: 14px; height: 14px`

---

## Table Card

- **Container**: `background: var(--card); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-sm); flex: 1; overflow: hidden; display: flex; flex-direction: column`
- **Scroll wrapper** inside: `overflow-y: auto; flex: 1`
- `table { width: 100%; border-collapse: collapse; }`

### Table Header (sticky)

- `thead { position: sticky; top: 0; background: var(--card); z-index: 1; }`
- Header row: `border-bottom: 1px solid var(--border)`
- `th`: `font-size: 10px; font-weight: 700; color: var(--subtle); text-transform: uppercase; letter-spacing: 0.09em; padding: 11px 16px; text-align: left`
- Amount column `th`: `text-align: right`

### Table Rows

- `tbody tr`: `border-bottom: 1px solid var(--border); transition: background 120ms ease-out; cursor: pointer`
- Last row: `border-bottom: none`
- Hover: `background: var(--surface-hover)` (`#f0ece6`)
- `td`: `padding: 10px 16px; font-size: 13px`

### Column Specs

| Column       | Class         | Notes                                                                                                                                                                                                      |
| ------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date         | `.col-date`   | `font-family: JetBrains Mono; font-size: 11px; color: var(--muted); white-space: nowrap; width: 100px`                                                                                                     |
| Account      | `.col-acct`   | Account badge pill: `font-size: 11px; font-weight: 600; border-radius: 5px; padding: 2px 8px; border: 1px solid transparent` — color, bg, border per account color                                         |
| Payee / Memo | `.col-payee`  | `max-width: 260px`; payee name: `font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text)`; memo line: `font-size: 11px; color: var(--muted)` |
| Amount       | `.col-amount` | `font-family: JetBrains Mono; font-size: 13px; font-weight: 700; white-space: nowrap; text-align: right`; credit: `color: var(--accent)`; debit: `color: var(--red)`                                       |
| Category     | `.col-cat`    | `width: 150px`; see Category Select below                                                                                                                                                                  |

### Category Select

- `background: transparent; border: 1.5px solid var(--border); border-radius: 6px; padding: 3px 7px; font-size: 11px; font-family: Nunito; font-weight: 600; color: var(--text); transition: border-color 140ms`
- Focus: `border-color: var(--accent)`
- Category-tinted variants (border + text color):
  - Groceries: `#4a7c59`
  - Transport: `#2e6b8a`
  - Dining: `#b5541a`
  - Utilities: `#c07a1a`
  - Savings/Income: `var(--accent)` (`#0f9d8a`)

---

## Transfer Rows

- `tr.transfer-row`: `opacity: 0.6; background: color-mix(in srgb, var(--muted) 4%, transparent)`
- Hover: `background: color-mix(in srgb, var(--muted) 8%, transparent)`
- Payee area shows `⇔` icon in muted colour after payee name, and a muted italic "Transfer" label
- Category cell shows a `.transfer-tag` pill: `font-size: 11px; font-weight: 600; color: var(--muted); background: color-mix(in srgb, var(--muted) 10%, transparent); border: 1px solid color-mix(in srgb, var(--muted) 28%, transparent); border-radius: 5px; padding: 2px 8px`

---

## Design Token Reference

```css
--bg: #f4f1ed;
--surface: #faf8f5;
--card: #ffffff;
--border: #ede8e2;
--border-strong: #d9d2c8;
--accent: #0f9d8a;
--accent-light: #e8f5f3;
--text: #1e2a22;
--muted: #7a8074;
--subtle: #a09890;
--red: #c53030;
--surface-hover: #f0ece6;
--shadow-sm: 0 1px 3px rgba(30, 42, 34, 0.08);
```

---

## Acceptance Criteria (from issue #792, updated for Option A)

- [ ] Page header: "Transactions" h1 left + row count muted right
- [ ] Filter bar lives in its own white card with `shadow-sm` above the table
- [ ] Table lives in its own white card with rounded corners (`12px`) and sticky header
- [ ] Row-count pill floats in the filter card's right corner
- [ ] Table rows use `border-bottom` separators with `surface-hover` on hover
- [ ] Transfer rows shown at ~60% opacity with `⇔` icon and muted styling
- [ ] All existing filter interactions still work (search, month, account, category, show transfers)
- [ ] Category select still saves changes via PATCH /api/transactions/:id
- [ ] Transfer flagging/unflagging UI still works
- [ ] Existing Transactions page tests pass or are updated

## Files to Change

- `src/pages/TransactionsPage.tsx` (or equivalent)
- `src/pages/TransactionsPage.css` (or equivalent)
- Related test files
