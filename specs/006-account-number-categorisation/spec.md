# Feature Specification: Account Number-Based Categorisation

**Feature Branch**: `006-account-number-categorisation`  
**Created**: 2026-04-24  
**Status**: Draft  
**Input**: User description: "Fix account categorisation to use account numbers instead of account names."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Distinct accounts with the same name are kept separate (Priority: P1)

A user uploads two CSV files from their bank — one for account `0549256-53 (Savings On Call)` and
one for `0549256-50 (Savings On Call)`. Both files carry the same account name, but the account
numbers differ. The system must recognise these as two distinct accounts and store their
transactions independently.

**Why this priority**: This is the core bug. Merging same-named accounts silently discards data
and produces incorrect financial summaries. It is the highest-impact issue to resolve.

**Independent Test**: Upload two CSVs with the same account name but different account numbers;
verify that two separate accounts appear in the sidebar, each showing only its own transactions.

**Acceptance Scenarios**:

1. **Given** two CSV files share the same account name but different account numbers, **When** both are imported, **Then** the system creates two separate account entries and does not merge their transactions.
2. **Given** an existing account with number `0549256-53`, **When** a new CSV for `0549256-50` is imported (same name, different number), **Then** a new account is created rather than transactions being added to `0549256-53`.
3. **Given** two accounts `0549256-53` and `0549256-50` both named "Savings On Call", **When** the user views the account list, **Then** both accounts are listed with their account number visible to distinguish them.

---

### User Story 2 — Re-importing the same account appends to the correct account (Priority: P2)

A user re-uploads a CSV for account `0549256-53` the following month. The system must append the
new transactions to the correct existing account, matched by account number — not by name.

**Why this priority**: Without this, re-imports could create duplicate accounts or append to the
wrong account when two accounts share a name.

**Independent Test**: Upload a CSV for `0549256-53`, then re-upload a second month's CSV for the
same account number; verify transactions are appended to the same account, not a new one.

**Acceptance Scenarios**:

1. **Given** account `0549256-53` already exists with January transactions, **When** a February CSV for `0549256-53` is imported, **Then** February data is appended to `0549256-53` and no duplicate account is created.
2. **Given** account `0549256-53` and account `0549256-50` both named "Savings On Call", **When** a CSV for `0549256-53` is re-imported, **Then** the February data is added only to `0549256-53`, not to `0549256-50`.

---

### User Story 3 — Account number is visible as a distinguishing label (Priority: P3)

When two or more accounts share the same name, the account number is displayed alongside the name
so the user can tell them apart in the sidebar and account selector.

**Why this priority**: Even when matching is correct behind the scenes, the user needs a visual
way to identify which account is which when names collide.

**Independent Test**: Create two accounts with the same name but different numbers; verify that
each account's display includes its account number.

**Acceptance Scenarios**:

1. **Given** two accounts share the same name, **When** the user views the account list or selector, **Then** the account number is shown next to the name for both accounts.
2. **Given** an account whose name is unique across all accounts, **When** the user views the account list, **Then** displaying the account number is optional (may still be shown for consistency).

---

### Edge Cases

- What happens when a CSV does not contain an account number in its metadata? The system must fall
  back to the current name-based matching and warn the user that no account number was found.
- What happens when an account number is present but the account name changes between imports?
  The account number is authoritative; the name is treated as a display label and may update.
- What happens when two different banks happen to produce the same account number string? This is
  assumed to be impossible within a single user's data set (personal finance scope).
- What happens with accounts created before this feature (no stored account number)? Existing
  accounts retain their name-based identity; the account number field is optional for legacy records.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST extract the account number from the CSV metadata when importing a bank export file.
- **FR-002**: The system MUST use the account number — not the account name — as the primary key when determining whether an imported CSV belongs to an existing account or requires a new one to be created.
- **FR-003**: When an imported CSV's account number matches an existing stored account number, the system MUST append the new month's transactions to that existing account.
- **FR-004**: When an imported CSV's account number does not match any existing stored account, the system MUST create a new account entry using the account number as its stable identifier.
- **FR-005**: The `Account` data entity MUST store the bank account number as a distinct field alongside the display name.
- **FR-006**: The account display name MUST remain editable by the user; the account number is read-only and set at import time.
- **FR-007**: When a CSV does not contain a detectable account number, the system MUST fall back to name-based matching and display a warning to the user that account number could not be determined.
- **FR-008**: The account number MUST be shown in the UI wherever it is needed to distinguish two or more accounts that share the same display name.

### Key Entities

- **Account**: Represents a bank account. Key attributes: stable account number (primary key for matching), user-editable display name, colour, creation date. The account number is extracted from the CSV and is read-only once set.
- **CSV Metadata**: The header block in NZ-format bank exports that precedes the transaction rows and contains account-level information including the account number.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Two CSV files from the same bank that share an account name but have different account numbers always produce two separate accounts after import — zero merges.
- **SC-002**: Re-importing a CSV for an existing account number always appends to the correct account — zero new duplicate accounts created.
- **SC-003**: All four accounts in the representative data set (`0549256-53`, `0549256-50`, `0549256-00`, `0549256-01`) are stored and displayed as distinct entries after import.
- **SC-004**: No existing account data is lost or corrupted when upgrading from name-based to number-based matching (backward compatibility for pre-existing accounts).

---

## Assumptions

- The NZ-format CSV metadata lines contain the account number in a parseable position; the exact field location will be confirmed during planning by inspecting a real export sample.
- Users upload CSV files from a single bank (or at most a small number of NZ banks); globally unique account numbers within one user's data set is a safe assumption.
- The account number field is optional in the `Account` entity to maintain backward compatibility with accounts created before this feature ships.
- Mobile or multi-device sync is out of scope; all data lives in localStorage.
- The existing `Account.id` (UUID) continues to be used as the internal storage key; the bank account number is a new separate field used for matching on import, not as the storage key.
