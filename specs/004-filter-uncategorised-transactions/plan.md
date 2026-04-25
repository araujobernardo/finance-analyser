# Implementation Plan: Filter Uncategorised Transactions

**Branch**: `004-filter-uncategorised-transactions` | **Date**: 2026-04-24 | **Spec**: [spec.md](spec.md)

---

## Summary

Add an "Uncategorised" option to the category filter dropdown on the Transactions page so that users can isolate transactions with no category assigned. The change is confined to `src/pages/TransactionsPage.tsx` — one new `<option>` element and two lines of updated filter logic. No data schema or localStorage changes are required.

---

## Technical Context

**Language/Version**: TypeScript (strict mode)
**Primary Dependencies**: React 18, Vite
**Storage**: Browser `localStorage` — no changes required for this feature
**Testing**: Vitest — co-located test file `src/pages/TransactionsPage.test.tsx`
**Target Platform**: Browser SPA (no server, no backend)
**Project Type**: Web application — frontend only
**Performance Goals**: Filter response is synchronous and in-memory; no performance concern at typical transaction volumes
**Constraints**: Component size limit 150 lines; strict TypeScript (no `any`); no new abstractions beyond what the task requires
**Scale/Scope**: Single file modification (`TransactionsPage.tsx`)

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Rule                                              | Status | Notes                                                      |
| ------------------------------------------------- | ------ | ---------------------------------------------------------- |
| No product assumptions — spec is silent           | PASS   | Spec fully defines the behaviour including edge cases      |
| No credential / secret exposure                   | PASS   | Feature is purely a filter UI — no secrets involved        |
| No localStorage schema modification               | PASS   | No new fields written to or read from localStorage         |
| Definition of Ready checked before implementation | PASS   | Enforced by delivery agent before Developer picks up story |
| Definition of Done checked before merge           | PASS   | Enforced by QA agent before PR merge                       |

**Post-design re-check**: No design decisions introduced anything that alters the above gates.

---

## Project Structure

### Documentation (this feature)

```text
specs/004-filter-uncategorised-transactions/
├── plan.md          ← this file
├── research.md      ← Phase 0 output
├── data-model.md    ← Phase 1 output
└── tasks.md         ← Phase 2 output (/speckit-tasks)
```

### Source Code

```text
src/
└── pages/
    ├── TransactionsPage.tsx     ← only file modified
    └── TransactionsPage.test.tsx ← tests added / extended here
```

No new files, no new directories, no new dependencies.

---

## Phase 0: Research

### Sentinel value for "uncategorised" filter state

**Decision**: Use the string `"__uncategorised__"` as the `filterCat` state value when the Uncategorised filter option is selected.

**Rationale**: The `filterCat` state is already typed as `string` (default `"all"`). Using a prefixed sentinel avoids collision with any user-defined category name and is unambiguous in code review. It keeps the existing `if (filterCat !== "all" && ...)` logic readable with a simple extension.

**Alternatives considered**:

- `null` — rejected: React controlled-component state for a `<select>` should remain a string, not null.
- `""` (empty string) — rejected: the per-row category `<select>` already uses `value=""` to represent an uncategorised transaction; reusing it in the filter state would be confusing.

### Filter logic change

Current (line 48 of `TransactionsPage.tsx`):

```ts
if (filterCat !== "all" && t.category !== filterCat) return false;
```

Replacement:

```ts
if (filterCat === "__uncategorised__") {
  if (t.category) return false; // has a category → exclude
} else if (filterCat !== "all" && t.category !== filterCat) {
  return false; // named category selected but doesn't match → exclude
}
```

The `if (t.category)` check correctly treats `null`, `undefined`, and `""` as "uncategorised" (all falsy) — matching the assumption in the spec.

Transfer transactions are already excluded before this check (`if (!showTransfers && t.isTransfer) return false;`), so they will never appear in the Uncategorised results regardless.

### Pre-existing ESLint errors in TransactionsPage.tsx

The committed version of `TransactionsPage.tsx` contains three `react-refresh/only-export-components` lint errors on the module-level utility constants `fmt`, `fmtMonth`, and `getCatColor`. These are pre-existing and will cause the pre-commit hook to fail on any commit touching this file. The Developer must fix them as part of this story — the appropriate fix per architecture guidelines is to move these three functions to `src/utils/transactionFormatters.ts` and import them in the page component.

---

## Phase 1: Data Model

### Data model changes

**None.** The `PfaTxn` and `PfaCategory` types are unchanged. No new fields are added. The localStorage key `pfa-v3-transactions` is not touched.

The only new "data" is the ephemeral UI state value `"__uncategorised__"` held in the `filterCat` React state variable — it is not persisted anywhere.

See [data-model.md](data-model.md) for the full entity reference.

---

## Implementation Stories

### Story 1 — Add "Uncategorised" option to category filter (UI)

**Files**: `src/pages/TransactionsPage.tsx`, `src/pages/TransactionsPage.test.tsx`
**Also required**: move `fmt`, `fmtMonth`, `getCatColor` to `src/utils/transactionFormatters.ts` and update the import — necessary to clear pre-existing ESLint errors that would otherwise block the pre-commit hook.

**Changes to `TransactionsPage.tsx`**:

1. Import the three formatter functions from the new utils file.
2. In the category `<select>`, add immediately after `<option value="all">All categories</option>`:
   ```tsx
   <option value="__uncategorised__">Uncategorised</option>
   ```
3. Replace the single-line category filter condition with the two-branch logic from the Research section above.

**Acceptance criteria**: All FR-001 through FR-006 from the spec, plus SC-001 through SC-005.

**Tests** (`TransactionsPage.test.tsx`):

- When "Uncategorised" is selected, only transactions with `category === null | "" | undefined` are rendered.
- When "Uncategorised" is selected, transactions with a named category are not rendered.
- Transfer transactions are not rendered when "Uncategorised" is selected (even if showTransfers is checked, since they have `isTransfer: true` and the transfer gate runs first).
- "Uncategorised" AND month filter: only uncategorised transactions in the selected month appear.
- "Uncategorised" AND search: further narrows correctly.
- Row count reflects the filtered results.
- Switching back to "All categories" restores the full (non-transfer-gated) list.
