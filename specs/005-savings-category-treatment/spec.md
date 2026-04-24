# Feature Specification: Savings Category — Rename and Visual Treatment

**Feature Branch**: `005-savings-category-treatment`
**Created**: 2026-04-24
**Status**: Draft

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Savings transactions appear green (Priority: P1)

A user views the Transactions page and sees any transaction categorised as "Savings" rendered in green rather than the standard red/orange expense colour. The green colour signals that the money is going to a personal investment or savings account — it is leaving this tracked account but is not a real expense. The green treatment applies to the category badge/chip, the row accent, and anywhere the category is displayed.

**Why this priority**: The visual distinction is the core value of this feature. Without it, the rename alone provides no meaningful benefit to the user.

**Independent Test**: Open the Transactions page with at least one transaction categorised as "Savings" → confirm the row, category badge, and any related accent are displayed in green, not the expense colour.

**Acceptance Scenarios**:

1. **Given** the Transactions page is shown, **When** a transaction has category "Savings", **Then** its category badge/chip is rendered in green.
2. **Given** the Transactions page is shown, **When** a transaction has category "Savings", **Then** its row accent (left border or background tint) is rendered in green, visually distinguishing it from expense rows.
3. **Given** the Dashboard is shown, **When** "Savings" transactions are present, **Then** any summary display (e.g., category breakdown, totals section) renders the "Savings" entry in green.
4. **Given** a transaction has category "Savings", **When** it is visible anywhere in the UI, **Then** it is never displayed with the expense colour (red/orange).

---

### User Story 2 — Category renamed from "Savings & Transfers" to "Savings" (Priority: P1)

A user sees the label "Savings" everywhere the old "Savings & Transfers" label previously appeared — in the transaction list, category dropdowns, category badges, dashboard summaries, and any filter controls. No occurrence of the old name remains visible.

**Why this priority**: The rename must ship alongside the visual treatment; showing green for a label still called "Savings & Transfers" would be confusing and inconsistent.

**Independent Test**: Search the entire UI for the text "Savings & Transfers" → it must not appear anywhere. All previous occurrences now read "Savings".

**Acceptance Scenarios**:

1. **Given** the Transactions page is shown, **When** a transaction previously had category "Savings & Transfers"**, Then** the displayed category label reads "Savings".
2. **Given** the category dropdown or filter control is open, **When** the user browses categories, **Then** "Savings" appears in the list and "Savings & Transfers" does not.
3. **Given** the Dashboard is shown, **When** the category breakdown includes savings transactions, **Then** the category is labelled "Savings", not "Savings & Transfers".
4. **Given** existing data in storage contains transactions with category value `"Savings & Transfers"`, **When** the app loads, **Then** those transactions display as "Savings" with no manual migration required by the user.

---

### Edge Cases

- What happens to existing transactions stored with category `"Savings & Transfers"` in localStorage? The app must recognise the old value and display it as "Savings" automatically on load — no user action required.
- What if both the old and new category values coexist in stored data (e.g., data from before and after the rename)? Both must be treated identically as "Savings" in all displays and logic.
- What if a user manually typed "Savings & Transfers" as a custom category? It must still be displayed as "Savings" and rendered green.
- What happens if the green colour token is not defined in the theme? The fallback must be a reasonable green, not the expense colour.

---

## Requirements _(mandatory)_

### Functional Requirements

**Rename**

- **FR-001**: Every occurrence of the display label "Savings & Transfers" in the UI MUST be replaced with "Savings".
- **FR-002**: The canonical category string used in application logic MUST be updated from `"Savings & Transfers"` to `"Savings"` wherever it is hardcoded (feature flag checks, transfer-detection logic, flag/unflag handlers, default category assignments).
- **FR-003**: Existing transactions stored in localStorage with `category: "Savings & Transfers"` MUST be recognised and treated as `"Savings"` without requiring the user to re-import or edit data. A normalisation step on load (or a read-time alias) is acceptable.
- **FR-004**: The Manual Transfer Flagging feature (branch `003-manual-transfer-flagging`) sets `category: "Savings & Transfers"` on flagged pairs; this value MUST be updated to `"Savings"` in that feature's code so newly flagged transactions use the new name.

**Visual Treatment**

- **FR-005**: Any transaction with category "Savings" MUST display its category badge/chip in green.
- **FR-006**: Any transaction row with category "Savings" MUST display its row accent (e.g., left border or background tint) in green.
- **FR-007**: Anywhere the "Savings" category appears in a dashboard summary, totals breakdown, or category list, the colour indicator for that category MUST be green.
- **FR-008**: The green colour MUST be applied via a CSS design token (e.g., `var(--colour-savings)` or `var(--colour-positive)`); no hardcoded hex values.
- **FR-009**: The green treatment MUST apply consistently regardless of whether the transaction was manually flagged or auto-detected as a transfer.

**Exclusion from Expense Totals (preserved)**

- **FR-010**: "Savings" transactions MUST continue to be excluded from expense totals and spend calculations — this behaviour is unchanged from the existing transfer exclusion logic.

### Key Entities

- **Category value**: The string stored on `PfaTxn.category`. Canonical value changes from `"Savings & Transfers"` to `"Savings"`. Both values must resolve to the same treatment during the migration window.
- **CSS design token**: A new or repurposed `var(--*)` token for the savings/positive green colour, used across all affected components.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero occurrences of the text "Savings & Transfers" remain visible anywhere in the application UI after the change ships.
- **SC-002**: 100% of transactions with category "Savings" (including those previously stored as "Savings & Transfers") are rendered with green colour treatment — no regression to expense colour.
- **SC-003**: Existing localStorage data containing `"Savings & Transfers"` loads and displays correctly as "Savings" without any user intervention.
- **SC-004**: The green colour is defined via a CSS token; a grep of all modified CSS/TSX files finds zero hardcoded green hex values introduced by this feature.

---

## Assumptions

- The app is a single-page TypeScript + React application; all state lives in localStorage under `pfa-v3-transactions`.
- "Savings & Transfers" is the only category name requiring a rename; no other categories are in scope.
- The green visual treatment applies to the single canonical "Savings" category; it does not apply to any other category.
- The existing transfer exclusion logic (`isTransfer: true`) is the mechanism that keeps savings transactions out of expense totals; this logic is not modified.
- A read-time normalisation (aliasing `"Savings & Transfers"` → `"Savings"` when loading from storage) is preferable to a destructive one-time migration, as it is safer and requires no schema version bump.
- The Dashboard currently uses the category string to colour-code entries; the green token will slot into the same colour-mapping mechanism.
- No backend or API changes are required — this is a purely client-side change.
