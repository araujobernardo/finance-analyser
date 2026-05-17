# Feature Specification: Goals Creation and Management UI and API

**Feature Branch**: `024-goals-management`
**Created**: 2026-05-17
**Status**: Draft
**Input**: User description: "FA-GOAL-002 — Goals creation and management UI and API"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create a New Goal (Priority: P1)

A user wants to start tracking a financial target. They navigate to the Goals section of the application and create a new goal by providing a name, choosing a goal type, entering a target amount, and optionally setting a target date and linking one of their bank accounts. For a spending limit goal, they also specify which spending category the limit applies to. After saving, the goal appears immediately in their active goals list with an empty progress indicator.

**Why this priority**: Without the ability to create goals, none of the other stories are possible. Goal creation is the entry point for the entire goals feature and must work before anything else can be tested or demonstrated.

**Independent Test**: Create one goal of each type (savings target, debt payoff, net worth milestone, spending limit) — verify each is stored correctly with all provided fields and appears in the active goals list with status "active". Test with and without optional fields.

**Acceptance Scenarios**:

1. **Given** a user with no existing goals, **When** they create a goal with name "House deposit", type "savings target", target amount $20,000, and target date 2027-12-31, **Then** the goal appears in the active goals list with all fields shown and status "active".
2. **Given** a user with an existing bank account, **When** they create a goal and link that account, **Then** the goal displays the linked account name.
3. **Given** a user creating a spending limit goal, **When** they select type "spending limit" and specify category "Dining", **Then** the category field is stored and displayed on the goal.
4. **Given** a user, **When** they create a goal and omit the target date and linked account, **Then** the goal is saved successfully with those fields blank.
5. **Given** a user, **When** they submit a goal form with a missing required field (name or target amount), **Then** the form displays a clear error and does not save.

---

### User Story 2 - View the Goals List (Priority: P1)

A user with existing goals visits the Goals section. They see their active goals displayed prominently — each goal card shows the name, type, target amount, target date (if set), and a progress indicator based on any recorded current amount. Achieved and abandoned goals are accessible but visually less prominent, grouped below the active goals. The page works correctly on both desktop and mobile screens.

**Why this priority**: Viewing the list is the primary daily interaction with the goals feature. Together with creation (US1), the list view delivers a complete and demonstrable MVP — the user can add goals and see them.

**Independent Test**: With at least one active goal and one each of achieved and abandoned status — verify that active goals appear in the primary section, achieved and abandoned appear in a secondary section, each goal card shows correct fields, and the layout is usable on a 375px-wide mobile screen.

**Acceptance Scenarios**:

1. **Given** a user with three active goals, **When** they visit the Goals page, **Then** all three goals are shown in the active section, each with name, type, target amount, target date, and progress indicator.
2. **Given** a goal with a recorded current amount of $5,000 and a target of $20,000, **When** the user views the goals list, **Then** the progress indicator shows approximately 25% progress.
3. **Given** a goal with no recorded current amount, **When** the user views the goals list, **Then** the progress indicator clearly communicates that progress has not yet been recorded.
4. **Given** a user with one active and one achieved goal, **When** they visit the Goals page, **Then** the active goal appears prominently above and the achieved goal appears in a de-emphasised section below.
5. **Given** a user with no goals, **When** they visit the Goals page, **Then** an empty state is shown with a prompt to create the first goal.
6. **Given** the user is on a mobile device (375px wide screen), **When** they view the goals list, **Then** all goal information is readable without horizontal scrolling.

---

### User Story 3 - Edit a Goal (Priority: P2)

A user needs to update a goal — for example, increasing a savings target, adding a target date they initially skipped, or recording their current progress manually. They open the edit form for any goal, change the desired fields, and save. The updated information is immediately reflected in the list. They can also update the current progress amount to reflect how far they have come.

**Why this priority**: Goals change over time. Without editing, the data quickly becomes stale and the feature loses long-term utility. It is second priority because read-only viewing of created goals already delivers value.

**Independent Test**: Edit a goal to change its name, target amount, and current progress amount — verify all three changes are reflected immediately in the goals list.

**Acceptance Scenarios**:

1. **Given** an active goal with a target of $20,000, **When** the user edits it and changes the target to $25,000, **Then** the goal shows the new target and the progress indicator adjusts accordingly.
2. **Given** a goal with no target date, **When** the user edits it and adds a target date, **Then** the date appears on the goal card.
3. **Given** a savings target goal, **When** the user records a current progress amount of $8,000, **Then** the progress indicator updates to reflect that amount against the target.
4. **Given** a spending limit goal, **When** the user edits the category name, **Then** the updated category is saved and displayed.
5. **Given** a user editing a goal, **When** they clear the linked account field, **Then** the goal is saved with no linked account.

---

### User Story 4 - Change Goal Status (Priority: P2)

A user completes their house deposit savings target and wants to mark it as achieved. Alternatively, they decide to stop tracking a debt payoff goal and mark it as abandoned. A status change moves the goal from the active section to the appropriate completed section in the list. The action requires just a single confirmation step — not a multi-step flow.

**Why this priority**: Status management is the core lifecycle action for goals. Without it, goals accumulate in the active list indefinitely with no way to mark completion.

**Independent Test**: Mark an active goal as "achieved" and a different active goal as "abandoned" — verify both move from the active to the de-emphasised section, and that the status change is immediate.

**Acceptance Scenarios**:

1. **Given** an active goal, **When** the user marks it as "achieved", **Then** the goal moves to the achieved section and is no longer shown in the active section.
2. **Given** an active goal, **When** the user marks it as "abandoned", **Then** the goal moves to the abandoned section.
3. **Given** an achieved goal, **When** the user views it in the de-emphasised section, **Then** its status is clearly labelled "achieved".
4. **Given** an abandoned goal, **When** the user views it, **Then** its status is clearly labelled "abandoned".

---

### User Story 5 - Delete a Goal (Priority: P3)

A user wants to permanently remove a goal they no longer need — for example, a test entry or a goal they have replaced with a newer version. They trigger the delete action, see a confirmation prompt asking them to confirm the permanent deletion, and confirm. The goal is removed from all lists immediately.

**Why this priority**: Deletion is important for data hygiene but carries irreversible consequences. Adding it after the core flows are stable is the safer approach.

**Independent Test**: Delete a goal and verify it no longer appears in any section of the goals list.

**Acceptance Scenarios**:

1. **Given** an active goal, **When** the user initiates delete, **Then** a confirmation prompt is shown before any data is removed.
2. **Given** the confirmation prompt, **When** the user confirms deletion, **Then** the goal is immediately removed from the list.
3. **Given** the confirmation prompt, **When** the user cancels, **Then** the goal remains unchanged.
4. **Given** a goal linked to a bank account, **When** the user deletes the goal, **Then** the bank account itself is not affected.

---

### Edge Cases

- What if the user enters a target amount of zero or a negative number? → The form must reject this with a clear error — target amounts must be positive.
- What if the target date is in the past? → Allowed; the user may be tracking a goal with a passed deadline. No error is shown.
- What if the linked bank account is deleted? → The goal's account link is cleared automatically (per FA-GOAL-001); the goal remains and the progress indicator shows progress is not yet recorded.
- What if a spending limit goal has no category specified? → Allowed; the goal applies to total spending when no category is set.
- What if currentAmount exceeds targetAmount? → Allowed; the progress indicator shows 100% or "over target".
- What if the user has a very large number of goals (e.g., 50+)? → All goals are listed; no pagination is required at this stage.
- What if two goals have the same name? → Allowed; no uniqueness constraint on goal names.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a dedicated Goals section accessible to authenticated users from the main navigation.
- **FR-002**: The system MUST allow users to create a goal with: name (1–100 characters), type (savings target / debt payoff / net worth milestone / spending limit), target amount (positive monetary value in NZD), optional target date, optional linked bank account, and optional spending category.
- **FR-003**: For goals of type "spending limit", the interface MUST present the spending category field prominently.
- **FR-004**: The system MUST validate all goal input and display field-level error messages when required fields are missing or values are invalid.
- **FR-005**: The system MUST display all of a user's goals on a single page without pagination.
- **FR-006**: The goals list MUST display active goals in a primary section and achieved/abandoned goals in a visually de-emphasised secondary section.
- **FR-007**: Each goal in the list MUST display: name, type, target amount, target date (if set), status, and a progress indicator.
- **FR-008**: The progress indicator MUST show the current amount as a proportion of the target amount when a current amount is recorded; it MUST communicate clearly when no current amount has been recorded.
- **FR-009**: The system MUST allow users to edit any goal's name, target amount, target date, linked account, category, and current progress amount.
- **FR-010**: The system MUST allow users to mark any active goal as "achieved" or "abandoned" in a single action with one confirmation step.
- **FR-011**: The system MUST allow users to delete any goal after displaying a confirmation prompt.
- **FR-012**: All goal operations (create, read, update, delete) MUST be strictly scoped to the authenticated user — a user can never view or modify another user's goals.
- **FR-013**: The Goals interface MUST be fully usable on mobile screens from 375px wide upwards without horizontal scrolling.
- **FR-014**: The system MUST reflect goal changes (create, edit, status change, delete) immediately in the goals list without requiring a full page reload.

### Key Entities _(include if feature involves data)_

- **Goal**: Central entity from FA-GOAL-001. Relevant fields for this feature: `id`, `name`, `type`, `targetAmount`, `targetDate`, `linkedAccountId`, `categoryName`, `currentAmount`, `status`, `createdAt`, `updatedAt`.
- **User**: Existing entity. All goals are owned by and scoped to a single user.
- **Bank Account**: Existing entity. A goal may optionally reference one bank account; the account name is displayed on the goal card when linked.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can create a goal of any type in under 60 seconds, including all optional fields.
- **SC-002**: All of a user's goals are visible on a single page — active goals appear before achieved and abandoned goals, with no pagination required.
- **SC-003**: A user can distinguish active goals from achieved and abandoned goals without reading status labels — the visual separation is immediately apparent.
- **SC-004**: Marking a goal as achieved or abandoned requires no more than two interactions (one to initiate, one to confirm).
- **SC-005**: Deleting a goal requires a confirmation step — accidental one-click deletion is not possible.
- **SC-006**: The goals list and all create/edit/delete actions work on a 375px-wide mobile screen without layout breakage or horizontal scrolling.
- **SC-007**: Goal data is completely isolated per user — a request authenticated as User A returns no goals belonging to User B.
- **SC-008**: Goal changes are reflected in the interface within one second of the user confirming an action, with no manual page refresh required.

---

## Assumptions

- The `goals` table from FA-GOAL-001 is in place with all required columns including `category_name`, `current_amount`, and `updated_at`.
- The existing bank accounts are available for users to link to goals; the accounts list is fetchable for the linked-account selector in the create/edit form.
- Transaction categories are stored as free text on transactions; for spending limit goals the category field accepts free-text input matching those values.
- Authentication is already implemented; all data operations require a valid session and the user's identity is derived server-side — never from client-supplied user IDs.
- The application already has an established navigation structure into which the Goals section will be added.
- `currentAmount` is only set via manual user input in the edit flow; automatic progress calculation from transaction data is out of scope (FA-GOAL-003).
- The exact visual design of the progress indicator (percentage bar, fraction, etc.) is left to the implementation; the spec requires only that it communicates progress clearly.
- Currency is always NZD; no currency conversion is needed.
- No bulk operations (bulk delete, bulk status change) are required at this stage.
