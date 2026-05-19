# Tasks: FA-BUDG-002 — Budget vs Actual Spend Comparison View

**Input**: Design documents from `specs/028-budget-vs-actual/`
**Branch**: `028-budget-vs-actual`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to
- This feature spans `src/server/routes/`, `src/server/utils/`, `src/context/`, `src/pages/`, `src/components/budgets/`, `src/types/api.ts`, `src/App.tsx`, `src/components/Sidebar.tsx`, and `src/server/index.ts`

---

## Phase 2: Foundational — Shared Types + Spend Utility (Blocking Prerequisites)

**Goal**: Add the three TypeScript API interfaces and the budget-period spend calculation utility that every route file and context depends on. Both tasks are independent of each other (different files) and must complete before any route or UI work begins.

**Independent Test**: Confirm `ApiBudget`, `ApiBudgetDefault`, and `ApiUserPreferences` are exported from `src/types/api.ts`. Confirm `calculateBudgetSpend` is importable from `src/server/utils/calculateBudgetSpend.ts` and returns `0` when called with a category that has no matching transactions; returns the correct absolute-value sum of negative non-transfer transactions within the date range when matching rows exist.

- [ ] T001 Add `ApiBudget`, `ApiBudgetDefault`, and `ApiUserPreferences` interfaces to `src/types/api.ts` — after the existing `ApiGoal` interface, add exactly the three interfaces from `specs/028-budget-vs-actual/data-model.md` TypeScript Types section: `ApiBudget { id, categoryName, year, month, limitAmount, actualSpend, remaining, percentageUsed }`, `ApiBudgetDefault { id, categoryName, limitAmount }`, `ApiUserPreferences { id, monthStartDay }` — all numeric amounts as `number` (pre-parsed from Drizzle numeric strings before response serialisation)
- [ ] T002 [P] Create `src/server/utils/calculateBudgetSpend.ts` — export `async function calculateBudgetSpend(userId: string, categoryName: string, year: number, month: number, monthStartDay: number, db: DrizzleDb): Promise<number>`; compute `startDate = new Date(year, month - 1, monthStartDay)` and `endDate = new Date(year, month, monthStartDay - 1)` (JS Date overflow handles month boundary crossings); query `transactions` table for rows WHERE `userId = userId AND category = categoryName AND amount < 0 AND isTransfer = false AND date >= startDate AND date <= endDate`; return `parseFloat(SUM(ABS(amount)))` or `0` if no rows match — follow the `computeAccountBalance` utility pattern from FA-NW-004

**Checkpoint**: `ApiBudget`, `ApiBudgetDefault`, `ApiUserPreferences` exported from `src/types/api.ts`. `calculateBudgetSpend` importable and returning correct values. Ready for route and UI work.

---

## Phase 3: User Story 1 — Budget Overview for Current Month (Priority: P1) 🎯 MVP

**Goal**: Display all budgets for the selected month with actual spend, remaining amount, percentage used, and a colour-coded progress bar. The page defaults to the current month on load and uses the user's configured monthStartDay for period calculation.

**Independent Test**: Set up budgets for three categories (one at 50% spend, one at 90%, one at 120%) with matching transactions in the current budget period. Open the Budget page — each row shows the correct limit, actual spend, remaining (negative when over), percentage, and the correct bar colour (green/amber/red). Confirm transfer transactions are excluded. Confirm a category with no transactions shows 0 spent, full remaining, 0%, green.

- [ ] T003 [US1] Create `src/server/routes/budgets.ts` — export `budgetsRouter` using `Router()`, apply `authenticateToken` middleware to all routes, implement `GET /` that: (1) validates `year` and `month` query params (400 if missing or invalid); (2) fetches user's `monthStartDay` from `user_preferences` (default 1 if no row); (3) fetches all budgets for `(userId, year, month)`; (4) if count is 0, queries `budget_defaults` for userId and bulk-inserts one budget per default using `onConflictDoNothing` on the unique index `(userId, categoryName, year, month)`, then re-fetches; (5) for each budget row calls `calculateBudgetSpend(userId, categoryName, year, month, monthStartDay, db)`; (6) computes `remaining = limitAmount - actualSpend` and `percentageUsed` (see data-model.md edge cases: 100 when limit=0 and spend>0, 0 when both are 0); (7) returns `ApiBudget[]` — import `budgets`, `budgetDefaults`, `userPreferences` tables from `../../db/schema.ts`
- [ ] T004 [US1] Register `budgetsRouter` in `src/server/index.ts` — add `import { budgetsRouter } from "./routes/budgets.ts"` and `app.use("/api/budgets", budgetsRouter)` after the existing `app.use("/api/goals", goalsRouter)` line
- [ ] T005 [US1] Create `src/context/BudgetContext.tsx` — follow the exact `GoalsContext.tsx` pattern: `useApi`, `useToast`, `useState`, `useEffect`; expose `{ budgets: ApiBudget[], selectedYear: number, selectedMonth: number, loading: boolean, setSelectedMonth: (year: number, month: number) => void }`; initialise `selectedYear`/`selectedMonth` to current year/month; fetch `GET /api/budgets?year=Y&month=M` on mount and whenever `selectedYear`/`selectedMonth` change; export `BudgetProvider`, `useBudgets` hook, and `BudgetContext`
- [ ] T006 [US1] Create `src/components/budgets/BudgetRow.tsx` — accepts `budget: ApiBudget` prop; renders one row with: category name, limit (NZD formatted via `Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" })`), actual spend (NZD), remaining (NZD; show "–$X.XX over" when negative), percentage used (e.g. "72%" or "150%"), and a horizontal progress bar `<div>` with a filled inner div whose `className` is `bar-green` when `percentageUsed < 80`, `bar-amber` when `< 100`, `bar-red` when `>= 100`; width of inner div clamped at 100% visually (even if percentageUsed > 100)
- [ ] T007 [P] [US1] Create `src/components/budgets/BudgetRow.css` — define `.budget-row`, `.bar-track` (container), `.bar-fill` (inner div), `.bar-green { background: var(--colour-success, #22c55e) }`, `.bar-amber { background: var(--colour-warning, #f59e0b) }`, `.bar-red { background: var(--colour-danger, #ef4444) }`; `.bar-fill { max-width: 100%; height: 8px; border-radius: 4px; transition: width 0.3s ease }`
- [ ] T008 [US1] Create `src/pages/BudgetPage.tsx` — consumes `useBudgets()`; renders: page heading "Budget", a summary row showing total limit vs total actual spend across all categories (NZD formatted), a list of `<BudgetRow>` for each budget, and an empty-state `<p>` with a prompt to add the first budget when `budgets.length === 0`; import `BudgetRow` from `../components/budgets/BudgetRow`
- [ ] T009 [US1] Add `/budget` route to `src/App.tsx` — import `BudgetProvider` from `./context/BudgetContext` and `BudgetPage` from `./pages/BudgetPage`; inside the authenticated layout section (matching the pattern for `/goals`), add `<Route path="/budget" element={<BudgetProvider><BudgetPage /></BudgetProvider>} />`
- [ ] T010 [P] [US1] Add Budget nav entry to `src/components/Sidebar.tsx` — in the `NAV` array, insert `{ path: "/budget", icon: "◧", label: "Budget" }` between the Goals entry and the Settings entry

**Checkpoint**: `/budget` page renders for the current month. Budget rows display correct spend, remaining, percentage, and colour. Empty state shows when no budgets exist. Navigation link is visible in the sidebar.

---

## Phase 4: User Story 2 — Create, Edit, and Delete Budgets (Priority: P2)

**Goal**: Allow the user to add a new budget for any category+month, update an existing limit, and delete a budget — all from the Budget page without a full reload.

**Independent Test**: On the Budget page, open the Add Budget modal and create a budget for "Dining" at $300 for the current month — the row appears immediately. Edit the limit to $400 — the row updates. Delete the "Dining" budget — the row disappears. Attempt to create a second budget for "Dining" in the same month — the system shows an error (duplicate rejected).

- [ ] T011 [US2] Add `POST /`, `PATCH /:id`, and `DELETE /:id` handlers to `src/server/routes/budgets.ts` — `POST /`: Zod schema `{ categoryName: z.string().min(1).max(100), year: z.number().int(), month: z.number().int().min(1).max(12), limitAmount: z.number().min(0) }`; insert into `budgets`; on unique-constraint violation return 409; calculate spend and return `ApiBudget` with status 201; `PATCH /:id`: Zod schema `{ limitAmount: z.number().min(0) }`; update where `id = params.id AND userId = userId`; recalculate spend; return updated `ApiBudget` or 404; `DELETE /:id`: delete where `id = params.id AND userId = userId`; return 204 or 404
- [ ] T012 [US2] Add `addBudget`, `updateBudget`, `deleteBudget` operations to `src/context/BudgetContext.tsx` — `addBudget(data: { categoryName, year, month, limitAmount })`: POST to `/api/budgets`, on success append the returned `ApiBudget` to `budgets` state; `updateBudget(id, limitAmount)`: PATCH to `/api/budgets/:id`, on success replace the matching item in `budgets` state; `deleteBudget(id)`: optimistic removal (filter `budgets` state immediately), DELETE to `/api/budgets/:id`, restore on error — use `useToast` for error feedback; update `BudgetContextValue` interface to include the three new functions
- [ ] T013 [P] [US2] Create `src/components/budgets/AddBudgetModal.tsx` — modal dialog matching existing modal patterns (find an existing modal component for the exact className/structure pattern); fields: category name (text input), limit amount (number input ≥ 0), month (number 1–12, pre-populated from `selectedMonth`), year (number, pre-populated from `selectedYear`); on submit calls `addBudget()` from `useBudgets()` and closes modal; shows validation errors inline
- [ ] T014 [US2] Wire CRUD actions into `src/pages/BudgetPage.tsx` and `src/components/budgets/BudgetRow.tsx` — in `BudgetPage`: add state for modal open/close, render `<AddBudgetModal>` conditionally, render a "+ Add Budget" button that sets open state to true; in `BudgetRow`: add Edit button (inline limit-amount input that submits via `updateBudget()`) and Delete button (calls `deleteBudget(id)` after confirmation); import `AddBudgetModal` in `BudgetPage`

**Checkpoint**: CRUD operations (create, update, delete) reflected in UI without page reload. Duplicate creation rejected with user-visible error.

---

## Phase 5: User Story 3 — Historical Month Navigation (Priority: P3)

**Goal**: Let the user step backward and forward through months to see budget vs actual for any month that has data. Navigation forward past the current month is disabled.

**Independent Test**: With budgets and transactions in both the current month and the previous month, open the Budget page and click the back arrow — the page shows the previous month's budgets with its correct historical actual spend. Click the forward arrow — the current month's data reappears. Confirm the forward arrow is disabled (or hidden) when viewing the current month.

- [ ] T015 [US3] Create `src/components/budgets/MonthNavigator.tsx` — renders `< May 2026 >` with left arrow (`←`) and right arrow (`→`); accepts props `{ year: number, month: number, onPrev: () => void, onNext: () => void }`; derives the current year+month from `new Date()` and disables/hides the right arrow when `(year === currentYear && month === currentMonth)`; formats the label using `Intl.DateTimeFormat("en-NZ", { month: "long", year: "numeric" }).format(new Date(year, month - 1))`
- [ ] T016 [US3] Integrate `MonthNavigator` into `src/pages/BudgetPage.tsx` — import `MonthNavigator` from `../components/budgets/MonthNavigator`; render it above the budget list, passing `year={selectedYear}`, `month={selectedMonth}`, `onPrev={() => setSelectedMonth(prevYear, prevMonth)}`, `onNext={() => setSelectedMonth(nextYear, nextMonth)}`; compute `prevYear`/`prevMonth` and `nextYear`/`nextMonth` from selected values (handle month 1 → previous year December, and month 12 → next year January)

**Checkpoint**: Month navigation works — clicking back/forward updates the budget list and spend totals. Forward arrow is disabled at the current month. Navigating to a month with no budgets shows the empty state.

---

## Phase 6: User Story 4 — Default Budget Configuration (Priority: P4)

**Goal**: Allow the user to create, update, and delete default budgets per category. When the Budget page loads for a month with no existing budgets, defaults are automatically applied (idempotent).

**Independent Test**: Create a default for "Groceries" at $500. Navigate to next month (which has no budgets) — the page automatically shows a "Groceries" row at $500. Update the default to $600 — the already-created month is unaffected; only future empty months pick up $600. Delete the "Groceries" default — already-created monthly budgets are preserved. Reload the page for the same month — no duplicate is created.

- [ ] T017 [US4] Create `src/server/routes/budgetDefaults.ts` — export `budgetDefaultsRouter` using `Router()`, apply `authenticateToken` middleware; `GET /`: fetch all `budget_defaults` for userId, return `ApiBudgetDefault[]`; `POST /`: Zod schema `{ categoryName: z.string().min(1).max(100), limitAmount: z.number().min(0) }`; upsert using `onConflictDoUpdate` on `(userId, categoryName)` setting `{ limitAmount, updatedAt: new Date() }`; return the upserted row as `ApiBudgetDefault` with status 200; `DELETE /:id`: delete where `id = params.id AND userId = userId`; return 204 or 404
- [ ] T018 [US4] Register `budgetDefaultsRouter` in `src/server/index.ts` — add `import { budgetDefaultsRouter } from "./routes/budgetDefaults.ts"` and `app.use("/api/budget-defaults", budgetDefaultsRouter)` after the `app.use("/api/budgets", budgetsRouter)` line
- [ ] T019 [US4] Add `budgetDefaults`, `upsertDefault`, `deleteDefault` to `src/context/BudgetContext.tsx` — add `budgetDefaults: ApiBudgetDefault[]` state; fetch `GET /api/budget-defaults` on mount alongside the budgets fetch; `upsertDefault(data: { categoryName, limitAmount })`: POST to `/api/budget-defaults`, update `budgetDefaults` state with the returned item (replace if existing categoryName, append if new); `deleteDefault(id)`: optimistic removal from `budgetDefaults` state, DELETE to `/api/budget-defaults/:id`, restore on error; update `BudgetContextValue` interface
- [ ] T020 [P] [US4] Create `src/components/budgets/ManageDefaultsModal.tsx` — modal dialog listing all `budgetDefaults` from `useBudgets()`, each row with category name, limit (NZD), Edit (inline input, calls `upsertDefault()`), and Delete (calls `deleteDefault(id)`) controls; a form at the bottom to add a new default (category name, limit amount, calls `upsertDefault()`); uses existing modal/form patterns from the codebase
- [ ] T021 [US4] Add "Manage Defaults" button and `ManageDefaultsModal` to `src/pages/BudgetPage.tsx` — import `ManageDefaultsModal`; add state for modal open/close; render a "Manage Defaults" link/button below the budget list; render `<ManageDefaultsModal>` conditionally

**Checkpoint**: Default budgets can be created, updated, and deleted. Auto-populate from defaults fires on page load for empty months and is idempotent.

---

## Phase 7: User Story 5 — Month Start Day Configuration (Priority: P5)

**Goal**: Allow the user to configure their month start day (1–28) so budget period date ranges align with their pay cycle. The setting persists and affects spend calculations on all subsequent loads.

**Independent Test**: Set month start day to 15. Open the Budget page for the current month — the server calculates spend from the 15th of this month to the 14th of next month. Update to 20 — spend recalculates using 20th–19th range. Attempt to set 29 — the API rejects with 400. Reset to 1 — the period reverts to the full calendar month.

- [ ] T022 [US5] Create `src/server/routes/userPreferences.ts` — export `userPreferencesRouter` using `Router()`, apply `authenticateToken` middleware; `GET /`: fetch row from `user_preferences` where `userId = userId`; if no row, insert `{ userId, monthStartDay: 1 }` and return the new row; return `ApiUserPreferences`; `PATCH /`: Zod schema `{ monthStartDay: z.number().int().min(1).max(28) }`; upsert using `onConflictDoUpdate` on `userId` setting `{ monthStartDay, updatedAt: new Date() }`; return updated `ApiUserPreferences`
- [ ] T023 [US5] Register `userPreferencesRouter` in `src/server/index.ts` — add `import { userPreferencesRouter } from "./routes/userPreferences.ts"` and `app.use("/api/preferences", userPreferencesRouter)` after the `app.use("/api/budget-defaults", budgetDefaultsRouter)` line
- [ ] T024 [US5] Add `preferences`, `updatePreferences` to `src/context/BudgetContext.tsx` — add `preferences: ApiUserPreferences | null` state; fetch `GET /api/preferences` on mount alongside the budgets fetch; `updatePreferences(monthStartDay: number)`: PATCH to `/api/preferences`, update `preferences` state, then re-fetch budgets for the current selected month (so spend totals recalculate server-side with the new monthStartDay); update `BudgetContextValue` interface
- [ ] T025 [US5] Add `monthStartDay` preference field to `src/components/budgets/ManageDefaultsModal.tsx` — add a labelled number input showing `preferences?.monthStartDay ?? 1`; on change calls `updatePreferences(value)` with Zod-compatible validation (1–28 integer); show inline validation message when value is outside range; this field appears in the same modal as budget defaults (ManageDefaultsModal already created in T020)

**Checkpoint**: Month start day persists. Changing it immediately triggers a re-fetch with the new period dates. The server correctly shifts spend ranges. Setting 29+ is rejected.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T026 [P] Run TypeScript type-check (`tsc --noEmit`) and lint (`npm run lint`) across all new and modified files — fix any type errors in `src/types/api.ts`, `src/server/routes/budgets.ts`, `src/server/routes/budgetDefaults.ts`, `src/server/routes/userPreferences.ts`, `src/server/utils/calculateBudgetSpend.ts`, `src/context/BudgetContext.tsx`, `src/pages/BudgetPage.tsx`, `src/components/budgets/BudgetRow.tsx`, `src/components/budgets/MonthNavigator.tsx`, `src/components/budgets/AddBudgetModal.tsx`, `src/components/budgets/ManageDefaultsModal.tsx`, `src/App.tsx`, `src/components/Sidebar.tsx`, `src/server/index.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No external dependencies — start immediately
  - T001 ∥ T002 (different files: api.ts vs utils/)
  - Both must complete before any Phase 3+ task
- **US1 (Phase 3)**: Depends on T001 (types) and T002 (utility)
  - T003 (route) → T004 (register) — register after file exists
  - T005 (context) — can start after T001
  - T006 + T007 [P] — component + CSS in parallel
  - T008 — after T005 (consumes context) and T006 (renders BudgetRow)
  - T009 — after T008 (BudgetPage must exist)
  - T010 [P] — independent of T003–T009 (different file)
- **US2 (Phase 4)**: Depends on T003 (route file exists to extend) and T005 (context to extend)
  - T011 (extend route) → sequential with T003
  - T012 (extend context) → sequential with T005
  - T013 [P] — can be drafted while T011/T012 complete
  - T014 — after T012 (context has CRUD ops) and T013 (modal exists)
- **US3 (Phase 5)**: Depends on T005 (context has setSelectedMonth) and T008 (BudgetPage exists)
  - T015 [P] — MonthNavigator is standalone component
  - T016 — after T015
- **US4 (Phase 6)**: Depends on T003 (budgets.ts exists; auto-populate already wired) and T005 (context to extend)
  - T017 (new route file) ∥ T019 (extend context) — different files
  - T018 — after T017
  - T020 [P] — can be drafted while T017/T019 complete
  - T021 — after T019 (context has upsertDefault/deleteDefault) and T020 (modal exists)
- **US5 (Phase 7)**: Depends on T020 (ManageDefaultsModal exists to extend) and T005 (context to extend)
  - T022 (new route file) ∥ T024 (extend context) — different files
  - T023 — after T022
  - T025 — after T022 (route must work) and T024 (context has updatePreferences)
- **Polish (Phase 8)**: Depends on T003+T011+T017+T022 (all schema.ts-adjacent files) and all component/page files

### Within Each Phase

- Route file must exist before its registration task
- Context extensions are sequential on the same file (T005 → T012 → T019 → T024)
- BudgetPage extensions are sequential on the same file (T008 → T014 → T016 → T021)
- BudgetRow extensions are sequential on the same file (T006 → T014 edit/delete additions)

### Parallel Opportunities

- T001 ∥ T002 (foundational — different files)
- T006 ∥ T007 (component + CSS — different files)
- T010 ∥ T003–T009 (Sidebar edit is independent of route/context/page work)
- T013 ∥ T011+T012 (modal component can be drafted alongside route/context changes)
- T015 ∥ T017+T019 (MonthNavigator is standalone; US4 route+context changes are independent)
- T020 ∥ T017+T019 (modal can be drafted alongside route/context)
- T022 ∥ T024 (different files — route vs context)
- T026 (polish) runs last, independently parallelisable internally

---

## Parallel Example: US1 Core Implementation

```
# After T001 + T002 complete:

# Run simultaneously:
T003 — create GET /api/budgets in src/server/routes/budgets.ts
T005 — create BudgetContext.tsx
T007 — create BudgetRow.css
T010 — add Budget nav to Sidebar.tsx

# Then sequentially:
T004 — register budgetsRouter in src/server/index.ts  (after T003)
T006 — create BudgetRow.tsx                           (after T001)
T008 — create BudgetPage.tsx                          (after T005, T006)
T009 — add /budget route to App.tsx                   (after T008)
```

---

## Implementation Strategy

### MVP (Phase 2 + Phase 3 only — US1)

1. Complete T001 + T002 (foundational)
2. Complete T003 → T004 (GET /api/budgets route registered)
3. Complete T005 + T006 + T007 + T008 + T009 + T010 (context, components, page, routing)
4. **VALIDATE**: Open `/budget` — rows render with correct spend, remaining, colours, empty state works
5. Ship — read-only budget overview is live

### Incremental Delivery

1. Phase 2 (foundational) → types + spend utility ✅
2. Phase 3 (US1) → read-only budget overview page ✅
3. Phase 4 (US2) → CRUD for monthly budgets ✅
4. Phase 5 (US3) → month navigation ✅
5. Phase 6 (US4) → defaults + auto-populate ✅
6. Phase 7 (US5) → month start day preference ✅
7. Phase 8 (polish) → typecheck + lint ✅

---

## Notes

- `calculateBudgetSpend` is called per row in the GET handler — for ≤20 categories this is acceptable; no batching optimisation needed (SC-003 allows 2s page load)
- `limitAmount` returned by Drizzle is a `string` (numeric column) — always `parseFloat()` before arithmetic and before serialising in the response
- `onConflictDoNothing` (auto-populate) and `onConflictDoUpdate` (defaults upsert) are Drizzle's built-in conflict resolution — no raw SQL needed
- BudgetContext extensions (T012, T019, T024) each modify `BudgetContext.tsx` sequentially — never in parallel with each other
- The `ManageDefaultsModal` is extended by T025 (adds monthStartDay field) — T020 must complete before T025
- Do NOT run `drizzle-kit generate` — all migrations are hand-written; FA-BUDG-001 already covers the data layer for this feature
