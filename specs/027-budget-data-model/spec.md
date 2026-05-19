# Feature Specification: FA-BUDG-001 — Monthly Budget Data Model

**Feature Branch**: `027-budget-data-model`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "FA-BUDG-001 — Monthly budget data model"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Monthly Budget Record per Category (Priority: P1)

A user decides they want to spend no more than $500 on Groceries in May 2026. The system must be able to store that intent, retrieve it, update it if the user changes their mind, and delete it if they decide not to budget that month. A second budget for the same category and month must be rejected — the user can only have one limit per category per month.

**Why this priority**: This is the core entity of the feature. Everything else — defaults, settings, spending comparisons in FA-BUDG-002 — depends on the ability to persist and uniquely identify a monthly budget.

**Independent Test**: Insert a budget record (user, "Groceries", 2026, 5, $500). Retrieve it — returns the stored limit. Update the limit to $400 — the record reflects the change. Attempt to insert a second budget for the same user + category + month — the system rejects the duplicate. Delete the record — it no longer exists.

**Acceptance Scenarios**:

1. **Given** a user has no existing budget for "Groceries" in May 2026, **When** a budget of $500 is created, **Then** the record is stored with the correct user, category, year (2026), month (5), and limit amount ($500).
2. **Given** a user has a "Groceries" budget for May 2026, **When** the limit is updated to $400, **Then** the stored limit reflects $400 and the month and category remain unchanged.
3. **Given** a user already has a "Groceries" budget for May 2026, **When** a second budget for the same user, category, and month is created, **Then** the operation is rejected — uniqueness is enforced at the data layer.
4. **Given** a user has a "Groceries" budget for May 2026 and a separate one for June 2026, **When** the May budget is deleted, **Then** only the May record is removed; the June budget is unaffected.
5. **Given** a user has a "Groceries" budget for May 2026, **When** another user's budget for the same category and month is created, **Then** both records coexist — uniqueness is per user.

---

### User Story 2 — Default Budget Configuration per Category (Priority: P2)

A user wants to set $500 as their standing Groceries limit so that every new month they don't have to re-enter it. The system stores a default limit per category for that user. This default can later be used by FA-BUDG-002 to seed a monthly budget when the month begins, without requiring manual entry.

**Why this priority**: Default budgets are a strong quality-of-life improvement but are not required for the core budget model to function. Without defaults, users can still create monthly budgets manually — the data layer still delivers value.

**Independent Test**: Create a default budget for "Groceries" at $500. Retrieve it — returns $500. Update it to $600 — reflects the new value. Delete it — no default exists for "Groceries" for that user. Confirm a second default for the same user + category is rejected.

**Acceptance Scenarios**:

1. **Given** a user has no default for "Groceries", **When** a default limit of $500 is stored, **Then** the record persists with the correct user, category, and limit.
2. **Given** a user has a "Groceries" default of $500, **When** it is updated to $600, **Then** the stored default reflects $600.
3. **Given** a user has a "Groceries" default, **When** a second default for the same user and category is created, **Then** the operation is rejected — one default per user per category.
4. **Given** a user has a "Groceries" default and a "Dining" default, **When** the "Groceries" default is deleted, **Then** only the "Groceries" default is removed; "Dining" default is unaffected.
5. **Given** two users each have a "Groceries" default, **Then** both records coexist independently.

---

### User Story 3 — Configurable Month Start Day per User (Priority: P3)

A user is paid on the 15th of each month and considers that their personal month boundary — they want to track Groceries spending from the 15th to the 14th of the following month, not from the 1st. The system stores their preferred month start day so FA-BUDG-002 can compute the correct date range when comparing actual spending to a budget.

**Why this priority**: The configurable start day affects the correctness of FA-BUDG-002 spending comparisons, but does not affect the core budget data model. A system that always defaults to the 1st is still functional and useful; the configurable start day is an enhancement.

**Independent Test**: Store a month start day of 15 for a user. Retrieve it — returns 15. Update it to 20 — returns 20. Delete/reset it — returns the default of 1. Confirm only one start-day setting exists per user.

**Acceptance Scenarios**:

1. **Given** a user has no start-day configured, **When** the setting is read, **Then** the effective value is 1 (first of the month).
2. **Given** a user sets their month start day to 15, **When** the setting is stored, **Then** the value 15 is persisted against that user.
3. **Given** a user has a start day of 15, **When** they update it to 20, **Then** the stored value reflects 20.
4. **Given** a user's month start day is set to 15, **When** FA-BUDG-002 queries the setting for that user, **Then** it receives 15 and can use it to compute budget date ranges.

---

### Edge Cases

- What if `limitAmount` is zero? A zero limit is valid — the user wants to spend nothing in that category this month. The data model must store and return it without special treatment.
- What if a budget is created for a past month? The data model imposes no restriction on past or future months — historical budgets are valid for retrospective analysis.
- What if `monthStartDay` is set to 29, 30, or 31? These values are explicitly out of range. The data model must reject them — only 1–28 are valid, ensuring the start day is meaningful in every calendar month, including February.
- What if a user has no default budget for a category? The absence of a default is a valid state — no fallback is applied at the data layer; that logic belongs to FA-BUDG-002.
- What if a user deletes a default budget after monthly budgets have already been created from it? The monthly budgets are unaffected — they are independent records once created.
- What if `limitAmount` is negative? Negative limits are invalid — the data model must reject them.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The data model MUST support storing a monthly budget record that uniquely identifies a spending limit by user, category name, year, and month number.
- **FR-002**: The data model MUST enforce uniqueness of (user, category, year, month) at the data layer — only one budget record per user per category per calendar month is permitted.
- **FR-003**: Each monthly budget record MUST store: the spending limit amount (non-negative), the category name, the year (integer), the month number (integer 1–12), and the owning user.
- **FR-004**: Monthly budget records MUST be independently updatable and deletable — changes to one month's budget must not affect budgets in other months.
- **FR-005**: The data model MUST support a default budget entity that stores a preferred spending limit per user per category, independent of any specific month.
- **FR-006**: The data model MUST enforce uniqueness of (user, category) for default budgets — only one default per user per category is permitted.
- **FR-007**: Default budget records MUST be independently updatable and deletable without affecting any existing monthly budget records.
- **FR-008**: The data model MUST store a month start day setting per user — an integer in the range 1–28 representing the day of the month on which the user's budget period begins.
- **FR-009**: If no month start day is configured for a user, the system MUST treat the effective start day as 1.
- **FR-010**: The data model MUST reject invalid month start day values outside the range 1–28.
- **FR-011**: The data model MUST expose all stored budget data in a form that allows FA-BUDG-002 to: retrieve all budgets for a user in a given month; determine the effective start and end date of a budget period given a user's month start day setting; fall back to a default budget limit when no explicit monthly budget exists for a category.
- **FR-012**: Spending limit amounts MUST be non-negative; negative values MUST be rejected at the data layer.

### Key Entities

- **Monthly Budget**: Represents a user's spending limit for a specific category within a specific calendar month. Identified by user, category name, year, and month number. Stores the limit amount.
- **Default Budget**: Represents a user's preferred standing limit for a category, used as the starting point for new months. Identified by user and category name. Stores the default limit amount. Independent of any specific month.
- **Budget Settings** (per user): Stores the user's preferred month start day (1–28). Determines the date range used by FA-BUDG-002 when calculating spending within a budget period.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The uniqueness constraint on (user, category, year, month) is enforced at the data layer — verified by automated tests that attempt duplicate inserts and confirm they are rejected without application-layer logic.
- **SC-002**: The uniqueness constraint on (user, category) for default budgets is enforced at the data layer — verified by automated tests.
- **SC-003**: The month start day range constraint (1–28) is enforced at the data layer — values of 0, 29, 30, 31, and negative values are rejected.
- **SC-004**: All CRUD operations (create, read, update, delete) across all three entities are verified by automated tests with no failures.
- **SC-005**: FA-BUDG-002 can determine the effective budget for any user+category+month — including the fallback to default — using only the stored data, with zero ambiguity.
- **SC-006**: The schema migration for this feature runs to completion without manual intervention and is reversible.

## Assumptions

- Category names are stored as plain strings matching the `category` field already present on the `transactions` table — no separate categories table is introduced by this feature.
- "Month" is represented as a year integer plus a month-number integer (1–12), not as a date range — the date range is derived at query time using the month start day setting.
- Month start day is bounded to 1–28 (not 1–31) to guarantee the day is valid in every calendar month, including February in non-leap years. Days 29–31 are explicitly out of scope.
- `limitAmount` and `defaultLimitAmount` are non-negative numeric values; zero is a valid limit (the user wants to block all spending in that category). Currency is assumed to be a single currency (consistent with the existing transactions model).
- The data model does not auto-create monthly budgets from defaults — that seeding logic is FA-BUDG-002's responsibility.
- Budgets do not roll over automatically — each month's budget is an independent record; the data model makes no assumptions about prior-month state.
- This feature delivers the data schema and ORM entities only — no HTTP API endpoints, no UI components, and no spending calculation logic.
- This feature depends on the existing `users` table (FA-010).
- The existing transactions table already has a `category` column — no schema change is needed to that table for this feature.
