# Feature Specification: Bank Connection and Sync Interface

**Feature Branch**: `773-bank-connection-ui`
**Created**: 2026-05-31
**Status**: Draft
**Feature ID**: FA-BANK-003

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Connect and Disconnect Akahu (Priority: P1)

The owner navigates to a bank settings page. If they have not yet connected,
they see clear instructions and a form to enter their Akahu App Token and User
Token (obtained from my.akahu.nz). On submitting the form, the page transitions
to a connected state showing the connection status, the date it was connected,
and when transactions were last synced. A Disconnect button is visible while
connected. The page also displays a plain-language privacy notice explaining
that bank credentials are never stored — only the Akahu tokens, which can be
revoked at any time from my.akahu.nz.

**Why this priority**: Without a connection, the account mapping and sync
features have nothing to work with. This is the entry point to all bank
integration functionality.

**Independent Test**: Starting with no connection, submit the connect form with
valid tokens. Confirm the page shows the connected state with connection
metadata. Click Disconnect. Confirm the page returns to the disconnected state
and the connection metadata is gone.

**Acceptance Scenarios**:

1. **Given** no active Akahu connection, **When** the owner visits the bank
   settings page, **Then** a connect form is shown with fields for App Token
   and User Token, along with instructions directing them to my.akahu.nz.
2. **Given** the connect form is visible, **When** the owner submits valid
   tokens, **Then** the page transitions to the connected state showing
   connection status, connected date, and last sync time.
3. **Given** the owner is connected, **When** they visit the bank settings
   page, **Then** the connect form is hidden and the connection status card
   is shown.
4. **Given** the owner is connected, **When** they click Disconnect and
   confirm, **Then** the connection is removed, the page returns to the
   disconnected state, and the account mapping section disappears.
5. **Given** the connect form, **When** the owner views the page, **Then** a
   privacy notice is visible stating that bank credentials are never stored
   and that access can be revoked from my.akahu.nz.

---

### User Story 2 - Map Akahu Accounts to Finance Analyser Accounts (Priority: P2)

The owner is connected. The page shows a list of their Akahu bank accounts —
each displaying the account name, account type, and current balance. For each
account, a dropdown lets the owner link it to one of their existing Finance
Analyser accounts. Linked accounts show which Finance Analyser account they are
mapped to and when they were last synced. Unlinking an account stops future
syncs for that account but does not delete past transactions. Unlinked accounts
can simply be left unmapped.

**Why this priority**: Account mapping must exist before a sync can import
transactions to the right place. However, it can be tested independently from
the sync trigger.

**Independent Test**: With a connected Akahu account, select a Finance Analyser
account from the dropdown for one Akahu account. Confirm the link is saved and
the row reflects the mapping. Select "Not linked" from the dropdown. Confirm
the link is removed.

**Acceptance Scenarios**:

1. **Given** an active connection, **When** the account mapping section is
   displayed, **Then** each Akahu account is listed with its name, type,
   and current balance.
2. **Given** an unlisted Akahu account, **When** the owner selects a Finance
   Analyser account from the dropdown, **Then** the link is saved and the row
   updates to show the mapped account name and last sync time.
3. **Given** a linked Akahu account, **When** the owner selects "Not linked"
   from the dropdown, **Then** the link is removed and the row reverts to
   unlinked state.
4. **Given** an Akahu account that is not linked, **When** a sync runs,
   **Then** no transactions are imported for that account (balance is still
   updated).
5. **Given** a Finance Analyser account already linked to another Akahu
   account, **When** the owner attempts to link a second Akahu account to
   the same Finance Analyser account, **Then** the action is rejected with a
   clear error message.

---

### User Story 3 - Trigger Sync and View Results (Priority: P3)

The owner sees a "Sync now" button. Clicking it triggers a manual sync for
all linked accounts. While the sync is running, a progress indicator is shown
and the button is disabled. When complete, a summary shows how many new
transactions were added. Each Akahu account row displays its current sync
status: active (green), syncing (spinner), or error (red with the error
message).

**Why this priority**: The sync UI builds on top of a working connection (US1)
and meaningful account mappings (US2). It is the payoff of the setup flow but
can be demonstrated with even a single linked account.

**Independent Test**: With at least one linked account, click "Sync now".
Confirm the button disables and a progress indicator appears. When sync
completes, confirm a transaction count summary is shown and all account rows
reflect their updated status.

**Acceptance Scenarios**:

1. **Given** at least one linked account, **When** the owner clicks "Sync
   now", **Then** the button becomes disabled and a loading indicator is
   displayed.
2. **Given** a sync is in progress, **When** it completes successfully,
   **Then** a summary message shows the number of new transactions added and
   the number of accounts synced.
3. **Given** a sync completes with no new transactions, **When** the result
   is shown, **Then** the summary clearly states that no new transactions
   were found (not an error).
4. **Given** one account errors during sync, **When** results are shown,
   **Then** that account's row displays a red error status with the error
   message; other accounts show their correct status.
5. **Given** no linked accounts, **When** the owner views the sync section,
   **Then** the "Sync now" button is either disabled or not shown, and a
   hint explains that at least one account must be linked first.

---

### Edge Cases

- What happens if the user submits the connect form with invalid or already-
  revoked tokens? The error should be surfaced without locking the form.
- What if the Akahu account list fails to load after connecting?
- What if a sync is triggered while another sync is already running?
- What if the user disconnects while a sync is in progress?
- What if a Finance Analyser account is deleted after it was linked — does the
  mapping row show an error or disappear?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a bank settings page accessible from the
  application navigation.
- **FR-002**: The page MUST display a connection status section that shows
  whether the owner has an active Akahu connection.
- **FR-003**: When not connected, the page MUST show a form to enter an Akahu
  App Token and User Token with instructions directing the owner to my.akahu.nz.
- **FR-004**: The page MUST display a privacy notice stating that bank
  credentials are never stored and that Akahu access can be revoked from
  my.akahu.nz.
- **FR-005**: When connected, the page MUST show the connection date and the
  last sync time.
- **FR-006**: The page MUST provide a Disconnect button when connected, which
  removes the connection after confirmation and returns the page to the
  disconnected state.
- **FR-007**: The account mapping section MUST be shown only when connected.
- **FR-008**: The account mapping section MUST list all Akahu accounts with
  their name, account type, and current balance.
- **FR-009**: Each Akahu account row MUST include a dropdown to link it to one
  of the owner's existing Finance Analyser accounts, or to leave it unlinked.
- **FR-010**: Selecting a Finance Analyser account from the dropdown MUST save
  the link immediately without requiring a separate save button.
- **FR-011**: Linked account rows MUST show the name of the linked Finance
  Analyser account and the last transaction sync time.
- **FR-012**: The page MUST prevent mapping the same Finance Analyser account
  to more than one Akahu account, and display a clear error if attempted.
- **FR-013**: The page MUST display a "Sync now" button when at least one
  account is linked.
- **FR-014**: The "Sync now" button MUST be disabled while a sync is in
  progress.
- **FR-015**: A progress indicator MUST be displayed while a sync is running.
- **FR-016**: On sync completion, the page MUST display a summary of results:
  accounts synced and new transactions added.
- **FR-017**: Each account row MUST display its current sync status visually:
  active (green), syncing (animated indicator), or error (red with message).
- **FR-018**: A sync error on one account MUST not prevent other accounts'
  statuses from being shown correctly.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The owner can connect their Akahu integration, map at least one
  account, and trigger a successful sync — all within a single page visit
  without consulting external documentation beyond the on-page instructions.
- **SC-002**: The privacy notice is visible without scrolling on the connect
  form — confirmed by visual inspection.
- **SC-003**: A sync completes and the transaction count summary is displayed
  within a reasonable time, and the "Sync now" button re-enables automatically
  when sync finishes.
- **SC-004**: Linking and unlinking an account via the dropdown requires no
  page refresh and reflects the new state immediately.
- **SC-005**: After disconnect, the account mapping section and sync controls
  are no longer visible on the page.

## Assumptions

- FA-BANK-001 (data model) and FA-BANK-002 (sync API) are fully deployed
  before this feature is implemented.
- The owner already has a Finance Analyser account set up with at least one
  account before visiting this page.
- Akahu App Token and User Token are obtained out-of-band by the owner from
  my.akahu.nz; this page does not automate that step.
- The Akahu account list and balances shown on the page come from the stored
  connection state (FA-BANK-001 data), not a live Akahu API call on page load.
- The connect form does not validate token format beyond basic non-empty checks;
  invalid tokens surface as an error after submission.
- Disconnect requires a single confirmation step (e.g. a confirmation dialog)
  to prevent accidental disconnection.
- The bank settings page is accessible via the existing sidebar navigation,
  consistent with other settings-style pages in the application.
- No mobile-specific layout changes are required in this story beyond what the
  existing responsive design already provides.
