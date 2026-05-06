# Feature Specification: PostgreSQL Database Provisioning and Schema Migrations

**Feature Branch**: `008-postgresql-schema-migrations`
**Created**: 2026-05-05
**Status**: Draft

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Developer runs migrations on a fresh environment (Priority: P1)

A developer cloning the project for the first time needs to set up the database from scratch. They run a single command that creates all tables in the correct order, with all constraints and indexes, against a local PostgreSQL instance.

**Why this priority**: Everything else — API development, auth, data import — depends on this working first. No other story is unblockable until the schema exists.

**Independent Test**: Can be verified by pointing the migration tool at an empty database and confirming all tables are created with correct columns, types, and constraints.

**Acceptance Scenarios**:

1. **Given** an empty PostgreSQL database, **When** the migration command is run, **Then** all 7 tables are created with correct columns, data types, and constraints.
2. **Given** the migration has already been run, **When** the migration command is run again, **Then** it completes without error and makes no changes (idempotent).
3. **Given** the migration command is run, **When** it completes, **Then** a migrations tracking table records which migrations have been applied and when.

---

### User Story 2 — Developer adds a new column via a migration (Priority: P2)

A developer needs to add a new field to an existing table in a future phase. They create a new migration file and run the migration command. The column is added without touching existing data.

**Why this priority**: Safe schema evolution is the core value of a migration system. Without this, future features cannot evolve the database.

**Independent Test**: Can be verified by creating a follow-up migration that adds a column to an existing table and confirming existing rows are preserved.

**Acceptance Scenarios**:

1. **Given** an existing populated database, **When** a new migration file is added and the migration command is run, **Then** the schema change is applied and existing data is intact.
2. **Given** a migration was applied, **When** the migration command is run again, **Then** the already-applied migration is skipped and does not run twice.
3. **Given** a new developer clones the repo, **When** they run the migration command, **Then** all migrations (initial + subsequent) are applied in order.

---

### User Story 3 — Data is isolated per user (Priority: P3)

A future API developer building a query for any entity can rely on the schema to enforce that only data belonging to the authenticated user is returned. The schema itself expresses this ownership at the foreign-key level.

**Why this priority**: User isolation is a security constraint. If it is not in the schema from day one, future queries could accidentally expose another user's data.

**Independent Test**: Can be verified by inserting rows for two different users and confirming that filtering by `user_id` on each table returns only the correct rows.

**Acceptance Scenarios**:

1. **Given** two users each with their own accounts and transactions, **When** querying by `user_id`, **Then** each user sees only their own records.
2. **Given** an attempt to insert a transaction referencing an account that belongs to a different user, **When** that insert is attempted, **Then** it is rejected by a foreign-key or check constraint.

---

### Edge Cases

- What happens if the database connection is unavailable when the migration command is run?
- What happens if a migration file is deleted after it has already been applied?
- How are nullable vs. non-nullable columns handled for future `ALTER TABLE` migrations that add columns to populated tables?
- What if two developers create migrations with conflicting sequential numbers?

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a command to apply all pending migrations to a target PostgreSQL database.
- **FR-002**: The system MUST track which migrations have been applied so that each migration runs exactly once.
- **FR-003**: The system MUST create the following tables: `users`, `accounts`, `transactions`, `categories`, `assets`, `liabilities`, `goals`.
- **FR-004**: Every table except `users` MUST have a `user_id` foreign key referencing `users.id`, enforcing that all records are owned by a user.
- **FR-005**: The `accounts` table MUST store: account number, nickname, account type, and `user_id`.
- **FR-006**: The `transactions` table MUST store: date, amount, description, category, `is_transfer` boolean, `is_manual_transfer` boolean, and a foreign key to `accounts`.
- **FR-007**: The `categories` table MUST store: name and colour, scoped to a user.
- **FR-008**: The `assets` table MUST store: name, type, value, an optional `linked_account_id`, and `user_id`.
- **FR-009**: The `liabilities` table MUST store: name, type, value, and `user_id`.
- **FR-010**: The `goals` table MUST store: name, type, target amount, target date, an optional `linked_account_id`, status, and `user_id`.
- **FR-011**: The `users` table MUST store: email (unique), hashed password, display name, and `created_at` timestamp.
- **FR-012**: All tables MUST have a primary key (`id`) and a `created_at` timestamp.
- **FR-013**: The migration system MUST support applying migrations in a defined, deterministic order.
- **FR-014**: The migration system MUST be runnable from the command line with a single command.
- **FR-015**: The database connection string MUST be read from an environment variable — never hardcoded.

### Key Entities

- **User**: Owns all other data. Identified by email. Stores authentication credential (hashed — actual hashing is out of scope).
- **Account**: A bank/financial account belonging to a user. Identified by account number. Has a type (e.g., cheque, savings, credit).
- **Transaction**: A financial event on an account. Has a date, amount, description, category assignment, and flags for transfer detection.
- **Category**: A user-defined label for grouping transactions. Has a display colour.
- **Asset**: Something of value owned by a user (e.g. investment, property). May optionally be linked to an account.
- **Liability**: A debt or obligation owed by a user (e.g. loan, mortgage).
- **Goal**: A savings or financial target set by a user. Has a status (e.g. active, achieved, abandoned) and may be linked to an account.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A developer with no prior setup can create the full database schema by running a single command in under 30 seconds.
- **SC-002**: Running the migration command twice against the same database produces no errors and no duplicate changes.
- **SC-003**: All 7 domain tables and the migrations tracking table exist and are queryable after the initial migration run.
- **SC-004**: A new migration file added to the codebase is automatically picked up and applied on the next migration run, with no manual registration step.
- **SC-005**: All foreign-key relationships between tables are enforced at the database level — orphaned records cannot be inserted.

---

## Assumptions

- PostgreSQL is the only supported database for this project; cross-database compatibility is not required.
- The migration tool will be a lightweight, file-based system (migration files as SQL or Python). A full ORM is not required for this feature — the ORM/query layer is a separate concern for a future phase.
- Password hashing is out of scope — the `users` table stores a `hashed_password` column but the hashing logic belongs to the authentication feature.
- The API and authentication layers are explicitly out of scope for this feature.
- `created_at` columns use UTC timestamps.
- `amount` in transactions is stored as a fixed-precision decimal (e.g. `NUMERIC(15,2)`) to avoid floating-point errors.
- All `id` columns are auto-incrementing integers or UUIDs — the specific type is a technical decision for the planning phase.
- The migration tool will be used in development and production environments; rollback (down migrations) is a nice-to-have but not required for this phase.
