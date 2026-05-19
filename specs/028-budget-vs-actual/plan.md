# Implementation Plan: FA-BUDG-002 — Budget vs Actual Spend Comparison View

**Branch**: `028-budget-vs-actual` | **Date**: 2026-05-19 | **Spec**: [spec.md](./spec.md)

## Summary

Builds the full Budget page: three new Express route files, a spend-calculation utility, a BudgetContext, and a set of React components. The page shows each budget category for the selected month with actual spend calculated from qualifying transactions, colour-coded progress bars, and CRUD operations for budgets, defaults, and month-start-day preference. Depends on FA-BUDG-001 data model being applied.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Drizzle ORM, PostgreSQL, Express, React 18, Zod, Vite
**Storage**: PostgreSQL via Drizzle ORM
**Testing**: Vitest — unit and integration tests following project conventions
**Target Platform**: Node.js server (Express) + React SPA (Vite)
**Project Type**: Full-stack web application (monorepo) — server routes + React pages/components
**Performance Goals**: Budget page loads within 2 seconds for up to 20 budget categories (SC-003)
**Constraints**: All amounts NZD via `Intl.NumberFormat`; monthStartDay bounded 1–28; no `drizzle-kit generate`; hand-written migrations only; no new migration needed (FA-BUDG-001 covers the data model)
**Scale/Scope**: Single-user app; all data scoped to authenticated userId

---

## Constitution Check

| Rule                                         | Status                                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| GR-1 — No assumption about product decisions | ✅ Spec and user input define all routes, fields, thresholds, and behaviour               |
| GR-2 — No credentials/secrets exposed        | ✅ No new env vars or secrets                                                             |
| GR-3 — No localStorage schema changes        | ✅ No localStorage changes                                                                |
| GR-4 — Definition of Ready check             | ✅ Spec complete, all FRs and acceptance scenarios defined, checklist all-pass            |
| GR-5 — Definition of Done check              | ✅ QA will verify before merge                                                            |
| GR-6 — When in doubt, do less                | ✅ No extra abstractions; push notifications explicitly out of scope per spec Assumptions |

No violations. No Complexity Tracking entries required.

---

## Project Structure

### Documentation (this feature)

```text
specs/028-budget-vs-actual/
├── plan.md              ← this file
├── data-model.md        ← Phase 1 output
├── contracts/           ← Phase 1 output (API contracts)
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code Changes

```text
src/
├── server/
│   ├── index.ts                              ← MODIFY: register 3 new routers
│   ├── routes/
│   │   ├── budgets.ts                        ← NEW
│   │   ├── budgetDefaults.ts                 ← NEW
│   │   └── userPreferences.ts               ← NEW
│   └── utils/
│       └── calculateBudgetSpend.ts           ← NEW
├── context/
│   └── BudgetContext.tsx                     ← NEW
├── types/
│   └── api.ts                                ← MODIFY: add 3 new interfaces
├── pages/
│   └── BudgetPage.tsx                        ← NEW
├── components/
│   └── budgets/
│       ├── BudgetRow.tsx                     ← NEW
│       ├── BudgetRow.css                     ← NEW
│       ├── MonthNavigator.tsx                ← NEW
│       ├── AddBudgetModal.tsx                ← NEW
│       └── ManageDefaultsModal.tsx           ← NEW
├── App.tsx                                   ← MODIFY: add /budget route + BudgetProvider
└── components/
    └── Sidebar.tsx                           ← MODIFY: add Budget nav entry
```

---

## Phase 0: Research

### Decision: No new migration needed

**Decision**: FA-BUDG-001 (`0007_budget_data_model.sql`) creates all three tables. FA-BUDG-002 only adds routes, utilities, and frontend code.

**Rationale**: Confirmed by reading the FA-BUDG-001 plan — the SQL migration includes `budgets`, `budget_defaults`, and `user_preferences`.

### Decision: calculateBudgetSpend is a pure server utility

**Decision**: `calculateBudgetSpend` is a standalone async utility function in `src/server/utils/calculateBudgetSpend.ts`, not a Drizzle query builder or class method.

**Rationale**: Matches the existing pattern of `computeAccountBalance` from FA-NW-004. Budget period date-range logic is non-trivial (monthStartDay > 1 crosses calendar months) and benefits from isolation.

### Decision: Auto-populate from defaults on GET /api/budgets

**Decision**: When GET /api/budgets is called for a year+month with zero existing budget records, query `budget_defaults` for the user and insert one monthly budget row per default using `onConflictDoNothing`. Then return the newly-populated budgets.

**Rationale**: FR-011 requires idempotency — `onConflictDoNothing` prevents duplicates on repeated loads. FR-012 requires existing budgets to be respected — `onConflictDoNothing` skips any category that already has a budget.

### Decision: percentageUsed edge case (zero limit)

**Decision**: In the API response, compute `percentageUsed` as:

- `(actualSpend / limitAmount) * 100` when `limitAmount > 0`
- `100` when `limitAmount === 0` and `actualSpend > 0`
- `0` when both are 0

**Rationale**: FR-014 says percentages are not capped. FR-004 says zero limit with any spend → red. Returning 100 when limit=0 and spend>0 ensures the status logic (≥100% → red) fires correctly.

### Decision: BudgetContext follows GoalsContext pattern

**Decision**: `BudgetContext.tsx` uses `useApi`, `useToast`, `useState`, `useEffect`, optimistic updates for delete, and re-fetch on CRUD (matching `GoalsContext.tsx`).

**Rationale**: Consistency with existing context files. The project has one established pattern; deviating adds cognitive overhead with no benefit.

### Decision: Budget nav entry placement and icon

**Decision**: Insert `{ path: "/budget", icon: "◧", label: "Budget" }` between Goals and Settings in `Sidebar.tsx`'s `NAV` array.

**Rationale**: Budget is a peer to Goals in the financial-planning group; it belongs adjacent to Goals. The half-filled square icon `◧` visually suggests a progress/limit concept.

### Decision: NZD currency formatting

**Decision**: Use `new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" })` for all monetary amounts displayed on the Budget page.

**Rationale**: Confirmed from Sidebar.tsx footer: "ASB Bank · NZD". Consistent with how other monetary amounts are rendered in the project.

---

## Phase 1: Design & Contracts

### API Contracts

See [contracts/](./contracts/) for the full HTTP contract definitions.

Summary:

| Method | Path                     | Description                                                          |
| ------ | ------------------------ | -------------------------------------------------------------------- |
| GET    | /api/budgets?year&month  | List budgets with actual spend; auto-populate from defaults if empty |
| POST   | /api/budgets             | Create budget (reject duplicate)                                     |
| PATCH  | /api/budgets/:id         | Update spending limit                                                |
| DELETE | /api/budgets/:id         | Delete budget                                                        |
| GET    | /api/budget-defaults     | List default budgets                                                 |
| POST   | /api/budget-defaults     | Create or update (upsert) default                                    |
| DELETE | /api/budget-defaults/:id | Delete default                                                       |
| GET    | /api/preferences         | Get user preferences (creates row if none)                           |
| PATCH  | /api/preferences         | Update monthStartDay (1–28)                                          |

### TypeScript Interfaces (src/types/api.ts additions)

```typescript
export interface ApiBudget {
  id: string;
  categoryName: string;
  year: number;
  month: number;
  limitAmount: number; // parsed from numeric string
  actualSpend: number; // calculated by server
  remaining: number; // limitAmount - actualSpend (can be negative)
  percentageUsed: number; // 0–∞, not capped
}

export interface ApiBudgetDefault {
  id: string;
  categoryName: string;
  limitAmount: number;
}

export interface ApiUserPreferences {
  id: string;
  monthStartDay: number; // 1–28
}
```

### calculateBudgetSpend utility

```typescript
// src/server/utils/calculateBudgetSpend.ts
async function calculateBudgetSpend(
  userId: string,
  categoryName: string,
  year: number,
  month: number,
  monthStartDay: number,
  db: DrizzleDb,
): Promise<number>;
```

**Date range logic**:

- `startDate`: `new Date(year, month - 1, monthStartDay)` — note: JS Date months are 0-indexed
- `endDate`: one calendar month later minus one day — `new Date(year, month, monthStartDay - 1)` (JS Date auto-overflows, so adding one month and subtracting one day is safe)
- Query: `SUM(ABS(amount))` WHERE `userId = userId AND categoryName = category AND amount < 0 AND isTransfer = false AND date >= startDate AND date <= endDate`
- Returns the sum as a JS number (parse the Drizzle numeric result via `parseFloat`); returns `0` if no rows match

### Route file patterns

All three route files follow `src/server/routes/goals.ts` exactly:

- Import `Router` from express, `authenticateToken` middleware, `db` from `../../db/index.ts`, drizzle-orm operators (`eq`, `and`), `z` from zod, and the relevant schema tables
- All routes are authenticated (`router.use(authenticateToken)`)
- `userId` extracted from `req.user!.id`

**budgets.ts** specifics:

- `GET /?year&month` — validates query params, fetches preferences for monthStartDay, auto-populates from defaults if needed, calculates actualSpend for each row, computes remaining and percentageUsed, returns `ApiBudget[]`
- `POST /` — Zod: `{ categoryName: z.string().min(1).max(100), year: z.number().int(), month: z.number().int().min(1).max(12), limitAmount: z.number().min(0) }`; insert with unique constraint → 409 on duplicate
- `PATCH /:id` — Zod: `{ limitAmount: z.number().min(0) }`; update where id AND userId
- `DELETE /:id` — delete where id AND userId; 404 if not found

**budgetDefaults.ts** specifics:

- `GET /` — returns all defaults for userId
- `POST /` — Zod: `{ categoryName: z.string().min(1).max(100), limitAmount: z.number().min(0) }`; upsert via `onConflictDoUpdate` on `(userId, categoryName)` setting `limitAmount` and `updatedAt`
- `DELETE /:id` — delete where id AND userId

**userPreferences.ts** specifics:

- `GET /` — fetch row for userId; if none, insert `{ userId, monthStartDay: 1 }` and return it
- `PATCH /` — Zod: `{ monthStartDay: z.number().int().min(1).max(28) }`; upsert (insert or update) row for userId

### BudgetContext state shape

```typescript
interface BudgetContextValue {
  budgets: ApiBudget[];
  budgetDefaults: ApiBudgetDefault[];
  preferences: ApiUserPreferences | null;
  selectedYear: number;
  selectedMonth: number;
  loading: boolean;
  setSelectedMonth: (year: number, month: number) => void;
  addBudget: (data: {
    categoryName: string;
    year: number;
    month: number;
    limitAmount: number;
  }) => Promise<void>;
  updateBudget: (id: string, limitAmount: number) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  upsertDefault: (data: {
    categoryName: string;
    limitAmount: number;
  }) => Promise<void>;
  deleteDefault: (id: string) => Promise<void>;
  updatePreferences: (monthStartDay: number) => Promise<void>;
}
```

On `setSelectedMonth`, fetch `/api/budgets?year=Y&month=M`. On mount, also fetch `/api/budget-defaults` and `/api/preferences`. Optimistic delete for budgets and defaults.

### BudgetPage layout

```
BudgetPage
├── MonthNavigator          — "< May 2026 >" with forward arrow disabled at current month
├── summary row             — total limit vs total spend across all categories
├── BudgetRow (×N)          — one per budget in selected month
├── empty state             — when budgets.length === 0
├── "+ Add Budget" button   — opens AddBudgetModal
└── "Manage Defaults" link  — opens ManageDefaultsModal
```

**BudgetRow** displays:

- Category name
- Limit (NZD formatted)
- Actual spend (NZD formatted)
- Remaining (NZD formatted; negative shown as "–$X.XX over")
- Percentage used (e.g. "72%" or "150%")
- Horizontal progress bar: green < 80%, amber 80–99%, red ≥ 100%

**AddBudgetModal**: category name input, limit amount input, month pre-populated to selected month (editable for other months), submit → `addBudget()`

**ManageDefaultsModal**: lists existing defaults with edit/delete, form to add new default, monthStartDay preference field (integer 1–28), save button → `upsertDefault()` or `updatePreferences()`

### App.tsx and Sidebar.tsx changes

**App.tsx**: Add inside authenticated layout:

```typescript
<Route path="/budget" element={<BudgetProvider><BudgetPage /></BudgetProvider>} />
```

**Sidebar.tsx NAV array**: Insert between Goals and Settings:

```typescript
{ path: "/budget", icon: "◧", label: "Budget" },
```

### src/server/index.ts additions

```typescript
import { budgetsRouter } from "./routes/budgets.ts";
import { budgetDefaultsRouter } from "./routes/budgetDefaults.ts";
import { userPreferencesRouter } from "./routes/userPreferences.ts";

app.use("/api/budgets", budgetsRouter);
app.use("/api/budget-defaults", budgetDefaultsRouter);
app.use("/api/preferences", userPreferencesRouter);
```

---

<!-- SPECKIT START -->

**Active feature plan**: [specs/028-budget-vs-actual/plan.md](specs/028-budget-vs-actual/plan.md)

<!-- SPECKIT END -->
