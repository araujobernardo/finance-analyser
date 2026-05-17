# Feature Specification: Financial Goals Data Model

**Feature Branch**: `023-goals-data-model`
**Created**: 2026-05-17
**Status**: Draft
**Input**: User description: "FA-GOAL-001 — Financial goals data model"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create a Savings Target Goal (Priority: P1)

A user wants to save $20,000 for a house deposit. They create a goal named "House deposit" of type "savings target" with a target amount of $20,000, an optional target date of 31 December 2027, and optionally link it to their savings bank account. The system stores the goal with an "active" status.

**Why this priority**: Savings targets are the most common goal type for a New Zealand personal finance user. All subsequent features (progress calculation, UI) depend on this record existing and being correctly structured.

**Independent Test**: Create a savings target goal with all required and optional fields — verify it is stored with the correct name, type, target amount, target date, linked account, and "active" status; verify retrieving it returns identical data.

**Acceptance Scenarios**:

1. **Given** a user with an existing savings bank account, **When** they create a goal with name "House deposit", type "savings_target", target amount $20,000, target date 2027-12-31, and that account linked, **Then** the goal is stored and retrievable with all fields intact and status "active".
2. **Given** a user with no bank accounts, **When** they create a goal with name "Emergency fund", type "savings_target", target amount $5,000, and no linked account or target date, **Then** the goal is stored with only the required fields and status "active".
3. **Given** a stored savings target goal, **When** a subsequent feature reads the goal, **Then** enough data is present to calculate progress (current saved amount vs target amount) using the linked account's transaction sum.

---

### User Story 2 - Create a Debt Payoff Goal (Priority: P1)

A user wants to pay off a $15,000 car loan. They create a goal named "Pay off car loan" of type "debt payoff" with a target amount of $15,000. Progress will be tracked by how much the outstanding balance has decreased.

**Why this priority**: Debt payoff is the second most common goal type and has a distinct progress direction (balance decreasing toward zero) that the data model must accommodate.

**Independent Test**: Create a debt payoff goal — verify it is stored with type "debt_payoff", correct target amount, and that the data model contains sufficient fields for progress calculation (current outstanding balance vs original target).

**Acceptance Scenarios**:

1. **Given** a user with a credit card account, **When** they create a goal with name "Pay off car loan", type "debt_payoff", target amount $15,000, and the credit card account linked, **Then** the goal is stored and retrievable with status "active".
2. **Given** a stored debt payoff goal, **When** a subsequent feature reads the goal, **Then** enough data is present to calculate progress (remaining balance toward zero) using the linked account's transaction data.

---

### User Story 3 - Create a Net Worth Milestone Goal (Priority: P2)

A user wants to reach a net worth of $100,000. They create a goal of type "net worth milestone" with a target amount. Progress is calculated from the overall net worth figure, not a specific account.

**Why this priority**: Less common than savings or debt goals; progress calculation requires the net worth total rather than a single account, making it a distinct data pattern.

**Independent Test**: Create a net worth milestone goal without a linked account — verify it is stored correctly and that the absence of a linked account is valid for this type.

**Acceptance Scenarios**:

1. **Given** a user, **When** they create a goal with name "Six-figure net worth", type "net_worth_milestone", target amount $100,000, and no linked account, **Then** the goal is stored with status "active" and no linked account.
2. **Given** a stored net worth milestone goal, **When** a subsequent feature reads the goal, **Then** enough data is present to calculate progress using the user's total net worth.

---

### User Story 4 - Create a Spending Limit Goal (Priority: P2)

A user wants to spend no more than $800 per month on dining and entertainment. They create a goal of type "spending limit" with a monthly target amount and a spending category. Progress is calculated from transaction data filtered by that category within the current month.

**Why this priority**: Spending limits have a different progress measurement cadence (monthly reset) and require a category field, making the data requirements distinct from accumulation-type goals.

**Independent Test**: Create a spending limit goal with a category — verify the category field is stored and retrievable, and that the data model supports monthly progress calculation.

**Acceptance Scenarios**:

1. **Given** a user, **When** they create a goal with name "Dining budget", type "spending_limit", target amount $800, and category "Dining", **Then** the goal is stored with the category field and status "active".
2. **Given** a stored spending limit goal with a category, **When** a subsequent feature reads the goal, **Then** enough data is present to calculate monthly spend against the limit for that category.

---

### User Story 5 - Update Goal Status (Priority: P2)

A user achieves their house deposit target. They mark the goal as "achieved". Alternatively, a user abandons a goal and marks it "abandoned". The system records the new status.

**Why this priority**: Status transitions are essential for lifecycle management and for filtering active vs. completed goals in subsequent UI features.

**Independent Test**: Update an active goal to "achieved" and separately to "abandoned" — verify the status field changes correctly and the goal remains retrievable with the new status.

**Acceptance Scenarios**:

1. **Given** an active savings target goal, **When** the user marks it "achieved", **Then** the stored status changes to "achieved" and all other fields remain unchanged.
2. **Given** an active debt payoff goal, **When** the user marks it "abandoned", **Then** the stored status changes to "abandoned".
3. **Given** a goal with status "achieved", **When** a subsequent feature lists goals, **Then** it can filter by status to show only active goals.

---

### Edge Cases

- What happens when a goal is created with a target date in the past? → The record is stored as-is; date validation is the responsibility of the API layer (FA-GOAL-002), not the data model.
- What happens when a spending limit goal has no category? → The category field is optional; a spending limit goal without a category applies to total spending across all categories.
- What happens when a linked account is deleted? → The `linkedAccountId` reference is set to null (cascade behaviour defined at the data layer); the goal remains with no linked account.
- What happens when a net worth milestone goal has a linked account set? → The data model permits it; the progress calculation feature (FA-GOAL-003) determines whether to use the account or the net worth total.
- Can a user have multiple goals of the same type? → Yes — the data model imposes no uniqueness constraint on goal type per user.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST store each goal with a user-provided name (1–100 characters).
- **FR-002**: The system MUST store a goal type for each goal; the valid types are: `savings_target`, `debt_payoff`, `net_worth_milestone`, `spending_limit`.
- **FR-003**: The system MUST store a target amount for each goal (a positive monetary value in NZD).
- **FR-004**: The system MUST support an optional target date for each goal (a calendar date by which the user aims to reach the target).
- **FR-005**: The system MUST support an optional link from a goal to one of the user's existing bank accounts.
- **FR-006**: The system MUST support an optional spending category field for goals of type `spending_limit`.
- **FR-007**: The system MUST store a status for each goal; valid statuses are: `active`, `achieved`, `abandoned`. New goals default to `active`.
- **FR-008**: The system MUST associate each goal with the user who created it; one user's goals MUST NOT be accessible to another user.
- **FR-009**: The system MUST record when each goal was created and when it was last modified.
- **FR-010**: The data model MUST store sufficient information for a subsequent feature to calculate progress for all four goal types without requiring schema changes.
- **FR-011**: When a linked bank account is deleted, the goal's account link MUST be cleared automatically (the goal itself is not deleted).

### Key Entities _(include if feature involves data)_

- **Goal**: The central entity. Fields: `id`, `userId` (FK to user), `name`, `type` (enum: savings_target / debt_payoff / net_worth_milestone / spending_limit), `targetAmount` (positive monetary), `targetDate` (optional date), `linkedAccountId` (optional FK to bank account), `category` (optional text, used by spending_limit type), `status` (enum: active / achieved / abandoned, default active), `createdAt`, `updatedAt`.
- **User**: Existing entity. Each user owns zero or more goals.
- **BankAccount**: Existing entity. A goal may optionally reference one bank account for automatic progress calculation.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All four goal types (savings target, debt payoff, net worth milestone, spending limit) can be created and retrieved with 100% of their required fields intact.
- **SC-002**: A goal record contains all data needed for the FA-GOAL-003 progress calculation feature to function for every goal type, with zero additional schema changes required.
- **SC-003**: Goal status can be updated independently of other fields; status transitions (active → achieved, active → abandoned) are reflected immediately on retrieval.
- **SC-004**: Goals are fully isolated by user — a query for one user's goals never returns another user's data.
- **SC-005**: Deleting a bank account does not delete associated goals; the goals remain accessible with the account link cleared.

## Assumptions

- The existing `accounts` table (bank accounts) is already in place and will be the target of the optional `linkedAccountId` foreign key.
- The existing `users` table is in place and will be the target of the `userId` foreign key.
- Monetary amounts are stored as fixed-precision decimal values, matching the convention used everywhere else in the application.
- The `goals` table already exists in the schema (introduced as a stub in an earlier feature) — this feature defines its complete, final structure. If it does not yet exist, a new table is created.
- Currency is always NZD; no multi-currency support is needed.
- This feature delivers the data layer only: no API endpoints, no UI, and no progress calculation logic. Those are scoped to FA-GOAL-002 and FA-GOAL-003 respectively.
- The `category` field for spending limit goals stores a free-text category name (matching the category values already used in the transactions table) rather than a foreign key.
