# Tasks: Goals Creation and Management UI and API (FA-GOAL-002)

**Input**: Design documents from `/specs/024-goals-management/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)

---

## Phase 1: Setup

No new packages or project structure initialisation required — all dependencies already exist.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared infrastructure all user stories depend on — API type, route file, router registration, and context. No user story work can begin until this phase is complete.

**⚠️ CRITICAL**: Complete all four tasks before starting any user story phase.

- [ ] T001 [P] Add `ApiGoal` interface to `src/types/api.ts` — fields: `id`, `userId`, `name`, `type` (union of 4 goal type literals), `targetAmount: string`, `targetDate: string | null`, `linkedAccountId: string | null`, `categoryName: string | null`, `currentAmount: string | null`, `status` (union of 3 status literals), `createdAt: string`, `updatedAt: string`; add comment "numeric string — call parseFloat() before arithmetic" on `targetAmount` and `currentAmount`
- [ ] T002 [P] Create `src/server/routes/goals.ts` — export `goalsRouter`, define `GOAL_TYPES` and `GOAL_STATUSES` const arrays, write `createGoalSchema` and `updateGoalSchema` with Zod including two `.refine()` calls each for categoryName/type cross-field enforcement (see data-model.md for exact schemas); implement all four handlers: `GET /` (select all for userId ordered by createdAt ASC, return `{ goals: rows }`), `POST /` (insert + returning, 201), `PATCH /:id` (build updates object with `updatedAt: new Date()`, update where id+userId, 404 if not found), `DELETE /:id` (delete where id+userId, 204, 404 if not found); follow `src/server/routes/assets.ts` pattern exactly
- [ ] T003 Register `goalsRouter` in `src/server/index.ts` — import from `./routes/goals.ts` and add `app.use("/api/goals", goalsRouter)` after the existing liabilities route
- [ ] T004 Create `src/context/GoalsContext.tsx` — export `GoalsContextValue` interface (`goals: ApiGoal[]`, `isLoading: boolean`, `addGoal`, `updateGoal`, `removeGoal`); implement `GoalsProvider` with `useEffect` cancellation-token fetch of `GET /api/goals`; implement `addGoal` (tempId optimistic insert → POST → replace with server row or rollback), `updateGoal` (snapshot → optimistic apply → PATCH → replace or restore), `removeGoal` (snapshot + index → filter out → DELETE → splice back on failure); export `useGoals` hook; follow `src/context/NetWorthContext.tsx` pattern exactly

**Checkpoint**: Backend routes are live, context is ready — user story implementation can begin.

---

## Phase 3: User Story 1 — Create a New Goal (Priority: P1) 🎯 MVP

**Goal**: User can navigate to `/goals`, click "Add goal", fill in the form, and see the new goal appear immediately in the list.

**Independent Test**: Navigate to `/goals` as an authenticated user — verify "Add goal" button is present, clicking it opens a modal form, submitting a valid savings target creates the goal and it appears in the page's goal list. Also verify the form rejects an empty name and a target amount of 0.

- [ ] T005 [P] [US1] Create `src/components/goals/GoalModal.css` — style the modal backdrop and panel following the class naming pattern of `src/components/net-worth/NetWorthModal.css`; include responsive styles so the modal is usable at 375px viewport width with no horizontal overflow
- [ ] T006 [US1] Create `src/components/goals/GoalModal.tsx` (add mode only) — props: `onClose: () => void`; state: `name`, `type` (default `"savings_target"`), `targetAmount`, `targetDate`, `linkedAccountId`, `categoryName`, `isSubmitting`, per-field error strings; behaviour: when `type` changes to `"spending_limit"` show `categoryName` text input, when type changes away clear and hide it; validate name (1–100 chars) and targetAmount (> 0) inline on blur; on save call `addGoal` from `useGoals()`, on success call `onClose()`, on failure set `isSubmitting(false)`; disable both buttons while `isSubmitting`; use `useAccount()` for linked account select options; follow `src/components/net-worth/AssetModal.tsx` isSubmitting pattern
- [ ] T007 [US1] Create `src/pages/GoalsPage.tsx` — call `useGoals()` for goals/isLoading; render page header with "Add goal" button; render a flat list of all goals (no sections yet, no GoalCard yet — just name + type text per row as a placeholder); manage `GoalModal` open/close state (`modalOpen: boolean`); show basic empty state text when `goals.length === 0`
- [ ] T008 [P] [US1] Add `/goals` route and `GoalsProvider` wrap to `src/App.tsx` — import `GoalsProvider` and `GoalsPage`; add `<Route path="/goals" element={<GoalsProvider><GoalsPage /></GoalsProvider>} />` inside the protected app-shell Routes, alongside the existing `/net-worth` route
- [ ] T009 [P] [US1] Add Goals nav entry to the `NAV` constant in `src/components/Sidebar.tsx` — insert `{ path: "/goals", icon: "◉", label: "Goals" }` between the Net Worth and Settings entries

**Checkpoint**: User can create goals and see them listed. MVP is demonstrable.

---

## Phase 4: User Story 2 — View the Goals List (Priority: P1)

**Goal**: Goals are displayed as styled cards with progress bars; active goals appear in a primary section; achieved and abandoned goals appear in a collapsed secondary section; mobile layout works at 375px.

**Independent Test**: With one active goal (currentAmount set to $5,000, targetAmount $20,000) and one achieved goal — verify: active section shows the 25%-progress bar and all goal fields; achieved section is collapsed by default with a toggle to expand; at 375px viewport width no text or bar overflows horizontally; a goal with null currentAmount shows "Progress will update automatically".

- [ ] T010 [US2] Create `src/components/goals/GoalCard.tsx` — props: `goal: ApiGoal`; render: name + type badge (map type value to human label e.g. `"savings_target"` → `"Savings Target"`), progress bar using `goalPercent` formula (`currentAmount != null ? Math.min(100, parseFloat(currentAmount) / parseFloat(targetAmount) * 100) : 0`) with inline width style, NZD-formatted `currentAmount` / `targetAmount` using `Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" })`, "Progress will update automatically" note when `currentAmount === null`, target date formatted if set, status badge on non-active goals; no action buttons yet (those come in US3–US5); ensure layout is responsive from 375px
- [ ] T011 [US2] Update `src/pages/GoalsPage.tsx` — replace flat list with `GoalCard` components; split goals into `active` (status `"active"`) and `completed` (status `"achieved"` or `"abandoned"`); render active goals prominently at top; render completed section below with a collapse/expand toggle (default collapsed); show empty state prompt ("No active goals yet — add one to get started") only when active list is empty

**Checkpoint**: Goals list is fully styled and navigable. US1 + US2 together form a shippable MVP.

---

## Phase 5: User Story 3 — Edit a Goal (Priority: P2)

**Goal**: User can open any goal in an edit form, change any field including manual progress, save, and see changes reflected immediately.

**Independent Test**: Edit an active goal — change name, increase targetAmount, set currentAmount to a manual value — verify all three changes appear immediately on the GoalCard without page reload.

- [ ] T012 [US3] Extend `src/components/goals/GoalModal.tsx` for edit mode — add optional `goal?: ApiGoal` prop; when `goal` is provided (edit mode) pre-populate all form fields (`name`, `type`, `targetAmount`, `targetDate`, `linkedAccountId`, `categoryName`); add a `currentAmount` number input (label "Current progress (NZD)", optional) shown only in edit mode; on save call `updateGoal(goal.id, { ... })` instead of `addGoal`; modal title changes to "Edit Goal" vs "Add Goal"
- [ ] T013 [P] [US3] Add `onEdit: (goal: ApiGoal) => void` prop to `src/components/goals/GoalCard.tsx` and render an "Edit" button that calls `onEdit(goal)`
- [ ] T014 [US3] Wire edit flow in `src/pages/GoalsPage.tsx` — change modal state from `boolean` to `ApiGoal | null | "add"` (null = closed, `"add"` = add mode, ApiGoal = edit mode); pass the selected goal to `GoalModal`; pass `onEdit` callback to each `GoalCard`

**Checkpoint**: Goals can be created and fully edited. US3 adds long-term utility.

---

## Phase 6: User Story 4 — Change Goal Status (Priority: P2)

**Goal**: User can mark any active goal as "achieved" or "abandoned" with a single button click; the goal moves immediately from the active section to the completed section.

**Independent Test**: With two active goals — mark one as "achieved" and the other as "abandoned"; verify both disappear from the active section and appear in the completed section immediately, with correct status badges.

- [ ] T015 [US4] Add status change buttons to `src/components/goals/GoalCard.tsx` — add `onStatusChange: (id: string, status: "achieved" | "abandoned") => void` prop; render "Mark achieved" and "Mark abandoned" buttons only when `goal.status === "active"`
- [ ] T016 [US4] Wire status change in `src/pages/GoalsPage.tsx` — pass `onStatusChange` callback to each `GoalCard` that calls `updateGoal(id, { status })` from `useGoals()`; the optimistic context update moves the goal between sections automatically

**Checkpoint**: Goal lifecycle management complete. Users can close out goals they've finished or abandoned.

---

## Phase 7: User Story 5 — Delete a Goal (Priority: P3)

**Goal**: User can permanently delete a goal after confirming via a prompt; the goal disappears immediately; cancelling the prompt leaves the goal unchanged.

**Independent Test**: Trigger delete on an active goal — verify a confirmation prompt appears; cancel and verify goal remains; confirm and verify goal is removed from all sections immediately.

- [ ] T017 [US5] Add delete button to `src/components/goals/GoalCard.tsx` — add `onDelete: (id: string) => void` prop; render a "Delete" button that calls `onDelete(goal.id)`
- [ ] T018 [US5] Add delete confirmation flow to `src/pages/GoalsPage.tsx` — add `pendingDeleteId: string | null` state; when `onDelete` fires set `pendingDeleteId`; render an inline confirmation prompt ("Delete this goal? This cannot be undone.") with "Confirm" and "Cancel" buttons; on confirm call `removeGoal(pendingDeleteId)` from `useGoals()` then clear state; on cancel clear state

**Checkpoint**: Full CRUD complete. All five user stories done.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T019 [P] Run `npx tsc --noEmit` from the project root and fix any type errors in `src/server/routes/goals.ts`, `src/types/api.ts`, `src/context/GoalsContext.tsx`, `src/pages/GoalsPage.tsx`, and `src/components/goals/`
- [ ] T020 Audit `src/components/goals/GoalModal.css` and `GoalCard` layout at 375px viewport — confirm modal form fields stack vertically with no overflow, progress bar fills its container, type badge and action buttons remain readable; add `max-width: 100%` / `overflow-x: hidden` guards as needed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately; T001 and T002 can run in parallel
- **US1 (Phase 3)**: ALL depend on Foundational completion; T005, T008, T009 can run in parallel after T004; T006 depends on T001 (ApiGoal type); T007 depends on T004 (GoalsContext)
- **US2 (Phase 4)**: Depends on US1 (GoalsPage must exist before updating it)
- **US3 (Phase 5)**: Depends on US2 (GoalCard must exist before adding edit button); T012 and T013 can run in parallel
- **US4 (Phase 6)**: Depends on US2 (GoalCard must exist before adding status buttons); T015 and T016 can run in parallel after T015
- **US5 (Phase 7)**: Depends on US2; T017 and T018 can run in parallel
- **Polish (Phase 8)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)** and **US2 (P1)**: Both P1; implement sequentially (US1 first, US2 extends it)
- **US3, US4, US5 (P2/P3)**: All depend on US2 completion; can be implemented in any order after US2

### Parallel Opportunities

Within Phase 2: T001 ‖ T002 → then T003 (needs T002) ‖ T004 (needs T001)
Within Phase 3: T005 ‖ T008 ‖ T009 (once T004 done) → then T006 → then T007
Within Phase 5: T012 ‖ T013 → then T014
Within Phase 6: T015 → T016
Within Phase 7: T017 → T018

---

## Parallel Example: Foundational Phase

```bash
# Start both in parallel immediately:
Task T001: Add ApiGoal to src/types/api.ts
Task T002: Create src/server/routes/goals.ts

# Then in parallel:
Task T003: Register goalsRouter in src/server/index.ts  (needs T002)
Task T004: Create src/context/GoalsContext.tsx          (needs T001)
```

## Parallel Example: User Story 1

```bash
# Once T004 is done, start in parallel:
Task T005: Create GoalModal.css
Task T008: Add /goals route to App.tsx
Task T009: Add Goals to Sidebar.tsx NAV

# Then:
Task T006: Create GoalModal.tsx        (needs T005 for CSS import)
# Then:
Task T007: Create GoalsPage.tsx        (needs T006 + T004)
```

---

## Implementation Strategy

### MVP (US1 + US2 only)

1. Complete Phase 2: T001–T004
2. Complete Phase 3 (US1): T005–T009
3. Complete Phase 4 (US2): T010–T011
4. **STOP and VALIDATE**: Create goals, verify cards display with progress bars, check active/completed split, check mobile at 375px
5. Ship — the goals list is functional and visually complete

### Incremental Delivery

1. Phase 2 + Phase 3 → MVP: create goals and see them (plain list)
2. Add Phase 4 → styled cards with progress bars, active/completed sections
3. Add Phase 5 → edit goals including manual progress
4. Add Phase 6 → mark achieved / abandoned
5. Add Phase 7 → delete with confirmation
6. Each phase independently testable before moving to the next

---

## Notes

- `targetAmount` and `currentAmount` are returned as numeric strings from postgres-js — always `parseFloat()` before arithmetic; always `String()` when writing to the DB update object
- The `updateGoal` optimistic update must convert numeric fields the same way as `addGoal` (string storage) to avoid type mismatches while the request is in flight
- `categoryName` enforcement in GoalModal: when type changes away from `spending_limit`, clear `categoryName` state to `""` (not null) in local state; pass `null` to `addGoal`/`updateGoal` when the field is empty
- The `pendingDeleteId` confirmation pattern in GoalsPage avoids a separate confirmation modal component — keep it inline for simplicity
- [P] tasks within the same phase touch different files — safe to run in parallel
