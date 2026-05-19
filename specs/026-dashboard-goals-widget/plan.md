# Implementation Plan: FA-GOAL-004 — Goals Summary Widget on Dashboard

**Branch**: `026-dashboard-goals-widget` | **Date**: 2026-05-19 | **Spec**: [spec.md](./spec.md)

## Summary

Adds a `GoalsSummaryWidget` component to the existing dashboard that displays up to 3 active goals with progress bars and status labels (On Track / At Risk / Behind). This is entirely a frontend change — no new API endpoints, no backend changes, no new data fetching. The implementation lifts `GoalsProvider` to the authenticated layout level in `App.tsx` so the widget can read from `useGoals()` without triggering a second network request. Status labels are computed by a pure `getGoalStatus` utility function derived from the spec's linear progress formula.

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: React 18, React Router 6, Vitest, React Testing Library
**Storage**: N/A — widget reads from existing GoalsContext; no new storage
**Testing**: Vitest (unit tests for getGoalStatus), React Testing Library (component tests for GoalsSummaryWidget)
**Target Platform**: Vite browser build (same as existing frontend)
**Project Type**: Full-stack web application (monorepo) — this feature touches frontend only
**Performance Goals**: Widget renders synchronously from already-loaded context; zero additional network round trips
**Constraints**: No new API calls. GoalsProvider must not be duplicated — it must be lifted, not added again for the dashboard route.
**Scale/Scope**: Single-user app; goal list is small (typically <20 goals)

---

## Constitution Check

| Rule                                         | Status                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| GR-1 — No assumption about product decisions | ✅ Spec defines all status thresholds and sort order precisely            |
| GR-2 — No credentials/secrets exposed        | ✅ No new env vars, no backend changes                                    |
| GR-3 — No localStorage schema changes        | ✅ Context-only; no localStorage touched                                  |
| GR-4 — Definition of Ready check             | ✅ Spec complete, all FRs have acceptance criteria                        |
| GR-5 — Definition of Done check              | ✅ QA will verify before merge                                            |
| GR-6 — When in doubt, do less                | ✅ No extra abstractions; widget is a single component + one pure utility |

No violations. No Complexity Tracking entries required.

---

## Project Structure

### Documentation (this feature)

```text
specs/026-dashboard-goals-widget/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code Changes

```text
src/
├── App.tsx                                           ← MODIFY: lift GoalsProvider to wrap authenticated layout
├── pages/
│   └── DashboardPage.tsx                             ← MODIFY: add GoalsSummaryWidget
└── components/
    └── goals/
        ├── GoalsSummaryWidget.tsx                    ← NEW: top-3 goals widget
        ├── GoalsSummaryWidget.css                    ← NEW: widget layout and status-label colours
        └── __tests__/
            └── GoalsSummaryWidget.test.tsx           ← NEW: component tests
└── utils/
    ├── getGoalStatus.ts                              ← NEW: pure status calculation function
    └── __tests__/
        └── getGoalStatus.test.ts                     ← NEW: unit tests (all spec thresholds + edge cases)
```

No database migration required. No backend changes required.

---

## Phase 0: Research

### Decision: GoalsProvider must be lifted, not duplicated

**Decision**: Move `<GoalsProvider>` from wrapping only `<GoalsPage />` to wrapping the entire authenticated layout in `App.tsx`. Do not add a second `GoalsProvider` to the dashboard route.

**Rationale**: A second `GoalsProvider` instance would fire a second `GET /api/goals` network request — violating FR-001 and FR-002 ("no additional network requests"). A single lifted provider shares one fetch result across both dashboard and goals routes.

**Alternatives considered**: Rendering a second `GoalsProvider` on the dashboard route — rejected because it introduces an extra network call. Using a global store (Zustand/Redux) — rejected as over-engineering; React Context is already in use and sufficient.

### Decision: Status calculation is a pure utility function

**Decision**: Implement `getGoalStatus(goal: ApiGoal, today: Date): "on_track" | "at_risk" | "behind" | null` as a standalone pure function in `src/utils/getGoalStatus.ts`. The widget calls this for each goal.

**Rationale**: Pure functions are trivial to unit-test against all spec thresholds and edge cases without rendering a component. Keeps the component thin.

**Alternatives considered**: Inline calculation inside the component — rejected because it makes the threshold logic harder to test exhaustively.

### Decision: spending_limit uses ratio-based status (not time-based)

**Decision**: For `spending_limit` goals, status is computed from `currentAmount / targetAmount` (the spend ratio), not from time elapsed. Thresholds: ratio < 0.80 → on_track; ratio < 1.00 → at_risk; ratio ≥ 1.00 → behind.

**Rationale**: Spending limits reset monthly and have no meaningful "days elapsed" — you either are or aren't within budget. A ratio-based threshold matches the business intent.

**Alternatives considered**: Applying the same linear time-based formula as other goal types — rejected because a spending limit with no target date would always show raw progress only, which loses the meaningful budget-vs-spend comparison.

### Decision: Sort order — target date first, then updatedAt

**Decision**: Sort active goals for widget display as: goals with a `targetDate` sorted by closest date first (ascending); then goals without a `targetDate` sorted by `updatedAt` descending. Take the first 3.

**Rationale**: Directly matches FR-003. Goals with imminent deadlines are most actionable.

**Alternatives considered**: Sort only by updatedAt — rejected; recently-updated goals with no deadline are less urgent than a goal due next week.

### Decision: `createdAt` is an ISO datetime string on ApiGoal

**Decision**: Parse `goal.createdAt` with `new Date(goal.createdAt)` inside `getGoalStatus`. Use calendar-day difference: `Math.floor((today - createdAt) / 86400000)`.

**Rationale**: `ApiGoal.createdAt` is typed as `string` (ISO datetime from DB). The spec says "calendar days (not business days)". Floor division gives whole days.

**Alternatives considered**: Using date-fns — rejected; native Date arithmetic is sufficient for this simple calculation and avoids adding a dependency.

---

## Phase 1: Design & Contracts

### Data Flow

```
App.tsx (authenticated layout)
  └── GoalsProvider (lifted from /goals route)
        ├── DashboardPage
        │     └── GoalsSummaryWidget
        │           └── useGoals() → goals: ApiGoal[]
        │                 → filterActive() → top3 sorted
        │                 → getGoalStatus(goal, today)
        │                 → render GoalCard rows + status chips
        └── GoalsPage (unchanged — still gets goals from same provider)
```

### `getGoalStatus` — Full Contract

**File**: `src/utils/getGoalStatus.ts`

```typescript
export type GoalStatus = "on_track" | "at_risk" | "behind";

export function getGoalStatus(goal: ApiGoal, today: Date): GoalStatus | null;
```

**Returns `null` when**:

- `goal.targetDate` is null (no target date set)
- `goal.targetAmount` is `"0"` or `parseFloat(goal.targetAmount) === 0` (division-by-zero guard)
- `goal.currentAmount` is null (not yet calculated — FR-011)
- `goal.createdAt === goal.targetDate` (zero-duration goal — FR-012)

**`spending_limit` branch**:

```
ratio = parseFloat(currentAmount) / parseFloat(targetAmount)
ratio < 0.80  → "on_track"
ratio < 1.00  → "at_risk"
ratio ≥ 1.00  → "behind"
```

**All other goal types (time-based branch)**:

```
createdAt  = new Date(goal.createdAt)       // ISO string → Date
targetDate = new Date(goal.targetDate)      // ISO string → Date
daysElapsed = Math.floor((today - createdAt) / 86400000)
totalDays   = Math.floor((targetDate - createdAt) / 86400000)
if totalDays <= 0: return null             // zero-duration guard
expectedProgress = Math.min(1, daysElapsed / totalDays)
actualProgress   = Math.min(1, parseFloat(currentAmount) / parseFloat(targetAmount))
gap = expectedProgress - actualProgress
gap ≤ 0.10  → "on_track"
gap ≤ 0.25  → "at_risk"
gap >  0.25 → "behind"
```

Note: gap can be negative (ahead of schedule) — ≤ 0.10 covers that case, so ahead-of-schedule goals show "on_track".

### `GoalsSummaryWidget` — Component Contract

**File**: `src/components/goals/GoalsSummaryWidget.tsx`

```typescript
// No props — reads from useGoals()
export function GoalsSummaryWidget(): JSX.Element;
```

**Internal logic**:

1. `const { goals, isLoading } = useGoals()`
2. Filter `goals` where `goal.status === "active"`
3. Sort: targetDate goals (ascending by date) first, then no-targetDate goals (descending by updatedAt)
4. Take first 3
5. For each: compute `percent = currentAmount != null && targetAmount !== "0" ? Math.min(100, Math.round(parseFloat(currentAmount) / parseFloat(targetAmount) * 100)) : 0`
6. For each: compute `status = getGoalStatus(goal, new Date())`
7. Render (see layout below)

**Empty state**: when `activeGoals.length === 0`, render empty-state card with "No active goals yet" and "Create your first goal" link to `/goals`.

**Loading state**: while `isLoading`, render skeleton or null (consistent with existing dashboard pattern).

**"See all goals" link**: always rendered at widget footer, navigates to `/goals`.

### App.tsx Change

Move `<GoalsProvider>` from wrapping only the `/goals` route element to wrapping the entire authenticated section. The `/goals` route element becomes just `<GoalsPage />` (no nested provider).

### CSS Approach

**File**: `src/components/goals/GoalsSummaryWidget.css`

- Widget container: matches existing dashboard card style (use existing card class or replicate its padding/border-radius using design system tokens)
- Status chip colours using existing CSS custom properties:
  - `on_track`: `var(--color-success)` (green)
  - `at_risk`: `var(--color-warning)` (amber)
  - `behind`: `var(--color-danger)` (red)
- Progress bar: reuse existing bar pattern from GoalCard where possible; import shared styles if applicable

---

<!-- SPECKIT START -->

**Active feature plan**: [specs/026-dashboard-goals-widget/plan.md](specs/026-dashboard-goals-widget/plan.md)

<!-- SPECKIT END -->
