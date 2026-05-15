# Feature Specification: Asset and Liability Management

**Feature Branch**: `019-asset-liability-management`
**Created**: 2026-05-15
**Status**: Draft
**Input**: FA-NW-002 — Asset and liability management UI and API

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View and Manage Assets (Priority: P1)

A signed-in user wants to see all their assets in one place, organised by type, and be able to add, edit, and delete them. They want to see the total value of all assets at a glance so they know their overall asset position.

**Why this priority**: Assets are the primary positive component of net worth. Without this story, the net worth feature has no foundation. This is the highest-value, most-used slice of the feature.

**Independent Test**: A user can open the assets section, see assets grouped by type with a total, add a new asset, edit it, and delete it — all without needing the liabilities section to exist.

**Acceptance Scenarios**:

1. **Given** a signed-in user with no assets, **When** they open the assets section, **Then** they see an empty state prompting them to add their first asset.
2. **Given** a signed-in user with existing assets, **When** they open the assets section, **Then** assets are displayed grouped by type (e.g., Property, Vehicle, Investment, Savings, Other) with the total asset value shown prominently.
3. **Given** a signed-in user on the assets section, **When** they submit the add-asset form with a name, type, and value, **Then** the asset appears immediately in the correct type group and the total updates.
4. **Given** a signed-in user viewing their assets, **When** they edit an asset and change its name, type, or value, **Then** the asset reflects the change immediately and the total recalculates.
5. **Given** a signed-in user viewing their assets, **When** they delete an asset and confirm the action, **Then** the asset is removed and the total updates.
6. **Given** a signed-in user adding or editing an asset, **When** they optionally select one of their existing bank accounts to link, **Then** the asset is associated with that account.

---

### User Story 2 - View and Manage Liabilities (Priority: P2)

A signed-in user wants to see all their liabilities in one place, organised by type, and be able to add, edit, and delete them. They want to see the total outstanding balance of all liabilities at a glance.

**Why this priority**: Liabilities are the second component of net worth. Once assets are in place, liabilities complete the picture. Structurally parallel to assets, so can be implemented immediately after.

**Independent Test**: A user can open the liabilities section, see liabilities grouped by type with a total, add a new liability, edit it, and delete it — independently of the assets section.

**Acceptance Scenarios**:

1. **Given** a signed-in user with no liabilities, **When** they open the liabilities section, **Then** they see an empty state prompting them to add their first liability.
2. **Given** a signed-in user with existing liabilities, **When** they open the liabilities section, **Then** liabilities are displayed grouped by type (e.g., Mortgage, Car Loan, Credit Card, Personal Loan, Other) with the total outstanding balance shown prominently.
3. **Given** a signed-in user on the liabilities section, **When** they submit the add-liability form with a name, type, and outstanding balance, **Then** the liability appears in the correct type group and the total updates.
4. **Given** a signed-in user viewing their liabilities, **When** they edit a liability and change its name, type, or balance, **Then** the change is reflected immediately and the total recalculates.
5. **Given** a signed-in user viewing their liabilities, **When** they delete a liability and confirm, **Then** the liability is removed and the total updates.
6. **Given** a signed-in user adding or editing a liability, **When** they optionally select one of their existing bank accounts to link, **Then** the liability is associated with that account.

---

### User Story 3 - Net Worth Summary (Priority: P3)

A signed-in user wants to see their net worth figure — total assets minus total liabilities — without having to do the arithmetic themselves. This number is the single most important output of the feature.

**Why this priority**: Depends on both assets and liabilities being available. Delivers the headline metric the whole feature exists to produce.

**Independent Test**: Given at least one asset and one liability exist, the net worth summary shows the correct totals and net figure in a dedicated summary area.

**Acceptance Scenarios**:

1. **Given** a user has assets totalling £50,000 and liabilities totalling £20,000, **When** they view the net worth summary, **Then** they see Total Assets: £50,000, Total Liabilities: £20,000, Net Worth: £30,000.
2. **Given** a user's net worth is negative (liabilities exceed assets), **When** they view the summary, **Then** the net figure is clearly shown as negative so the user understands their financial position.
3. **Given** a user with no assets or liabilities, **When** they view the summary, **Then** all three figures show zero with no errors.

---

### Edge Cases

- What happens when a user submits an asset or liability with a zero value? The record should be accepted — zero is a valid value.
- What happens when a user enters a negative value for an asset or liability? The system should reject it with a clear validation message.
- What happens when a user tries to delete an asset that is linked to a bank account? The asset is deleted; the bank account is not affected.
- What happens if a user has hundreds of assets or liabilities? The list must remain usable on both desktop and mobile without horizontal scrolling.
- What happens when the linked account is later deleted? The asset or liability remains; the account link is cleared automatically.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow a signed-in user to view all their assets grouped by asset type.
- **FR-002**: System MUST allow a signed-in user to add an asset by providing a name, type, and current estimated value.
- **FR-003**: System MUST allow a signed-in user to optionally link an asset to one of their existing bank accounts when creating or editing it.
- **FR-004**: System MUST allow a signed-in user to edit any of their assets' name, type, value, or linked account.
- **FR-005**: System MUST allow a signed-in user to delete any of their assets with a confirmation step.
- **FR-006**: System MUST display the total value of all assets prominently on the assets view.
- **FR-007**: System MUST allow a signed-in user to view all their liabilities grouped by liability type.
- **FR-008**: System MUST allow a signed-in user to add a liability by providing a name, type, and current outstanding balance.
- **FR-009**: System MUST allow a signed-in user to optionally link a liability to one of their existing bank accounts when creating or editing it.
- **FR-010**: System MUST allow a signed-in user to edit any of their liabilities' name, type, balance, or linked account.
- **FR-011**: System MUST allow a signed-in user to delete any of their liabilities with a confirmation step.
- **FR-012**: System MUST display the total outstanding balance of all liabilities prominently on the liabilities view.
- **FR-013**: System MUST display a net worth summary showing total assets, total liabilities, and the net figure (assets minus liabilities).
- **FR-014**: System MUST reject asset or liability values that are negative, with a clear validation message.
- **FR-015**: System MUST ensure all asset and liability data is strictly scoped to the authenticated user; no user can access another user's records.
- **FR-016**: System MUST provide a usable interface on both desktop and mobile screen sizes.

### Key Entities

- **Asset**: A user-owned item of positive financial value. Has a name, a type (e.g., Property, Vehicle, Investment, Savings, Other), a current estimated value (non-negative number), an optional link to one of the user's bank accounts, and belongs to exactly one user.
- **Liability**: A user-owned financial obligation. Has a name, a type (e.g., Mortgage, Car Loan, Credit Card, Personal Loan, Other), a current outstanding balance (non-negative number), an optional link to one of the user's bank accounts, and belongs to exactly one user.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can add a new asset or liability and see it reflected in the list and totals in under 2 seconds.
- **SC-002**: The net worth summary always reflects the correct arithmetic — total assets minus total liabilities — with no manual refresh required.
- **SC-003**: All data operations (view, add, edit, delete) work correctly on viewport widths from 375 px (mobile) up to 1440 px (desktop) without horizontal scrolling.
- **SC-004**: A user can complete the full add-asset flow (open form, fill details, submit, see result) in under 60 seconds on first use.
- **SC-005**: No user can retrieve, modify, or delete another user's assets or liabilities under any circumstances.

## Assumptions

- Users are already authenticated; this feature does not introduce new authentication flows.
- The application already has a bank accounts feature that assets and liabilities can optionally link to; this feature reuses that data and does not build account management itself.
- Asset and liability types are predefined sets (e.g., Property, Vehicle, Investment, Savings, Other for assets; Mortgage, Car Loan, Credit Card, Personal Loan, Other for liabilities); users cannot define custom types in this version.
- Values are stored as decimal numbers representing the user's local currency; multi-currency support is out of scope.
- Historical value tracking, net worth over time charts, and automatic value syncing from linked accounts are explicitly out of scope for this feature.
- The interface is used by the account owner only; sharing or multi-user access to the same net worth data is out of scope.
