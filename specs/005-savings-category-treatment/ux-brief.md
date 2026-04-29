# UX Brief: Savings Category Visual Treatment

**Issue**: #113 — Phase 3, User Story 1  
**Feature**: `005-savings-category-treatment`  
**Decision date**: 2026-04-29  
**Chosen option**: **B — Badge Only**

---

## Decision

Option B was selected by the product owner. The category badge is the sole carrier of the green signal. No row-level border or background change is applied.

---

## Rationale

- Minimum code surface — one CSS rule, one conditional class, one colour map entry.
- Row-level changes (borders, tints) create visual noise for a category that appears alongside dozens of expense rows. A badge modifier keeps the signal tight and legible.
- The `.tag` primitive already exists in the UI (used by the Transfer badge in `TransactionsPage.tsx`). The savings modifier layers on top of that established pattern without introducing a new component.
- Avoids the risk of green row backgrounds clashing with the dark-mode card surface (`--card: #111e33`) in edge-case density layouts.

---

## Visual Specification

### Category Badge — `.category-badge--savings`

The `<span className="tag category-badge--savings">` element used to display the "Savings" category label must render with:

| Property       | Value                                                        |
| -------------- | ------------------------------------------------------------ |
| `color`        | `var(--colour-savings)` → resolves to `#10b981`              |
| `background`   | `color-mix(in srgb, var(--colour-savings) 10%, transparent)` |
| `border-color` | _(not changed — inherits `.tag` transparent border)_         |

No border-color override is needed; the tinted background is sufficient contrast on the dark card surface.

**CSS rule** (add to `src/pages/TransactionsPage.css`):

```css
.category-badge--savings {
  color: var(--colour-savings);
  background: color-mix(in srgb, var(--colour-savings) 10%, transparent);
}
```

### SpendByCategory — Colour Map Entry

Add `"Savings": "#10b981"` to the `CATEGORY_COLOURS` record in `src/components/SpendByCategory.tsx`. Remove any existing `"Savings & Transfers"` key if present.

This ensures the dashboard category breakdown chart swatch and bar segment match the badge colour exactly.

### What Does NOT Change

| Element                      | Behaviour                        |
| ---------------------------- | -------------------------------- |
| Transaction row background   | Unchanged (`var(--card)`)        |
| Transaction row border       | No new border applied            |
| Transfer rows                | Unaffected (rendered separately) |
| Amount colour (credit/debit) | Unchanged (`--accent` / `--red`) |

---

## Implementation Touchpoints

| File                                 | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/TransactionsPage.css`     | Add `.category-badge--savings` rule (see above)                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/pages/TransactionsPage.tsx`     | On the category cell, render `<span className="tag category-badge--savings">Savings</span>` when `transaction.category === "Savings"`, instead of (or alongside) the `txn-cat-select` dropdown. If the existing select must be preserved for editability, apply `category-badge--savings` to a wrapper span or adjust the select's inline style to use `var(--colour-savings)`. _(Developer to confirm preferred pattern given the current `<select>` implementation.)_ |
| `src/components/SpendByCategory.tsx` | Add `"Savings": "#10b981"` to `CATEGORY_COLOURS`; remove `"Savings & Transfers"` key                                                                                                                                                                                                                                                                                                                                                                                    |

> **Note for Developer**: The current implementation renders the category column as a `<select className="txn-cat-select">` for non-transfer rows (with colour applied via inline `style`). The `.category-badge--savings` modifier class described in the issue and tasks can be applied to a wrapper `<span>` or the select itself, or the existing inline-style approach can be extended with `var(--colour-savings)` directly. Either approach satisfies Option B as long as no row-level background or border change is introduced and the green token is used rather than a hardcoded hex value in TSX.

---

## Acceptance Criteria (Option B scope)

1. A transaction with `category === "Savings"` displays its category label in green (`var(--colour-savings)`) on the Transactions page.
2. The green treatment is confined to the category indicator only — no change to the row background, row border, or amount colour.
3. The Dashboard SpendByCategory chart renders the "Savings" entry with a green swatch and bar segment (`#10b981`).
4. Zero hardcoded hex values introduced by this feature in any TSX or CSS file — only `var(--colour-savings)` (in CSS) and `"#10b981"` in the `CATEGORY_COLOURS` data map (which cannot use CSS variables).
5. The visual treatment is identical for both manually-assigned and auto-detected Savings transactions.

---

## Out of Scope (explicitly excluded by Option B)

- Row-level green background tint
- Row-level green left-border accent
- Any animation or transition on the badge
- Changes to the Transfer badge appearance
