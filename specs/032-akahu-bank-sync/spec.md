# Feature Specification: Akahu Bank Sync — Connection Management & Transaction Sync

**Feature Branch**: `772-akahu-bank-sync`
**Created**: 2026-05-31
**Status**: Draft
**Feature ID**: FA-BANK-002

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Manually Trigger a Bank Sync (Priority: P1)

The owner taps a "Sync" action. The system fetches their current account
balances and all new transactions from Akahu, stores any transactions that
haven't been imported before, and updates each linked account's sync
timestamp and balance. When complete, the dashboard reflects the latest data
without any manual steps.

**Why this priority**: This is the core value of the feature — replacing the
manual CSV upload flow with live data. Everything else (connection, linking)
exists to enable this.

**Independent Test**: With a valid connection and at least one linked account,
trigger a sync. Confirm that new transactions appear in the transaction list,
the last-synced timestamp advances, and the account balance updates. Trigger a
second sync immediately after and confirm no duplicate transactions are created.

**Acceptance Scenarios**:

1. **Given** a connected Akahu integration and one or more linked accounts,
   **When** the user triggers a sync, **Then** all new transactions since the
   last sync are imported and the linked accounts' balances and sync timestamps
   are updated.
2. **Given** a first-time sync (no previous sync timestamp), **When** the user
   triggers a sync, **Then** transactions from up to 12 months ago are
   imported.
3. **Given** a transaction already exists in Finance Analyser, **When** Akahu
   returns that same transaction during sync, **Then** no duplicate is created.
4. **Given** one linked account returns an error from Akahu, **When** the sync
   runs, **Then** that account's status is set to `error` with an error message,
   other linked accounts continue syncing normally, and existing data is
   unchanged.
5. **Given** the user has an Akahu account that is not linked to any Finance
   Analyser account, **When** a sync runs, **Then** that Akahu account's
   balance is still updated but no transactions are imported for it.

---

### User Story 2 - Connect and Disconnect Akahu (Priority: P2)

The owner connects their Akahu integration by providing their Akahu
credentials. The system stores the connection securely. The owner can also
disconnect, which removes the connection and all account links (but preserves
already-imported transactions).

**Why this priority**: The connection must exist before syncing is possible.
Managing the connection is a prerequisite for User Story 1 to be usable end-
to-end, but the sync service (US1) can be built and tested independently
against an existing connection record.

**Independent Test**: Create a connection via the connect endpoint. Verify the
connection record exists and the user token is not exposed in any response.
Disconnect and verify the connection record and all account links are removed.
Reconnect and verify the previous token is replaced.

**Acceptance Scenarios**:

1. **Given** no existing connection, **When** the owner connects by providing
   their Akahu user token and Akahu user ID, **Then** a connection record is
   created and the token is stored encrypted.
2. **Given** an existing connection, **When** the owner reconnects with a new
   token, **Then** the existing connection is updated with the new token.
3. **Given** an existing connection, **When** the owner disconnects, **Then**
   the connection record and all account links are removed; previously imported
   transactions are preserved.
4. **Given** an existing connection, **When** the owner requests connection
   status, **Then** the response includes connection metadata and the list of
   linked accounts — without exposing the stored user token.
5. **Given** no existing connection, **When** the owner requests connection
   status or triggers a sync, **Then** the response indicates no connection
   exists.

---

### User Story 3 - Link and Unlink Individual Bank Accounts (Priority: P3)

The owner maps a specific Akahu bank account to a Finance Analyser account,
enabling transaction import for that account. They can also unlink an account
to stop future imports (without losing previously imported transactions).

**Why this priority**: Linking is required before transactions can be imported
for a specific account. However, the sync and connection flows work
independently of this UI — links can be managed via the backend before the UI
exists.

**Independent Test**: Link an Akahu account to a Finance Analyser account.
Verify the link record exists with correct metadata. Unlink it and verify the
link is removed. Attempt to link the same Akahu account to two different
Finance Analyser accounts and verify the second is rejected.

**Acceptance Scenarios**:

1. **Given** a connected Akahu integration, **When** the owner links an Akahu
   account to a Finance Analyser account, **Then** a link record is created
   storing the Akahu account ID, display name, and Finance Analyser account
   reference.
2. **Given** an existing link, **When** the owner attempts to link the same
   Akahu account to a different Finance Analyser account, **Then** the
   operation is rejected (one link per Akahu account).
3. **Given** an existing link, **When** the owner unlinks the Akahu account,
   **Then** the link record is removed; previously imported transactions are
   preserved.
4. **Given** an existing link, **When** a sync runs, **Then** only accounts
   with an active link have transactions imported.

---

### Edge Cases

- What happens if Akahu returns no transactions for a linked account (e.g.
  new account with no history)?
- What if the Akahu user token has been revoked — how is the sync failure
  surfaced?
- What if the same Finance Analyser account is targeted by two different link
  attempts?
- What happens to pending (unsettled) transactions returned by Akahu — are
  they imported?
- What if a sync is triggered while a previous sync is still in progress?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a way for the owner to connect their
  Akahu integration by supplying an Akahu user token and Akahu user ID.
- **FR-002**: The stored Akahu user token MUST be encrypted at rest and MUST
  NOT appear in any API response.
- **FR-003**: The system MUST allow reconnection with a new token, replacing
  the existing credential without creating a duplicate connection record.
- **FR-004**: The system MUST allow the owner to disconnect, removing the
  connection and all account links while preserving imported transactions.
- **FR-005**: The system MUST return the connection status and linked accounts
  for the current user, excluding the stored token from the response.
- **FR-006**: The system MUST allow the owner to link an Akahu bank account
  to a Finance Analyser account, storing the Akahu account's display name.
- **FR-007**: The system MUST enforce that each Akahu account can be linked to
  at most one Finance Analyser account, and each Finance Analyser account can
  be linked to at most one Akahu account.
- **FR-008**: The system MUST allow the owner to unlink an Akahu account
  without deleting imported transactions.
- **FR-009**: The system MUST provide a manual sync trigger that fetches
  current account balances and transactions from Akahu.
- **FR-010**: On first sync, the system MUST import transactions from up to 12
  months ago. On subsequent syncs, the system MUST import only transactions
  since the last successful sync.
- **FR-011**: The system MUST not import a transaction that already exists in
  Finance Analyser. Duplicate detection is based on date, amount, description,
  and account.
- **FR-012**: The system MUST update each linked account's last-synced
  timestamp and last-known balance on a successful sync.
- **FR-013**: The system MUST set a linked account's sync status to `error`
  and record the error message if its sync fails, without corrupting other
  accounts' data.
- **FR-014**: The system MUST return a summary of each sync: number of
  accounts synced, number of transactions added, and any per-account errors.
- **FR-015**: Akahu accounts that are not linked to a Finance Analyser account
  MUST have their balance updated during sync but MUST NOT have transactions
  imported.
- **FR-016**: All sync and connection operations MUST be authenticated — only
  the owner can access their own connection and data.
- **FR-017**: Pending (unsettled) transactions returned by Akahu MUST be
  imported using the same deduplication rules as settled transactions.

### Key Entities

- **Akahu Connection** (from FA-BANK-001): Holds the encrypted user token and
  connection metadata. Referenced but not modified structurally by this feature.
- **Akahu Account Link** (from FA-BANK-001): The mapping between an Akahu
  account and a Finance Analyser account, including sync state. Updated during
  every sync.
- **Transaction** (existing): The existing transaction record. Transactions
  imported by Akahu sync use the same structure as manually imported
  transactions, with `isTransfer: false` and no category assigned.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A manual sync completes and the dashboard reflects current
  balances and new transactions without any CSV upload or manual data entry.
- **SC-002**: Running a sync twice in a row produces no duplicate transactions
  — the second sync adds zero records for data already present.
- **SC-003**: A sync failure for one account does not affect data for other
  accounts — partial errors are isolated and reported per account.
- **SC-004**: The Akahu user token is never visible in any API response,
  server log, or client-side storage — confirmed by inspection.
- **SC-005**: After disconnect, no connection or link records remain, but all
  previously imported transactions are still present.

## Assumptions

- FA-BANK-001 (data model) is complete and deployed before this feature is
  implemented — `akahuConnections` and `akahuAccountLinks` tables exist.
- The encryption utility from FA-BANK-001 (`encrypt`/`decrypt`) is available
  and the `ENCRYPTION_KEY` environment variable is configured.
- The Akahu API uses the user token for all account and transaction fetches;
  the app token identifies the application making the request.
- Deduplication is implemented by matching on date + amount + description +
  Finance Analyser account ID. This is the same heuristic used for CSV import
  deduplication, so the behaviour is consistent.
- Akahu accounts of types that do not support transaction history (e.g. loans
  with no transaction attributes) are silently skipped for transaction import
  but still have their balance updated.
- The sync is a server-side operation; the client initiates it and waits for
  the response. Long syncs (large transaction histories) complete
  synchronously in this version — background job processing is out of scope.
- Automatic/scheduled syncing is out of scope; all syncs are user-initiated.
- The Finance Analyser accounts that Akahu accounts are linked to must already
  exist before linking is performed.
