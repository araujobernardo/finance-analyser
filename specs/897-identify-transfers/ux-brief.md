# UX Brief — Transactions: Add Identify Transfers Button

**Story**: #897
**Feature**: `897-identify-transfers`
**Chosen option**: Option A — Inline Expandable Strip
**Date**: 2026-06-01
**Impeccable audit score**: B+ (no P0/P1 findings; P2 — ambiguous pairs need clearer visual
differentiation from confirmed pairs; resolved by pre-unchecking + amber badge treatment)

---

## Summary

Add an "Identify Transfers" button to the Transactions page filter card, immediately
to the right of the "Auto-Categorise" button. When clicked, the button scans **all
transactions across all accounts** for candidate transfer pairs, then expands an inline
review strip directly below the filter card — no modal, no page navigation. The strip
lists matched pairs with checkboxes; the user clicks "Mark as Transfers" to confirm.

---

## Layout & Structure

### Filter card row (updated)

```
[ Search ] [ Month ▾ ] [ Account ▾ ] [ Category ▾ ] [ Show transfers ☐ ] [Auto-Categorise] [⇄ Identify Transfers] [N rows]
```

The "Identify Transfers" button is inserted **between** "Auto-Categorise" and the
`txn-row-count` pill. The pill remains the last element, pushed to `margin-left: auto`.

### Inline preview strip

The strip is a **direct sibling of `.txn-filter-card`**, rendered immediately below it.
It shares the same horizontal padding and left/right alignment as the filter card.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Filter card (unchanged)                                              │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────┐  [ Cancel ] [ Mark as Transfers ]│
│ │ Identified Transfer Pairs — N found                               │
│ │ Review both memos. Ambiguous pairs are pre-unchecked.             │
│ ├───────────────────────────────────────────────────────────────────┤
│ │ ☑ │ 1 Jun 2026  │ Casa: INTERNET BANKING TRANSFER TO SAVINGS     │ Confirmed │
│ │   │  $500.00    │ ↓                                               │           │
│ │   │             │ Savings: INTERNET BANKING TRANSFER FROM CASA    │           │
│ ├───────────────────────────────────────────────────────────────────┤
│ │ ☐ │ 22 May 2026 │ Cheque: PAYMENT                                │ Ambiguous │
│ │   │  $100.00    │ ↓                                               │           │
│ │   │             │ Credit Card: DIRECT CREDIT RECEIVED             │           │
│ └───────────────────────────────────────────────────────────────────┘
```

The strip attaches to the bottom of the filter card visually by:

- Removing the filter card's `border-radius` on its bottom two corners when the strip
  is open (add class `.txn-filter-card--strip-open` to toggle this).
- The strip itself has `border-radius: 0 0 12px 12px` (matching filter card's `12px` radius).
- Strip has `border-top: none` so it visually merges with the filter card above it.

When closed, the filter card returns to its full `border-radius: 12px` and the strip
is hidden (`display: none` or `height: 0` with `overflow: hidden`).

---

## Component Decisions

All values use design system tokens from `docs/design-system.md`.

### "Identify Transfers" button — `.txn-btn-identify-transfers`

Visually secondary to "Auto-Categorise" (which uses accent colour). The Identify
Transfers button uses a neutral outline treatment at rest and adopts accent styling
when the strip is open (active state).

| State               | Property        | Value                                                              |
| ------------------- | --------------- | ------------------------------------------------------------------ |
| Default             | `background`    | `transparent`                                                      |
| Default             | `color`         | `var(--text-secondary)`                                            |
| Default             | `border`        | `1px solid var(--border-default)`                                  |
| Default             | `border-radius` | `10px`                                                             |
| Default             | `padding`       | `8px 16px`                                                         |
| Default             | `font-size`     | `12px`                                                             |
| Default             | `font-weight`   | `600`                                                              |
| Default             | `white-space`   | `nowrap`                                                           |
| Default             | `transition`    | `background 140ms ease, border-color 140ms ease, color 140ms ease` |
| Hover               | `background`    | `var(--accent-subtle)`                                             |
| Hover               | `border-color`  | `var(--accent-muted)`                                              |
| Hover               | `color`         | `var(--accent)`                                                    |
| Active (strip open) | `background`    | `var(--accent-subtle)`                                             |
| Active (strip open) | `border-color`  | `var(--accent)`                                                    |
| Active (strip open) | `color`         | `var(--accent)`                                                    |
| Loading             | label text      | `"Identifying…"` (button disabled, no spinner)                     |
| Disabled (0 txns)   | `opacity`       | `0.45`                                                             |
| Disabled            | `cursor`        | `not-allowed`                                                      |

### Inline preview strip — `.txn-identify-strip`

| Property        | Value                             |
| --------------- | --------------------------------- |
| `background`    | `var(--bg-surface)`               |
| `border`        | `1px solid var(--border-default)` |
| `border-top`    | `none`                            |
| `border-radius` | `0 0 12px 12px`                   |

### Strip header — `.txn-identify-strip__header`

- Flex row, `justify-content: space-between`, `align-items: center`
- `padding: 12px 18px`
- `border-bottom: 1px solid var(--border-subtle)`
- Title: `font-size: 13px; font-weight: 700; color: var(--text-primary)`
- Subtitle: `font-size: 11px; color: var(--text-secondary); margin-top: 2px`

### Strip actions (top-right) — `.txn-identify-strip__actions`

Two buttons, flex row, `gap: 8px`:

**"Mark as Transfers"** — `.txn-identify-strip__btn-mark`

- `background: var(--accent)`
- `color: var(--text-inverse)`
- `border: none`
- `border-radius: 8px`
- `padding: 7px 14px`
- `font-size: 12px; font-weight: 700`
- Disabled (0 pairs checked): `opacity: 0.45; cursor: not-allowed`

**"Cancel"** — `.txn-identify-strip__btn-cancel`

- `background: transparent`
- `color: var(--text-secondary)`
- `border: 1px solid var(--border-default)`
- `border-radius: 8px`
- `padding: 7px 14px`
- `font-size: 12px; font-weight: 600`

### Pair list — `.txn-identify-strip__list`

- `max-height: 340px; overflow-y: auto`
- Each row: `.txn-identify-strip__pair-row`

### Pair row layout — `.txn-identify-strip__pair-row`

Flex row, `align-items: flex-start`, `gap: 12px`, `padding: 11px 18px`,
`border-bottom: 1px solid var(--border-subtle)`. Last row: no border.

Columns (left → right):

1. **Checkbox** — `width: 16px; height: 16px; accent-color: var(--accent); flex-shrink: 0; margin-top: 3px`
2. **Meta (date + amount)** — `.txn-identify-strip__pair-meta` — flex column, `width: 80px; flex-shrink: 0`
   - Date: `font-size: 11px; color: var(--text-secondary); font-weight: 500`
   - Amount: `font-size: 13px; color: var(--text-primary); font-weight: 700; font-variant-numeric: tabular-nums`
3. **Memo block** — `.txn-identify-strip__pair-memos` — flex column, `flex: 1; min-width: 0; gap: 4px`
   - Each memo line: account name (bold, `var(--text-primary)`) + memo text (italic, `var(--text-secondary)`, truncated)
   - Connector between the two lines: `↓` in `var(--accent)`, `font-size: 10px`
4. **Badge** — `.txn-identify-strip__badge` — `align-self: flex-start; flex-shrink: 0; margin-top: 2px`
   - `font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; white-space: nowrap`
   - Confirmed: `background: var(--accent-subtle); color: var(--accent)`
   - Ambiguous: `background: var(--warning-subtle); color: var(--warning)`

---

## Interaction Model

### Button click — "Identify Transfers"

1. If strip is already open → close it (toggle off). Button loses active style.
2. If strip is closed:
   a. Set loading state: button label → `"Identifying…"`, button disabled.
   b. Run the transfer-pair scan against **all `txns`** (not `filtered`).
   c. If 0 pairs found: show toast `"No transfer pairs found."`, do not open strip.
   d. If ≥1 pair found: open strip, populate pair list, button enters active state.
   e. Clear loading state.

### Transfer-pair scan algorithm

A pair is a candidate when:

- Same date
- Same absolute amount
- **Debit ↔ credit** across different accounts (`isCredit` differs, `accountShort` differs)
- Neither transaction already has `isTransfer === true`

Matching quality:

- **Confirmed** (pre-checked): payee/memo strings are same or one contains the other
  (case-insensitive), OR both contain a common transfer keyword (`"transfer"`, `"trf"`,
  `"tfr"`, `"internet banking"`, `"direct credit"`, `"direct debit"`).
- **Ambiguous** (pre-unchecked): all other candidates (same date + amount + debit↔credit,
  but payee/memo do not meet the confirmed threshold above).

When multiple transactions share the same date and amount on one side, each is presented
as a separate row — never auto-merged.

Scan always uses **all transactions** (the `txns` array after local overrides, not the
`filtered` array). This ensures transfers from months not visible in the current filter
are also found.

### Strip: "Mark as Transfers"

1. Collect all checked pairs.
2. Disable the button, change label to `"Marking…"`.
3. For each transaction in each checked pair, call:
   ```
   PATCH /api/transactions/:id  { isTransfer: true }
   ```
   All PATCHes fired in parallel via `Promise.all`.
4. On success:
   - Call `refetch()`.
   - Close the strip.
   - Show toast: `"Marked N transfer pair(s)."` (N = number of confirmed pairs).
   - Toast auto-dismisses after 4 000 ms.
5. On any error:
   - Show error toast: `"Failed to mark transfers — please try again."`.
   - Strip remains open; button re-enables.
   - Toast auto-dismisses after 4 000 ms.

### Strip: "Cancel"

Close strip immediately, discard all checkbox state. No API calls.
Button on filter card loses active style.

### Keyboard: Escape

When strip is open, pressing Escape closes it (no API calls). Reuse the existing
`handleEscape` listener — add `if (identifyStripOpen) setIdentifyStripOpen(false)`.

### "Mark as Transfers" disabled state

"Mark as Transfers" is disabled when:

- Zero pairs are checked, OR
- A PATCH request is in flight.

### Empty state (0 rows)

When the page is in empty state (`txns.length === 0`), the "Identify Transfers" button
is not rendered (same rule as "Auto-Categorise").

---

## Copy

| Element                 | Text                                                                      |
| ----------------------- | ------------------------------------------------------------------------- |
| Button (default)        | `⇄ Identify Transfers`                                                    |
| Button (loading)        | `Identifying…`                                                            |
| Strip title (N > 0)     | `Identified Transfer Pairs — N found`                                     |
| Strip subtitle          | `Review both memos before confirming. Ambiguous pairs are pre-unchecked.` |
| Confirmed badge         | `Confirmed`                                                               |
| Ambiguous badge         | `Ambiguous`                                                               |
| Mark button             | `Mark as Transfers`                                                       |
| Mark button (in-flight) | `Marking…`                                                                |
| Cancel button           | `Cancel`                                                                  |
| Success toast           | `Marked N transfer pair(s).`                                              |
| Failure toast           | `Failed to mark transfers — please try again.`                            |
| No-pairs toast          | `No transfer pairs found.`                                                |

The `⇄` character (U+21C4) is used in the button label as a lightweight icon — no SVG
dependency. If font rendering is inconsistent, replace with the plain word "Identify Transfers".

---

## State Additions to `TransactionsPage`

```ts
// Whether the identify-transfers strip is currently open
const [identifyStripOpen, setIdentifyStripOpen] = useState(false);

// Whether the scan/PATCH is in flight
const [isIdentifying, setIsIdentifying] = useState(false);

// Pair list produced by the scan
interface TransferPair {
  txnA: AdaptedTxn; // debit side
  txnB: AdaptedTxn; // credit side
  isConfirmed: boolean;
}
const [transferPairs, setTransferPairs] = useState<TransferPair[]>([]);

// Per-pair checked state (keyed by a stable pair id = `${txnA.id}:${txnB.id}`)
const [checkedPairs, setCheckedPairs] = useState<Set<string>>(new Set());
```

---

## File Touchpoints

| File                                  | Change                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/TransactionsPage.tsx`      | Add state (`identifyStripOpen`, `isIdentifying`, `transferPairs`, `checkedPairs`); add `handleIdentifyTransfers` handler; add `handleMarkTransfers` handler; extend `handleEscape` to close strip; add `.txn-filter-card--strip-open` class toggle; add "Identify Transfers" button JSX; add strip JSX (conditional render below filter card) |
| `src/pages/TransactionsPage.css`      | Add `.txn-btn-identify-transfers` (all states); add `.txn-filter-card--strip-open` (removes bottom border-radius); add `.txn-identify-strip` and all child classes                                                                                                                                                                            |
| `src/pages/TransactionsPage.test.tsx` | New test cases for button, scan, strip, mark, cancel, Escape, edge cases                                                                                                                                                                                                                                                                      |

No new files required. The pair-scanning logic is implemented inline in `handleIdentifyTransfers`
inside `TransactionsPage.tsx` — do not add a new utility file unless the function exceeds 60 lines
and the Delivery Lead approves the extraction.

---

## Constraints

### Responsive

- On viewports ≤ 640 px, the filter card already wraps. The strip should remain full-width
  and the pair rows may stack (memo block truncates to one line per account).
- The "Identify Transfers" button must have `white-space: nowrap` to prevent label breaking.
- The strip header actions ("Cancel" / "Mark as Transfers") may wrap to a second line on
  very narrow viewports — use `flex-wrap: wrap; gap: 8px` on `.txn-identify-strip__actions`.

### Accessibility

- The strip open/close state must toggle `aria-expanded` on the "Identify Transfers" button.
- Each pair row checkbox must have an accessible label: use `aria-label` of
  `"Transfer pair: {amount} on {date} — {accountA} and {accountB}"`.
- Focus management: when strip opens, move focus to the strip's first checkbox.
  When strip closes (Cancel or Escape), return focus to the "Identify Transfers" button.
- The pair list's `max-height: 340px` overflow region must have `role="region"` and
  `aria-label="Transfer pairs list"` for screen-reader context.

### Existing code constraints

- The scan uses `txns` (with local overrides applied), **not** `filtered`, so pairs from
  filtered-out months are still detected.
- Already-marked transfers (`isTransfer === true` in `txns`) are excluded from the scan.
- The existing `flagMode` (manual click-to-pair interaction) continues to work
  independently. If `flagMode` is active when the button is clicked, cancel `flagMode`
  first before opening the strip.
- Do not change the `toast` state shape — it is already `{ message: string; isError?: boolean }`.
- No changes to `src/utils/transferFlagging.ts` — the new scan algorithm is separate.
- No new API routes. `PATCH /api/transactions/:id` with `{ isTransfer: true }` is the
  existing endpoint.

### Impeccable audit findings resolved

- **P2 — ambiguous vs confirmed differentiation**: resolved by pre-unchecking ambiguous
  pairs and using amber (`var(--warning)` / `var(--warning-subtle)`) for the badge,
  contrasted with teal (`var(--accent)` / `var(--accent-subtle)`) for confirmed pairs.
- **P2 — strip merge with filter card**: resolved by removing bottom border-radius on
  the filter card when strip is open, creating a seamless joined-card appearance.

---

## Acceptance Criteria

| ID    | Criterion                                                                                                                             |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1  | "Identify Transfers" button is present in the filter card, after "Auto-Categorise"                                                    |
| AC-2  | Clicking the button scans all `txns` (not just `filtered`) across all accounts                                                        |
| AC-3  | Candidate pairs are matched on: same date, same absolute amount, debit↔credit, different accounts, neither already `isTransfer: true` |
| AC-4  | Confirmed pairs (payee/memo match threshold met) are pre-checked                                                                      |
| AC-5  | Ambiguous pairs are pre-unchecked and show the amber "Ambiguous" badge                                                                |
| AC-6  | If 0 pairs found: toast "No transfer pairs found." shown; strip does not open                                                         |
| AC-7  | If ≥1 pair found: inline strip opens below filter card; filter card loses bottom radius                                               |
| AC-8  | "Mark as Transfers" PATCHes all checked pairs with `{ isTransfer: true }`                                                             |
| AC-9  | After marking: `refetch()` is called, strip closes, success toast shown                                                               |
| AC-10 | On PATCH failure: error toast shown, strip remains open                                                                               |
| AC-11 | "Cancel" closes strip with no API calls                                                                                               |
| AC-12 | Escape key closes the strip when open                                                                                                 |
| AC-13 | Button shows "Identifying…" and is disabled while scan is in progress                                                                 |
| AC-14 | "Mark as Transfers" is disabled when 0 pairs are checked                                                                              |
| AC-15 | `tsc --noEmit` passes with zero errors                                                                                                |
| AC-16 | No regressions on existing filter, Auto-Categorise, or manual transfer-flagging functionality                                         |

---

## Impeccable Commands for Developer

Run these in order after implementation:

1. `/impeccable polish src/pages/TransactionsPage.tsx` — alignment pass against the design system (token usage, spacing, font-size consistency).
2. `/impeccable harden src/pages/TransactionsPage.tsx` — verify edge cases: 0 pairs found, all pairs ambiguous, 1 pair only, PATCH error mid-flight, strip open when `flagMode` is active.
3. `/impeccable typeset` on the strip header and pair row typography — confirm scale
   (11px / 12px / 13px hierarchy) matches the filter card's existing type rhythm.
