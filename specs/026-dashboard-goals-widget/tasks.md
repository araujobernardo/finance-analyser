# Tasks: FA-GOAL-004 — Goals Summary Widget on Dashboard

**Input**: Design documents from `specs/026-dashboard-goals-widget/`
**Branch**: `026-dashboard-goals-widget`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to
- This feature is entirely frontend — no backend changes, no DB migration

---

## Phase 2: Foundational — GoalsProvider Lift (Blocking Prerequisite)

**Goal**: Move `<GoalsProvider>` from wrapping only `<GoalsPage />` to wrapping the entire authenticated layout in `App.tsx`. This is a prerequisite for all user stories — without it, `useGoals()` is unavailable on the dashboard route and a second network call would be required.

**Independent Test**: Open the Goals page — it still loads and shows goal data correctly. Then open the dashboard — no 404 or context error in the console.

- [ ] T001 In `src/App.tsx`, lift `<GoalsProvider>` from the `/goals` route element to wrap the entire authenticated layout section; the `/goals` route element becomes just `<GoalsPage />` with no nested provider; ensure GoalsPage and Dashboard both receive goals from the same shared context instance

**Checkpoint**: GoalsContext is available to all authenticated routes. No second `GET /api/goals` request fires when navigating between dashboard and goals page.

---

## Phase 3: User Story 1 — Dashboard Shows Top Goals at a Glance (Priority: P1) 🎯 MVP

**Goal**: Render a widget on the dashboard showing the user's top 3 active goals with goal name, type badge, progress bar, progress percentage, and status label (On Track / At Risk / Behind) where applicable.

**Independent Test**: Create 3+ active goals with varying progress levels and target dates. Open the dashboard — the widget shows the top 3 goals sorted by closest target date first; goals with a target date show a status label in the correct colour; goals without a target date show only the raw progress percentage and no status label; a goal with null currentAmount shows 0% and no status label.

- [ ] T002 [US1] Create `src/utils/getGoalStatus.ts` — export `GoalStatus = "on_track" | "at_risk" | "behind"` and `getGoalStatus(goal: ApiGoal, today: Date): GoalStatus | null`; return `null` when: `targetDate` is null, `targetAmount` is "0" or 0, `currentAmount` is null, `createdAt === targetDate` (zero-duration); for `spending_limit` branch: ratio = currentAmount/targetAmount; ratio < 0.80 → on_track; ratio < 1.00 → at_risk; ratio ≥ 1.00 → behind; for all other types (time-based branch): expectedProgress = min(1, daysElapsed/totalDays) where daysElapsed = floor((today - createdAt)/86400000) and totalDays = floor((targetDate - createdAt)/86400000); if totalDays ≤ 0 return null; actualProgress = min(1, currentAmount/targetAmount); gap = expectedProgress - actualProgress; gap ≤ 0.10 → on_track; gap ≤ 0.25 → at_risk; gap > 0.25 → behind
- [ ] T003 [P] [US1] Create unit tests for getGoalStatus in `src/utils/__tests__/getGoalStatus.test.ts` — test cases: savings_target goal on track (gap ≤ 0.10); savings_target at risk (gap 10–25%); savings_target behind (gap > 25%); goal ahead of schedule → on_track; no targetDate → null; null currentAmount → null; zero targetAmount → null; createdAt === targetDate → null; totalDays ≤ 0 → null; target date in the past with unachieved goal → behind; spending_limit < 80% → on_track; spending_limit 80–100% → at_risk; spending_limit ≥ 100% → behind; net_worth_milestone time-based; debt_payoff time-based
- [ ] T004 [US1] Create `src/components/goals/GoalsSummaryWidget.tsx` — reads from `useGoals()`; filters goals where `status === "active"`; sorts: goals with `targetDate` ascending by targetDate first, then goals without `targetDate` descending by `updatedAt`; takes first 3; for each goal renders: goal name, type badge, progress bar (width = min(100, percent)%), progress percentage (0% when currentAmount null or targetAmount "0"), and status label using `getGoalStatus(goal, new Date())` — status label only rendered when `getGoalStatus` returns non-null; while `isLoading` render null (consistent with dashboard loading pattern); import and apply GoalsSummaryWidget.css
- [ ] T005 [P] [US1] Create `src/components/goals/GoalsSummaryWidget.css` — widget card container matching existing dashboard card style; goal row layout (name + type badge + progress bar + percentage + status chip in a row); status chip colours using CSS custom properties: `--color-success` for on_track, `--color-warning` for at_risk, `--color-danger` for behind; progress bar using existing design system tokens; no hardcoded hex values
- [ ] T006 [P] [US1] Create component tests in `src/components/goals/__tests__/GoalsSummaryWidget.test.tsx` — test: 3+ active goals renders exactly 3; goals sorted by targetDate ascending then updatedAt descending; status label rendered for goal with targetDate; status label NOT rendered for goal without targetDate; 0% progress and no status label when currentAmount is null; 0% progress and no status label when targetAmount is "0"; isLoading renders null; progress bar width capped at 100% for over-target goals
- [ ] T007 [US1] Import and render `<GoalsSummaryWidget />` in `src/pages/DashboardPage.tsx` — add the widget to the dashboard layout in an appropriate section (alongside existing dashboard cards)

**Checkpoint**: Dashboard shows up to 3 active goals with correct sort order, progress bars, and status labels. Goals without target dates show raw percentage only.

---

## Phase 4: User Story 2 — Empty State Prompts Goal Creation (Priority: P2)

**Goal**: When the user has no active goals (or only achieved/abandoned goals), the widget shows a friendly empty state with a message and a prompt to create a goal, rather than a blank or broken section.

**Independent Test**: Log in with an account that has no active goals (or where all goals are achieved/abandoned). Open the dashboard — the widget shows "No active goals yet" and a "Create your first goal" link. Create a goal and return to the dashboard — the empty state is replaced by the goal card.

- [ ] T008 [US2] Add empty state branch to `src/components/goals/GoalsSummaryWidget.tsx` — when `activeGoals.length === 0` and `isLoading` is false, render an empty state section with: message "No active goals yet" and a React Router `<Link to="/goals">Create your first goal</Link>` prompt; achieved and abandoned goals are already excluded by the `status === "active"` filter so no additional filtering is needed
- [ ] T009 [P] [US2] Add empty state tests to `src/components/goals/__tests__/GoalsSummaryWidget.test.tsx` — test: user with no goals sees empty state message and "Create your first goal" link; user with only achieved goals sees empty state (active filter excludes them); user with only abandoned goals sees empty state; after goals load from context, empty state disappears when activeGoals.length > 0

**Checkpoint**: Empty state is displayed for users with no active goals. Achieved and abandoned goals do not appear in the widget.

---

## Phase 5: User Story 3 — Widget Links to Full Goals Page (Priority: P3)

**Goal**: The widget always shows a "See all goals" link at the footer so users can navigate to the full Goals page with one click.

**Independent Test**: Open the dashboard with active goals — click "See all goals" at the widget footer — the app navigates to `/goals`. Open the dashboard with no active goals — the "Create your first goal" link in the empty state navigates to `/goals`.

- [ ] T010 [US3] Add "See all goals" footer link to `src/components/goals/GoalsSummaryWidget.tsx` — render a React Router `<Link to="/goals">See all goals</Link>` in the widget footer; visible whether the widget shows goal cards or the empty state; position below the goal list (or below the empty state message)
- [ ] T011 [P] [US3] Add navigation tests to `src/components/goals/__tests__/GoalsSummaryWidget.test.tsx` — test: "See all goals" link renders with href `/goals`; link is visible when goal cards are displayed; link is visible in the empty state; "Create your first goal" link has href `/goals`

**Checkpoint**: Both navigation paths (goal list and empty state) link to the Goals page in a single click.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T012 [P] TypeScript type-check (`tsc --noEmit`) and lint (`npm run lint`) across all modified and new files — fix any type errors introduced by getGoalStatus imports or GoalsSummaryWidget props

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No external dependencies — start immediately
  - T001 must complete before any user story work begins (GoalsProvider must be lifted)
- **US1 (Phase 3)**: Depends on T001
  - T002 → T003 [P], T004 (T003 and T004 can run in parallel after T002 since they're different files)
  - T004 → T005 [P], T006 [P] (CSS and tests can be written alongside each other after component skeleton exists)
  - T004 → T007 (DashboardPage import depends on component existing)
- **US2 (Phase 4)**: Depends on T004 (modifies the same component)
  - T008 → T009 [P] (tests can be written alongside the implementation — different file)
- **US3 (Phase 5)**: Depends on T004; independent of US2
  - T010 → T011 [P]
- **Polish (Phase 6)**: Depends on all prior phases complete

### User Story Dependencies

- **US1 (P1)**: Depends only on T001 (foundational)
- **US2 (P2)**: Depends on T004 (GoalsSummaryWidget.tsx must exist to modify)
- **US3 (P3)**: Depends on T004; independent of US2

### Parallel Opportunities

- T003, T004 can run in parallel after T002 (different files)
- T005, T006 can run in parallel after T004 (different files)
- T009 runs in parallel with T008 in progress (different file — test vs implementation)
- T011 runs in parallel with T010 in progress (different file)
- T012 runs after all implementation tasks complete

---

## Parallel Example: US1 Core Implementation

```
# After T001 (GoalsProvider lift) completes:
# Step 1 — sequential:
T002 — create getGoalStatus.ts

# Step 2 — launch simultaneously after T002:
T003 — getGoalStatus unit tests (src/utils/__tests__/getGoalStatus.test.ts)
T004 — GoalsSummaryWidget component (src/components/goals/GoalsSummaryWidget.tsx)

# Step 3 — launch simultaneously after T004:
T005 — GoalsSummaryWidget.css
T006 — GoalsSummaryWidget.test.tsx

# Step 4 — after T004:
T007 — add to DashboardPage.tsx
```

---

## Implementation Strategy

### MVP (Phase 2 + Phase 3 only — US1)

1. Complete T001 (GoalsProvider lift)
2. Complete T002 → T003 [P], T004 → T005 [P], T006 [P] → T007
3. **VALIDATE**: Open dashboard → widget shows top 3 active goals with progress bars and status labels
4. Ship — users immediately see goal progress on the dashboard without navigating away

### Incremental Delivery

1. Phase 2 (foundational) → GoalsProvider available on dashboard ✅
2. Phase 3 (US1) → top 3 goals with status labels on dashboard ✅
3. Phase 4 (US2) → friendly empty state for new users ✅
4. Phase 5 (US3) → "See all goals" navigation link ✅
5. Phase 6 (polish) → typecheck and lint ✅

---

## Notes

- `ApiGoal.currentAmount` and `ApiGoal.targetAmount` are numeric strings — always `parseFloat()` before arithmetic
- `ApiGoal.createdAt` and `ApiGoal.targetDate` are ISO strings — use `new Date()` to parse
- Calendar day difference: `Math.floor((date1.getTime() - date2.getTime()) / 86400000)`
- Progress bar fill width should be clamped to 100% for display even when currentAmount > targetAmount (over-target goals show a full bar per spec Assumptions)
- GoalsProvider lift does NOT change the GoalsPage behaviour — it still uses `useGoals()` from the same provider instance; only the provider's location in the tree changes
- Status label colours must use existing CSS custom properties (`--color-success`, `--color-warning`, `--color-danger`) — do not hardcode hex values
- The "See all goals" and "Create your first goal" links navigate to `/goals` only — opening the Add Goal modal directly is out of scope per spec Assumptions
