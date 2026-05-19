# Feature Specification: FA-GOAL-004 — Goals Summary Widget on Dashboard

**Feature Branch**: `026-dashboard-goals-widget`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "FA-GOAL-004 — Goals summary widget on dashboard"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Dashboard Shows Top Goals at a Glance (Priority: P1)

A user opens the Finance Analyser dashboard after their morning banking check. Without navigating away, they immediately see their top 3 active goals with progress bars and status labels (On Track / At Risk / Behind), giving them a quick sense of where they stand.

**Why this priority**: This is the core value proposition of the feature — surfacing goal progress on the dashboard without extra navigation. Everything else (empty state, navigation) depends on this working.

**Independent Test**: Create 3+ active goals with varying progress levels. Open the dashboard — the widget shows the top 3 goals with names, types, progress bars, and status labels. The widget renders without any additional network calls.

**Acceptance Scenarios**:

1. **Given** the user has 3 or more active goals, **When** they open the dashboard, **Then** the widget displays exactly the top 3 goals, each showing: goal name, goal type badge, progress bar, progress percentage, and a status label (On Track / At Risk / Behind) if a target date is set.
2. **Given** a goal has a target date set and current progress is within 10% of the linearly expected progress, **When** the widget renders, **Then** that goal's status label shows "On Track" in green.
3. **Given** a goal has a target date set and current progress is 10–25% behind expected, **When** the widget renders, **Then** that goal's status label shows "At Risk" in amber.
4. **Given** a goal has a target date set and current progress is more than 25% behind expected, **When** the widget renders, **Then** that goal's status label shows "Behind" in red.
5. **Given** a goal has no target date set, **When** the widget renders, **Then** that goal shows only the raw progress percentage — no status label is displayed.

---

### User Story 2 — Empty State Prompts Goal Creation (Priority: P2)

A new user or a user who has no active goals opens the dashboard. Instead of an empty or broken widget, they see a friendly prompt encouraging them to create their first goal.

**Why this priority**: Without this, the widget would look broken for new users. Important for onboarding but secondary to the core goal display.

**Independent Test**: Log in with an account that has no active goals. Open the dashboard — the widget shows an empty state with a prompt and a link/button to create a goal.

**Acceptance Scenarios**:

1. **Given** the user has no active goals, **When** they open the dashboard, **Then** the goals widget displays an empty state message (e.g., "No active goals yet") and a prompt to create their first goal.
2. **Given** the user has only achieved or abandoned goals (no active ones), **When** they open the dashboard, **Then** the empty state is shown (achieved/abandoned goals are not displayed in the widget).
3. **Given** the user creates their first goal and returns to the dashboard, **When** the Goals data refreshes, **Then** the empty state is replaced by the goal card.

---

### User Story 3 — Widget Links to Full Goals Page (Priority: P3)

A user sees their top 3 goals on the dashboard and wants to see all their goals or take action on one. The widget provides a clear navigation path to the full goals page.

**Why this priority**: Navigation is a secondary concern once the widget content is working. Low-friction but not blocking.

**Independent Test**: Click the "See all goals" link on the dashboard widget — the app navigates to the Goals page.

**Acceptance Scenarios**:

1. **Given** the widget is displayed, **When** the user clicks the "See all goals" link, **Then** they are taken to the full Goals page.
2. **Given** the widget is in the empty state, **When** the user clicks the "Create your first goal" prompt, **Then** they are taken to the Goals page (where the Add Goal modal can be opened).

---

### Edge Cases

- What happens if a goal has `currentAmount = null` (not yet calculated by FA-GOAL-003)? Show the progress bar at 0% with no status label, regardless of target date.
- What if `targetAmount` is zero? Show progress at 0% with no status label (avoid division-by-zero).
- What if `createdAt` equals `targetDate` (zero-duration goal)? Treat as no target date — show raw progress only, no status label.
- What if there are exactly 1 or 2 active goals? Show only those goals (do not pad to 3).
- What if a goal's expected progress exceeds 100% (target date passed, goal not achieved)? Status is "Behind" regardless of actual progress.
- What if the user has more than 3 active goals? Show only the top 3; the rest are visible on the Goals page via the "See all goals" link.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The dashboard MUST include a goals summary widget that displays up to 3 active goals without making any additional network requests beyond those already made by the dashboard.
- **FR-002**: The widget MUST source goal data from the existing shared goals data store (already loaded when the user is authenticated) — no new data fetching is introduced by this widget.
- **FR-003**: The widget MUST display goals in the following priority order: goals with a target date, sorted by closest target date first; then goals without a target date, sorted by most recently updated first.
- **FR-004**: For each displayed goal, the widget MUST show: the goal name, goal type, a progress bar reflecting `currentAmount / targetAmount`, and the progress as a percentage.
- **FR-005**: For goals with a target date, the widget MUST show a status label — one of "On Track", "At Risk", or "Behind" — based on comparison of actual vs. linearly expected progress.
- **FR-006**: Status MUST be calculated as follows: compute expected progress percentage = (days elapsed since goal creation / total days from creation to target date) × 100. If actual progress is within 10 percentage points of expected → "On Track". If actual progress is 10–25 percentage points behind expected → "At Risk". If actual progress is more than 25 percentage points behind expected → "Behind".
- **FR-007**: For goals without a target date, the widget MUST show only the raw progress percentage — no status label.
- **FR-008**: When the user has no active goals, the widget MUST display an empty state with a message and a prompt to create a goal.
- **FR-009**: The widget MUST include a navigation link labelled "See all goals" that takes the user to the full Goals page.
- **FR-010**: Goals with status "achieved" or "abandoned" MUST NOT appear in the widget.
- **FR-011**: If `currentAmount` is null or `targetAmount` is zero, the widget MUST show progress at 0% with no status label.
- **FR-012**: If `createdAt` equals `targetDate` (zero-duration goal), the widget MUST treat it as a goal without a target date and show raw progress only.

### Key Entities

- **Goal (displayed in widget)**: `name`, `type`, `currentAmount`, `targetAmount`, `targetDate`, `createdAt`, `status` — all sourced from the existing goals data store; no new fields required.
- **Goal Status Label**: Derived at render time from `currentAmount`, `targetAmount`, `targetDate`, `createdAt` — not stored; computed client-side.
- **Expected Progress**: `(daysElapsed / totalDays) × 100` where `daysElapsed = today − createdAt` and `totalDays = targetDate − createdAt`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The goals widget is visible on the dashboard on every visit for users with active goals — zero additional page loads or navigation steps required.
- **SC-002**: The widget renders with up-to-date goal data on the same page load as the rest of the dashboard — no separate loading state or spinner specific to goals.
- **SC-003**: Status labels are accurate in 100% of automated test cases covering the three thresholds (On Track / At Risk / Behind) and the no-target-date case.
- **SC-004**: Users with no active goals see a clear prompt, not a broken or empty widget — validated by a component test for the empty state.
- **SC-005**: The "See all goals" link navigates to the Goals page in a single click — verified by an interaction test.
- **SC-006**: The widget handles all defined edge cases (null currentAmount, zero targetAmount, zero-duration goal, 1–2 goals, >3 goals) without error or broken layout.

## Assumptions

- Goal data is already loaded and available in the app's shared data store when the dashboard renders — no new API calls are needed.
- The goals data store already exposes `createdAt` on each goal object.
- "Days elapsed" and "total days" are computed using calendar days (not business days).
- Progress percentage is always capped at 100% for display purposes in the progress bar, even if `currentAmount > targetAmount` (over-target goals still show a full bar).
- The widget occupies a dedicated section of the dashboard layout — the exact visual position is a design decision for the Designer agent, not defined in this spec.
- The "See all goals" link and the "Create your first goal" prompt both navigate to the Goals page — opening the Add Goal modal directly is out of scope.
- Spending limit goals where `currentAmount > targetAmount` (over-limit) are treated as 100% progress in the widget bar (over-limit visual state is a Goals page concern, not the dashboard widget).
- This feature depends on FA-GOAL-002 (Goals page and GoalCard) and FA-GOAL-003 (auto-calculation) being delivered first.
