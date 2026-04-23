# Implementation Plan: UX/UI Overhaul — Monarch Money Quality

**Branch**: `002-ux-ui-overhaul` | **Date**: 2026-04-21 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/002-ux-ui-overhaul/spec.md`

---

## Summary

A complete visual redesign of Finance Analyser across all 6 pages and shared components, migrating from an ad-hoc CSS variable system to the `docs/design-system.md` token set. The overhaul covers: Inter typography, dark-navy design tokens, NavBar rebuild to 56px/icon/accent-underline pattern, Import page simplification to a focused upload flow, Dashboard layout expansion to 1200px with 2-column panels, Transactions table cleanup (no zebra, SVG icons, proper empty states), Settings icon-button polish, Trends page card-wrapping. No business logic, data storage, or localStorage schema changes.

---

## Technical Context

**Language/Version**: TypeScript 5.x / React 18  
**Primary Dependencies**: Vite, React Router v6, Recharts, Vitest + React Testing Library  
**Storage**: localStorage (read-only for this feature — no schema changes per Golden Rule 3)  
**Testing**: Vitest + React Testing Library (`.test.tsx` files per component)  
**Target Platform**: Modern web browser (Chrome, Firefox, Safari, Edge); mobile-responsive at 375px+  
**Project Type**: Web application — single-page app (SPA)  
**Performance Goals**: No regressions — existing page load and render performance maintained  
**Constraints**: Zero localStorage schema changes; all visual changes only; must pass existing test suite  
**Scale/Scope**: 6 pages, ~25 components, 1 new `src/styles/` directory with 2 files

---

## Constitution Check

| Rule                                 | Status  | Notes                                                       |
| ------------------------------------ | ------- | ----------------------------------------------------------- |
| Never assume on product requirements | ✅ Pass | Spec is complete with 52 FRs and 10 SC metrics              |
| Never expose credentials or secrets  | ✅ Pass | Pure CSS/visual change — no env vars or credentials touched |
| Never modify localStorage schema     | ✅ Pass | No data model or storage changes — visual layer only        |
| Never skip DoR before implementation | ✅ Pass | Each story must pass DoR before Developer picks it up       |
| Never skip DoD before merging        | ✅ Pass | QA applies DoD to every PR per constitution                 |

**Gate result**: PASS. All golden rules satisfied. Proceed to Phase 0.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-ux-ui-overhaul/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output (entity summary — no new data)
└── tasks.md             ← Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
src/
├── styles/                         ← NEW directory
│   ├── tokens.css                  ← NEW: all design-system CSS custom properties
│   └── base.css                    ← NEW: Inter font, reset, shared utility classes
├── components/
│   ├── NavBar.tsx                  ← MODIFIED: height, icons, active state, account selector
│   ├── NavBar.css                  ← MODIFIED: full rewrite to design-system tokens
│   ├── ui/
│   │   ├── EmptyState.tsx          ← MODIFIED: ensure icon/heading/body/CTA structure
│   │   ├── EmptyState.css          ← MODIFIED: design-system tokens
│   │   ├── SkeletonCard.tsx        ← MODIFIED: pulse uses --bg-overlay
│   │   └── SkeletonCard.css        ← MODIFIED: design-system tokens + prefers-reduced-motion
│   ├── MonthlySummary.tsx          ← MODIFIED: card layout, --text-xl numbers, tabular-nums
│   ├── MonthlySummary.css          ← MODIFIED: design-system tokens
│   ├── LargestTransactions.tsx     ← MODIFIED: card wrapper, design tokens
│   ├── LargestTransactions.css     ← MODIFIED: design-system tokens
│   ├── MonthlyTrendChart.tsx       ← MODIFIED: chart colours/grid/tooltip tokens
│   ├── MonthlyTrendChart.css       ← MODIFIED: design-system tokens
│   ├── MonthToggleBar.tsx          ← MODIFIED: design-system tokens
│   ├── MonthToggleBar.css          ← MODIFIED: design-system tokens
│   ├── SpendByCategory.css         ← MODIFIED: design-system tokens
│   ├── SpendingDonutChart.css      ← MODIFIED: design-system tokens
│   ├── CategoryBadge.css           ← MODIFIED: design-system tokens
│   ├── BudgetComparisonPanel.css   ← MODIFIED: design-system tokens
│   ├── CategoryTrendChart.tsx      ← MODIFIED: chart styling tokens
│   ├── CategoryTrendChart.css      ← MODIFIED: design-system tokens
│   ├── MonthlySpendChart.css       ← MODIFIED: design-system tokens
│   ├── TransactionList.css         ← MODIFIED: design-system tokens
│   ├── TransactionTable.css        ← MODIFIED: design-system tokens
│   ├── CategoryRulesList.css       ← MODIFIED: design-system tokens
│   ├── DuplicateWarningModal.css   ← MODIFIED: design-system tokens
│   ├── AddAccountModal.css         ← MODIFIED: design-system tokens
│   ├── DeleteAccountModal.css      ← MODIFIED: design-system tokens
│   └── ChatPanel.css               ← MODIFIED: design-system tokens
├── pages/
│   ├── UploadPage.tsx              ← MODIFIED: remove data-review panels, focused flow
│   ├── UploadPage.css              ← NEW: upload-page specific styles with design tokens
│   ├── DashboardPage.tsx           ← MODIFIED: 1200px, 2-column layout, EmptyState, skeleton
│   ├── DashboardPage.css           ← MODIFIED: design-system tokens, 12-col grid
│   ├── TransactionsPage.tsx        ← MODIFIED: SVG sort icons, EmptyState, category tokens
│   ├── TransactionsPage.css        ← MODIFIED: remove zebra, design-system tokens
│   ├── SettingsPage.tsx            ← MODIFIED: icon buttons, active sidebar, remove placeholders
│   ├── SettingsPage.css            ← MODIFIED: design-system tokens, sidebar active state
│   ├── HistoryPage.tsx             ← MODIFIED: card wrappers, EmptyState, "Trends" rename
│   └── HistoryPage.css             ← MODIFIED (or NEW): card styles, design-system tokens
```

**Structure Decision**: Single-project SPA. The only new directory is `src/styles/` for the token and base CSS files. All other changes are modifications to existing `.tsx` and `.css` files. No new pages or routes are added.

---

## Phase 0: Research

See [research.md](./research.md) for full findings.

### Key Decisions

| Topic                   | Decision                                                   | Rationale                                                                                       |
| ----------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Icon library            | `lucide-react`                                             | Already used in adjacent projects; tree-shakeable; consistent 16px stroke icons; MIT licence    |
| Inter font delivery     | Google Fonts `<link>` in `index.html`                      | Simplest approach; no build config change; cached by browser across sites                       |
| Token delivery          | Single `src/styles/tokens.css` imported in `main.tsx`      | One source of truth; no pre-processor needed; CSS custom properties work in all target browsers |
| Category colour mapping | Map to design-system tokens + accent palette variants      | Avoids hardcoded hex; keeps semantic meaning (Income → `--positive`, etc.)                      |
| Mobile NavBar           | CSS-only bottom tab bar using `position: fixed; bottom: 0` | No new routing or JS needed; layout shift handled by bottom-padding on app shell                |

---

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md).

No new data entities. This feature is purely visual. The existing entities (Account, Transaction, CategoryRule, Budget) are unchanged. The only "model" addition is the CSS token system — a set of CSS custom property names documented in `src/styles/tokens.css`, which mirrors `docs/design-system.md`.

### UI Contracts (Component Interface)

The following component prop interfaces must remain stable (no breaking changes):

| Component           | Contract                               | Notes                                                     |
| ------------------- | -------------------------------------- | --------------------------------------------------------- |
| `EmptyState`        | `{ icon, message, ctaLabel?, ctaTo? }` | Existing props preserved; CSS updated only                |
| `SkeletonCard`      | `{ rows? }`                            | Existing props preserved; CSS updated only                |
| `MonthlySummary`    | `{ transactions, isLoading? }`         | Existing props preserved; layout/CSS updated              |
| `MonthlyTrendChart` | `{ data, selectedMonth }`              | Existing props preserved; chart colours updated via props |
| `NavBar`            | (no props)                             | Internal refactor; external interface unchanged           |
| `CsvUpload`         | `{ onFileSelected }`                   | Existing props preserved; CSS updated only                |

### Implementation Order (per user requirement)

The overhaul is broken into 8 implementation units delivered in strict dependency order:

```
Unit 1: Design tokens + base styles (src/styles/)   ← blocks everything
Unit 2: NavBar redesign                              ← shared by all pages
Unit 3: Shared UI components (EmptyState, Skeleton, btn/card utilities)
Unit 4: Import page redesign
Unit 5: Dashboard page redesign
Unit 6: Transactions page redesign
Unit 7: Settings page redesign
Unit 8: Trends page redesign
```

Each unit maps to one or more stories in `tasks.md`. Units 4–8 each depend on Units 1–3 being complete.

---

## Complexity Tracking

No constitution violations detected. No complexity justification required.
