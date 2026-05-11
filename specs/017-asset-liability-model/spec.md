# Feature Specification: FA-NW-001 — Asset and Liability Data Model

**Feature Branch**: `017-asset-liability-model`  
**Created**: 2026-05-11  
**Status**: Draft  
**Input**: User description: "FA-NW-001 — Asset and liability data model"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Store a new asset (Priority: P1)

A user wants to record something they own — for example, a property, a KiwiSaver fund, or a vehicle — so that it can later be included in their net worth calculation. They provide a name, type, and current estimated value. The record is tied to their account so no other user can see it.

**Why this priority**: This is the foundational write operation for the entire net worth feature set. Without it, no net worth data exists.

**Independent Test**: Can be verified by inserting an asset record for an authenticated user and confirming it is stored with the correct fields and scoped to that user only.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** an asset is created with a name, type, and current value, **Then** the record is persisted and associated with that user's ID
2. **Given** an asset record exists, **When** another user queries assets, **Then** the first user's asset is not returned
3. **Given** an asset is created, **When** the record is read back, **Then** name, type, current value, and creation timestamp are all present and correct

---

### User Story 2 — Store a new liability (Priority: P1)

A user wants to record something they owe — for example, a mortgage, a student loan, or a car loan — so that it can later be offset against their assets in a net worth calculation.

**Why this priority**: Equal in priority to assets; both sides of the net worth equation must be storable before any calculation is meaningful.

**Independent Test**: Can be verified by inserting a liability record and confirming correct fields, user scoping, and timestamp.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** a liability is created with a name, type, and current value, **Then** the record is persisted and associated with that user's ID
2. **Given** a liability record exists, **When** another user queries liabilities, **Then** the first user's liability is not returned
3. **Given** a liability is created, **When** the record is read back, **Then** name, type, current value, and creation timestamp are all present and correct

---

### User Story 3 — Link an asset or liability to an existing account (Priority: P2)

A user already tracks a savings account in the app. When they record it as an asset, they want to link it to that existing account so the system knows these refer to the same financial instrument. The link is optional — standalone assets and liabilities (e.g. property, investment fund) have no corresponding account.

**Why this priority**: Enhances data quality and enables future deduplication logic, but the data model is usable without it.

**Independent Test**: Can be verified by creating an asset with a valid account ID in the link field, and separately creating one without — both must succeed; the link field is nullable.

**Acceptance Scenarios**:

1. **Given** an existing account owned by the user, **When** an asset is created with that account's ID as the linked account, **Then** the link is stored and retrievable
2. **Given** a standalone asset with no linked account, **When** the record is created, **Then** it is stored successfully with a null link field
3. **Given** an account owned by a different user, **When** a user attempts to link an asset to it, **Then** the link is rejected

---

### User Story 4 — Update the value of an existing asset or liability (Priority: P2)

Market conditions change. A user's property may appreciate; their mortgage balance decreases with each repayment. The data model must support updating the current value of any asset or liability without losing the original record.

**Why this priority**: Values that cannot be updated become stale immediately. This is required for ongoing net worth accuracy.

**Independent Test**: Can be verified by updating the current value of an existing asset and confirming the new value is stored.

**Acceptance Scenarios**:

1. **Given** an existing asset, **When** its current value is updated, **Then** the stored value reflects the new amount
2. **Given** an existing liability, **When** its current value is updated, **Then** the stored value reflects the new amount
3. **Given** a user attempts to update an asset owned by another user, **Then** the update is rejected

---

### Edge Cases

- What happens when a linked account is deleted — are the asset/liability records affected or does the link become null?
- How does the system handle a current value of zero (fully paid off liability or zero-value asset)?
- What happens if an unsupported asset or liability type is submitted?
- Can two assets be linked to the same account?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST store asset records with the following fields: name, asset type, current value, optional linked account reference, owning user ID, and creation timestamp
- **FR-002**: The system MUST store liability records with the following fields: name, liability type, current value, optional linked account reference, owning user ID, and creation timestamp
- **FR-003**: The system MUST enforce that only the owning user can read or modify their own asset and liability records
- **FR-004**: Asset type MUST be one of: property, investments, KiwiSaver, savings, vehicle, other
- **FR-005**: Liability type MUST be one of: mortgage, personal loan, car loan, student loan, credit card, other
- **FR-006**: Current value MUST be stored as a precise decimal number supporting at least two decimal places
- **FR-007**: The linked account field MUST be optional (nullable) — assets and liabilities may exist without a corresponding account
- **FR-008**: The linked account reference MUST point to a valid account owned by the same user when provided
- **FR-009**: The system MUST support updating the current value of any existing asset or liability record
- **FR-010**: Every asset and liability record MUST store the timestamp at which it was created
- **FR-011**: The data model MUST be applied to the database via a versioned migration so the schema change is repeatable and reversible

### Key Entities

- **Asset**: Something of value owned by the user. Identified by a unique ID. Has a name (free text), type (enum), current value (decimal), optional link to an existing account, user ID (owner), and creation timestamp.
- **Liability**: Something owed by the user. Identified by a unique ID. Has a name (free text), type (enum), current value (decimal), optional link to an existing account, user ID (owner), and creation timestamp.
- **Asset Type**: Enumeration — `property`, `investments`, `kiwisaver`, `savings`, `vehicle`, `other`
- **Liability Type**: Enumeration — `mortgage`, `personal_loan`, `car_loan`, `student_loan`, `credit_card`, `other`

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Asset and liability records can be created, read, and updated without data loss or corruption
- **SC-002**: No user can access another user's asset or liability records under any query path
- **SC-003**: The migration runs to completion without error on a clean database and on a database that already contains existing user, account, and transaction data
- **SC-004**: The migration can be rolled back cleanly, leaving the database in its pre-migration state
- **SC-005**: All six asset types and all six liability types are enforceable at the data layer — records with invalid types are rejected
- **SC-006**: A linked account reference that belongs to a different user is rejected at the data layer

## Assumptions

- Currency is stored as a plain decimal number; no multi-currency support is required at this stage
- Deletion of assets and liabilities is out of scope for this feature (data model only — no API endpoints)
- Historical value tracking (e.g. value snapshots over time) is out of scope; only the current value is stored
- The linked account field references the existing `accounts` table introduced in FA-MIGR-001
- When a linked account is deleted, the asset/liability record is retained with the link set to null (ON DELETE SET NULL)
- A single account may be linked to at most one asset and at most one liability (this constraint can be relaxed in a future feature if needed)
- User IDs reference the existing `users` table
- This feature delivers schema and migration only — no API endpoints, no UI, no net worth calculations
