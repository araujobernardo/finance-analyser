# Feature Specification: Akahu Bank Connection Data Model

**Feature Branch**: `771-akahu-bank-connection-model`
**Created**: 2026-05-31
**Status**: Draft
**Feature ID**: FA-BANK-001

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Store Akahu Connection Credentials (Priority: P1)

The app owner connects their bank via Akahu. The system must store the
authorisation credential Akahu issues (a user token) so that future sync
operations can be made on the owner's behalf without requiring them to
re-authenticate. One connection record exists per user.

**Why this priority**: Without a stored credential, no automated bank
data retrieval is possible. This is the foundation all subsequent sync
features depend on.

**Independent Test**: A connection record can be created, read, and
deleted in isolation. The stored credential is never readable as
plaintext — it must always be in an encrypted form.

**Acceptance Scenarios**:

1. **Given** no existing connection, **When** a new Akahu connection is
   established, **Then** a connection record is stored with the encrypted
   user token, the Akahu user identifier, and the time of connection.
2. **Given** an existing connection, **When** the connection is
   disconnected, **Then** the connection record and all associated account
   links are removed.
3. **Given** a connection record exists, **When** the user token is
   retrieved, **Then** it is returned in its decrypted form only via the
   designated secure path — never exposed as raw stored bytes.

---

### User Story 2 - Link Akahu Accounts to Finance Analyser Accounts (Priority: P2)

The owner maps one or more of their Akahu-connected bank accounts to
existing Finance Analyser accounts. Each link associates an external
Akahu account identifier with a Finance Analyser account, enabling
transactions and balances to be attributed correctly.

**Why this priority**: Without the mapping, sync data cannot be directed
to the correct Finance Analyser account. This is required before any sync
can be meaningful.

**Independent Test**: An account link can be created and queried
independently; it correctly enforces that the same Akahu account cannot
be linked twice, and that a Finance Analyser account cannot be linked to
more than one Akahu account.

**Acceptance Scenarios**:

1. **Given** a connected Akahu account and an existing Finance Analyser
   account, **When** a link is created, **Then** the link record stores
   the Akahu account identifier, the Akahu display name, the Akahu
   account type, and the Finance Analyser account reference.
2. **Given** an existing link for an Akahu account, **When** a second
   link is attempted for the same Akahu account for the same user, **Then**
   the operation is rejected.
3. **Given** an existing link targeting a Finance Analyser account,
   **When** a second link is attempted to the same Finance Analyser
   account, **Then** the operation is rejected.
4. **Given** a Finance Analyser account that has been deleted, **When**
   the linked Akahu account link is queried, **Then** the link record no
   longer exists (cascaded removal).

---

### User Story 3 - Track Sync State per Linked Account (Priority: P3)

For each linked account the system records: the current sync status, the
timestamp of the last successful transaction sync, the most recent
balance reported by Akahu, and any error message when a sync fails. This
state is the source of truth used by the sync engine (FA-BANK-003) to
know where to resume.

**Why this priority**: Sync-state tracking is only useful once linking
exists (P2 dependency). It enables incremental syncing and fault
visibility, but the data model is still valid without it being populated.

**Independent Test**: Sync state fields on a link record can be updated
independently and queried back with correct values. Status transitions
between all four states can be persisted and read.

**Acceptance Scenarios**:

1. **Given** a newly created account link, **When** the record is
   inspected, **Then** sync status is `active`, last-synced timestamp is
   absent, last balance is absent, and error message is absent.
2. **Given** an account link in any status, **When** sync status is
   updated to `syncing`, `error`, or `disconnected`, **Then** the new
   status is persisted correctly.
3. **Given** a sync that completes successfully, **When** the link is
   updated, **Then** last-transaction-synced timestamp and last balance
   are recorded, and sync status is `active`.
4. **Given** a sync that fails, **When** the link is updated, **Then**
   sync status is `error` and the error message is stored.

---

### Edge Cases

- What happens when the user's Akahu connection is removed — are all
  linked account records also removed?
- How does the model handle an Akahu account that was linked but the
  corresponding Finance Analyser account is later deleted?
- What if the stored credential becomes invalid (token revoked by the
  user in Akahu) — how is this surfaced in the sync status?
- Can the same Akahu account appear under different users? (No —
  each record is scoped per user.)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST store one Akahu connection record per user,
  containing the user's Akahu identity and an encrypted credential
  sufficient for API calls to be made on the user's behalf.
- **FR-002**: The stored credential MUST be encrypted at rest; the
  plaintext credential MUST NOT be persisted in the data store under any
  circumstances.
- **FR-003**: The system MUST prevent more than one Akahu connection
  record per user.
- **FR-004**: The system MUST store zero or more account link records per
  user, each associating one Akahu account identifier with one Finance
  Analyser account.
- **FR-005**: The system MUST prevent the same Akahu account from being
  linked more than once per user.
- **FR-006**: The system MUST prevent more than one Akahu account from
  being linked to the same Finance Analyser account.
- **FR-007**: Each account link MUST record the Akahu account's display
  name and account type as reported by Akahu at link creation time.
- **FR-008**: Each account link MUST record the current sync status, with
  permitted values: `active`, `syncing`, `error`, `disconnected`. Default
  on creation is `active`.
- **FR-009**: Each account link MUST record the timestamp of the most
  recent successfully synced transaction (nullable; absent until first
  sync).
- **FR-010**: Each account link MUST record the most recent balance as
  reported by Akahu (nullable; absent until first sync).
- **FR-011**: Each account link MUST record the last sync error message
  when status is `error` (nullable otherwise).
- **FR-012**: Removing a user's Akahu connection MUST cascade to remove
  all associated account link records.
- **FR-013**: Removing a Finance Analyser account MUST cascade to remove
  the account link record that references it.

### Key Entities

- **Akahu Connection**: Represents the user's top-level authorisation
  link to Akahu. One per user. Holds the encrypted credential and the
  time the connection was established. Tracks when a sync was last
  attempted at the connection level (`lastSyncedAt`).
- **Akahu Account Link**: Represents the mapping from one specific Akahu
  bank account to one Finance Analyser account. Holds display metadata
  (name, type), sync state (status, error), and the latest balance and
  transaction-sync bookmark.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user's Akahu credential can be stored, retrieved in
  decrypted form, and removed without data leakage — verified by
  inspecting the data store and confirming the stored value is never
  plaintext.
- **SC-002**: All uniqueness constraints are enforced — duplicate
  connection records, duplicate account links, and double-mapping of a
  Finance Analyser account are each rejected by the data layer.
- **SC-003**: Cascade behaviour is correct — deleting a connection removes
  all its account links; deleting a Finance Analyser account removes the
  corresponding account link.
- **SC-004**: All four sync statuses and all nullable fields can be round-
  tripped (written and read back) without data loss.
- **SC-005**: The data model is ready to support FA-BANK-002 (connection
  API) and FA-BANK-003 (sync engine) without schema changes.

## Assumptions

- Finance Analyser is a single-user application; the per-user scoping is
  a forward-compatibility safeguard, not a multi-tenancy requirement.
- The Akahu user token is a long-lived credential that does not expire
  under normal use; token refresh is out of scope for FA-BANK-001.
- Credential encryption uses a symmetric key held in server-side
  environment configuration; key management infrastructure is the
  operator's responsibility and is out of scope.
- Akahu account identifiers are stable strings (do not change for the
  lifetime of an account connection).
- The Finance Analyser `accounts` table already exists and is the
  authoritative source for Finance Analyser account records; this feature
  adds references to it, not replacements.
- This feature covers the data layer only. No API endpoints, no UI, and
  no sync logic are included. Those are FA-BANK-002 and FA-BANK-003
  respectively.
