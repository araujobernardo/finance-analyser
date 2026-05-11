# Feature Specification: FA-E2E-001 — Playwright End-to-End Test Suite

**Feature Branch**: `018-playwright-e2e`  
**Created**: 2026-05-11  
**Status**: Draft  
**Input**: User description: "FA-E2E-001 — Playwright end-to-end test suite"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Automated sign-in and account load verification (Priority: P1)

A developer pushes code to the repository. The CI pipeline automatically runs a browser-based test that signs in to the app with a known test account, waits for the dashboard to load, and asserts that the account list in the sidebar is visible and does not show an error. If the test fails, the developer is notified before the change reaches production.

**Why this priority**: This is the primary regression guard. The "Failed to load accounts" bug was caught manually — this test exists to catch it automatically.

**Independent Test**: Can be verified by running the test suite locally against the dev server and confirming it passes when the app is healthy and fails when the API is unavailable.

**Acceptance Scenarios**:

1. **Given** the app is running and the API is reachable, **When** the test runs with valid credentials, **Then** it passes — the sidebar shows at least one account name and no error message
2. **Given** the app is running but the API is unreachable, **When** the test runs, **Then** it fails — the "Failed to load accounts" error is detected
3. **Given** invalid credentials are used, **When** the test runs, **Then** it fails — the test does not proceed past the sign-in step

---

### User Story 2 — Configurable target environment (Priority: P1)

A developer can run the same test suite against both the local dev environment and the production deployment by changing a single environment variable. No code changes are needed to switch targets.

**Why this priority**: Without this, the test only covers one environment. The original manual test was specifically needed to verify production behaviour.

**Independent Test**: Run the test pointing at the local URL, confirm it passes. Change the env var to the production URL, confirm it runs against production.

**Acceptance Scenarios**:

1. **Given** the base URL env var is set to `http://localhost:5173`, **When** the test runs, **Then** it targets the local environment
2. **Given** the base URL env var is set to `https://finance-analyser-seven.vercel.app`, **When** the test runs, **Then** it targets the production environment
3. **Given** no base URL env var is set, **When** the test runs, **Then** it defaults to the local URL

---

### User Story 3 — CI pipeline integration (Priority: P2)

The E2E test suite runs automatically on every push to `main` and on every pull request in the existing GitHub Actions pipeline. Failures block the PR from being merged.

**Why this priority**: Automation is the point — a test that only runs manually provides limited value.

**Independent Test**: Open a pull request and verify the E2E job appears in the CI checks list. Confirm it passes on a good PR and would block a bad one.

**Acceptance Scenarios**:

1. **Given** a pull request is opened, **When** CI runs, **Then** the E2E test job appears as a required check
2. **Given** the E2E test passes, **When** CI completes, **Then** the check is green and does not block the PR
3. **Given** the E2E test fails, **When** CI completes, **Then** the check is red and the PR cannot be merged

---

### Edge Cases

- What happens when the test runs before the app has fully loaded — does it wait or time out immediately?
- What happens if the test user's account has no accounts in the database — does the test incorrectly pass?
- What if the sign-in form is slow to respond due to a cold API start?
- What if the test credentials env vars are not set in CI?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The test suite MUST include a test that navigates to the app, signs in with credentials from environment variables, and asserts that the account list is visible without an error message
- **FR-002**: The test MUST assert that at least one account name is visible in the sidebar after sign-in
- **FR-003**: The test MUST assert that the text "Failed to load accounts" is NOT present after sign-in
- **FR-004**: The app base URL MUST be configurable via an environment variable, defaulting to `http://localhost:5173`
- **FR-005**: Test credentials (email and password) MUST be read from environment variables — never hardcoded in test files or committed to the repository
- **FR-006**: The test suite MUST be executable locally against a running dev server with a single command
- **FR-007**: The CI pipeline MUST run the E2E tests automatically on every push to `main` and on every pull request
- **FR-008**: A failing E2E test MUST block a pull request from being merged
- **FR-009**: The CI job MUST run the E2E tests against the production deployment URL (not a local server spun up in CI)
- **FR-010**: The test suite MUST complete within 2 minutes for the single sign-in test

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The sign-in and account load test passes consistently when the app and API are healthy — zero false failures over 10 consecutive runs
- **SC-002**: The test correctly detects a broken account load — fails when the sidebar shows "Failed to load accounts"
- **SC-003**: The full test suite completes in under 2 minutes
- **SC-004**: The CI check appears on every pull request and every push to `main` within the existing pipeline
- **SC-005**: Switching the target environment requires only an environment variable change — no code modification

## Assumptions

- A dedicated test user account exists (or will be created) in the production database with at least one account linked — the test cannot assert account visibility if no accounts exist for the test user
- The test runs against the already-deployed production app (`https://finance-analyser-seven.vercel.app`) in CI — no local server is spun up in the CI environment
- The CI pipeline already exists as a GitHub Actions workflow (`.github/workflows/ci.yml`) — the E2E job will be added to that file
- Test credentials are stored as GitHub Actions secrets and injected as environment variables at CI runtime
- The test runs in headless browser mode in CI; headed mode is available for local debugging
- Only Chromium is required for the initial test suite — multi-browser coverage is out of scope
