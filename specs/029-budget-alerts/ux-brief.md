# UX Brief — FA-BUDG-003 AlertBanner — Option A: Inline Status Bar with Category Chips

**Issue**: #734 — Restore budget-section data-testid on dashboard — Budget Summary Widget
**Designer decision**: Option A chosen by user
**Date**: 2026-05-21

---

## Component Overview

**Component name**: `AlertBanner`
**File**: `src/components/AlertBanner.tsx`
**CSS file**: `src/components/AlertBanner.css`
**CSS class prefix**: `alert-banner__*`

---

## Layout

The banner is a horizontal flex row (`display: flex; flex-direction: row; align-items: center`).

**Position**: Immediately below the top nav bar, above all dashboard/page content. It renders inside the app shell so it appears on every page when conditions are met.

**Three zones (left → right)**:

1. **Left** — warning icon + label
2. **Middle** — category chips row
3. **Right** — Dismiss button

---

## Visual Specification

### Banner Container

| Property      | Value                                                                      |
| ------------- | -------------------------------------------------------------------------- |
| Background    | `#1e1a0e`                                                                  |
| Border-bottom | `1px solid #78350f`                                                        |
| Layout        | `display: flex; flex-direction: row; align-items: center; flex-wrap: wrap` |
| Padding       | `0.5rem 1rem`                                                              |
| Gap           | `0.5rem`                                                                   |

### Left Zone — Icon + Label

- Icon: `⚠` (U+26A0, WARNING SIGN)
- Icon color: `#fbbf24` (amber)
- Label text: `"Budget alert"`
- Label color: `#fbbf24` (amber)
- Label font-weight: `600`

### Middle Zone — Category Chips

- One chip per over-threshold budget category
- Each chip shows: `"CategoryName XX%"` (category name + rounded integer percentage)
- Chips are laid out in a flex row with `flex-wrap: wrap` and `gap: 0.5rem`
- **Normal chip** (threshold met but ≤ 100%):
  - Background: `#78350f`
  - Text color: `#fde68a`
  - Border-radius: `9999px` (pill shape)
  - Padding: `0.125rem 0.5rem`
  - Font-size: `0.75rem`
  - CSS class: `alert-banner__chip`
- **Critical chip** (category is over 100%):
  - Additional CSS class: `alert-banner__chip--critical`
  - Background: `#7f1d1d`
  - Text color: `#fca5a5`

### Right Zone — Dismiss Button

- Text: `"Dismiss"`
- Border: `1px solid #78350f`
- Text color: `#f59e0b`
- Background: `transparent`
- Padding: `0.25rem 0.75rem`
- Border-radius: `0.25rem`
- Cursor: `pointer`
- CSS class: `alert-banner__dismiss`
- On hover: slight opacity reduction or background tint

---

## Behaviour

### Visibility

- The banner is shown **only** when at least one budget category meets or exceeds the user's alert threshold
- Threshold comes from `/api/preferences` response field `alertThreshold` (integer, default `80`)
- When no categories meet or exceed the threshold, the banner renders nothing (`return null`)

### Dismissal

- Clicking Dismiss sets a local React state flag (`dismissed = true`)
- **No `sessionStorage`, no `localStorage`** — dismissal state lives only in component state
- Once dismissed, the banner does not reappear until the user refreshes the page or navigates away and back (component remounts)

### Data Fetching

- Fetch `/api/preferences` and `/api/budgets/alerts` on component mount
- If either fetch fails silently, the banner does not render (non-critical)
- Use `alertThreshold` from preferences to filter which categories to show (the API may already filter, but the component should apply the threshold client-side as a safety net)

---

## Test IDs

| Element          | `data-testid`          |
| ---------------- | ---------------------- |
| Banner container | `alert-banner`         |
| Individual chip  | `alert-banner-chip`    |
| Dismiss button   | `alert-banner-dismiss` |

**Note**: The `data-testid="budget-section"` attribute must be present on the wrapping element of the `BudgetSummaryWidget` component in `DashboardPage.tsx` (separate from AlertBanner) for the e2e test assertion in `e2e/budget.spec.ts` to pass.

---

## Acceptance Criteria (from issue #734)

- `[data-testid="budget-section"]` is visible on the dashboard when budgets exist for the current month
- `[data-testid="budget-section"]` is NOT rendered when no budgets exist
- TypeScript build passes
- All existing unit tests pass

---

## Files to Create or Modify

| File                                             | Action                                                          |
| ------------------------------------------------ | --------------------------------------------------------------- |
| `src/components/AlertBanner.tsx`                 | Rewrite                                                         |
| `src/components/AlertBanner.css`                 | Rewrite                                                         |
| `src/components/budgets/BudgetSummaryWidget.tsx` | Create                                                          |
| `src/App.tsx`                                    | Modify — hoist BudgetProvider above route level                 |
| `src/pages/DashboardPage.tsx`                    | Modify — add `<BudgetSummaryWidget />` below GoalsSummaryWidget |

---

## Constraints

- Do not use `sessionStorage` or `localStorage` for the dismiss state — local React state only
- Do not add new npm packages
- All colours must use the exact hex values specified above (no CSS variables substitution that changes the appearance)
- Banner must appear on every page (inside the app shell), not only the Dashboard
