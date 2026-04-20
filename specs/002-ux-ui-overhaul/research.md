# Research: UX/UI Overhaul — Monarch Money Quality

**Branch**: `002-ux-ui-overhaul` | **Date**: 2026-04-21

---

## Decision: Icon Library

**Decision**: Use `lucide-react`  
**Rationale**: Tree-shakeable (only imported icons are bundled); consistent 16×16 stroke-based SVG icons matching design-system spec; MIT licence; well-maintained; used in adjacent Monarch Money-style projects.  
**Alternatives considered**: `@heroicons/react` (similar quality but slightly heavier bundle); inline SVG per component (already done for GearIcon in NavBar — inconsistent and verbose); unicode glyphs (current state — inaccessible, layout-unstable).

---

## Decision: Inter Font Delivery

**Decision**: Google Fonts `<link>` preconnect + stylesheet in `index.html`  
**Rationale**: Zero build configuration change; browser caches Inter across sites; all target browsers support CSS `font-display: swap`; simplest approach to get Inter into the app.  
**Alternatives considered**: `fontsource` npm package (adds to bundle size; requires import in CSS); system font stack (no Inter — fails design-system requirement); self-hosting (viable but adds build complexity for no user-facing benefit).

---

## Decision: CSS Token Delivery

**Decision**: Single `src/styles/tokens.css` file imported once in `main.tsx`; all design-system vars on `:root`  
**Rationale**: No pre-processor (Sass/Less) needed; CSS custom properties are natively supported in all target browsers; one import in entry point cascades to all components; easy to diff against `docs/design-system.md`.  
**Alternatives considered**: CSS-in-JS (breaks existing CSS file conventions and adds runtime overhead); Tailwind (requires full migration and build config change — out of scope); per-component token re-declaration (duplication risk, maintenance burden).

---

## Decision: Category Colour Mapping

**Decision**: Map known categories to design-system tokens and accent palette variants; derive unknown categories from a fixed palette of `--accent` tints.

Proposed mapping:

| Category              | Token                                         |
| --------------------- | --------------------------------------------- |
| Income                | `--positive`                                  |
| Groceries             | `--accent`                                    |
| Transport             | `#3b82f6` → use `--accent` shade              |
| Utilities             | `--warning`                                   |
| Dining                | `--negative` at reduced opacity (orange tint) |
| Entertainment         | `--accent-subtle` fill                        |
| Healthcare            | `--positive-subtle` fill                      |
| Shopping              | `--accent`                                    |
| Education             | `--accent-subtle`                             |
| Transfer              | `--text-muted`                                |
| Other / Uncategorised | `--text-muted`                                |

**Rationale**: Eliminates all hardcoded hex values; keeps semantic signal (Income = green, expenses = red/muted teal); stays within design-system colour space.  
**Alternatives considered**: Retaining hardcoded hex (violates FR-030); generating colours from category hash (unpredictable, potentially clashes with semantic colours).

---

## Decision: Mobile NavBar Pattern

**Decision**: CSS-only bottom tab bar using `position: fixed; bottom: 0; width: 100%` at `<640px`, hidden on desktop.  
**Rationale**: No JavaScript or routing changes needed; existing `NavLink` active-state classes work unchanged; add `padding-bottom: 56px` to app shell to prevent content overlap.  
**Alternatives considered**: Hamburger drawer (more complex JS state; worse for financial apps where all 5 destinations are equally important); collapsing top bar (insufficient space for 5 items at small sizes).

---

## Decision: UploadPage Panel Removal

**Decision**: Remove `MonthlySummary`, `TransactionTable`, `SpendingDonutChart`, `SpendByCategory`, `LargestTransactions`, `BudgetComparisonPanel`, and `CategoryRulesList` from `UploadPage.tsx`. Keep only: `CsvUpload`, `MonthToggleBar` (for existing month management), and upload status states.  
**Rationale**: These panels belong on Dashboard and Transactions pages where they have appropriate context. Having them on Upload creates 7 competing concerns with no clear hero. FR-017 is explicit.  
**Alternatives considered**: Keep panels but reorder (still too busy); move to a modal post-upload (modal too large for the data volume).

---

## Decision: tabular-nums Application

**Decision**: Apply `font-variant-numeric: tabular-nums` via a `.num` utility class in `base.css` and directly on `.summary-value`, `.monthly-amount`, and all currency `<span>` elements.  
**Rationale**: Prevents layout shift when numbers change (e.g., month switching); required by design-system rule; applies only where numbers are rendered.  
**Alternatives considered**: Apply globally to body (changes rendering of non-financial numbers like dates and IDs — over-broad).
