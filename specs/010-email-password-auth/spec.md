# Feature Specification: Email and Password Sign-Up and Sign-In

**Feature Branch**: `010-email-password-auth`
**Created**: 2026-05-06
**Status**: Draft
**Input**: User description: "FA-AUTH-001 — Email and password sign-up and sign-in flow"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — New User Creates an Account (Priority: P1)

A first-time visitor arrives at the Finance Analyser. They fill in their email address, a display name, and a password, then submit the registration form. The system creates their account and sends a verification email. The user sees a clear confirmation message telling them to check their inbox. They cannot access the application until their email is verified.

**Why this priority**: Account creation is the entry point for all other authentication flows. No user can sign in, verify their email, or reset their password without first registering. This is the foundation of the entire auth system.

**Independent Test**: Navigate to the sign-up page → fill in a valid email, display name, and password → submit → receive a "check your email" confirmation page → find the verification email in the inbox → account exists in the system with unverified status.

**Acceptance Scenarios**:

1. **Given** a visitor is on the sign-up page, **When** they submit a valid email, display name, and password, **Then** the system creates their account, sends a verification email, and displays a "check your email" confirmation.
2. **Given** a visitor submits a registration form, **When** the email address is already registered, **Then** the system displays an error message indicating the email is already in use.
3. **Given** a visitor submits a registration form, **When** any required field is empty or invalid (email format wrong, password too short, display name missing), **Then** the system displays specific field-level error messages before submission.
4. **Given** a newly registered user tries to sign in before verifying their email, **When** they submit correct credentials, **Then** the system blocks sign-in and shows a message prompting them to verify their email first.

---

### User Story 2 — User Verifies Their Email Address (Priority: P2)

A newly registered user opens the verification email they received and clicks the verification link. The system confirms their email address and redirects them to the sign-in page with a success message. From that point, their account is fully active and they can sign in normally. If the link has expired, the user is shown an error and offered a way to request a new verification email.

**Why this priority**: Email verification is the gate between registration and usable access. Without it, the user is registered but cannot sign in. It must work before any sign-in testing can be meaningful.

**Independent Test**: With a registered unverified account, click the verification link from the email → land on a success page → sign-in page becomes accessible → signing in succeeds.

**Acceptance Scenarios**:

1. **Given** a user clicks a valid verification link, **When** the link has not expired and has not been used, **Then** their email is marked verified and they are redirected to sign-in with a success confirmation.
2. **Given** a user clicks an expired verification link, **When** the expiry time has passed, **Then** the system shows an error and offers a button to request a new verification email.
3. **Given** a user clicks a verification link that was already used, **When** the link has already been consumed, **Then** the system shows an appropriate message — it does not re-verify or error silently.
4. **Given** a user requests a new verification email, **When** their account is still unverified, **Then** a new verification email is sent and the old link is invalidated.

---

### User Story 3 — Registered User Signs In (Priority: P3)

An existing user with a verified account navigates to the sign-in page, enters their email and password, and is taken directly to the main Finance Analyser dashboard. If their credentials are wrong, they see a generic error that does not reveal which field is incorrect. If their email has not been verified, they are blocked and shown a prompt to verify.

**Why this priority**: Sign-in is the daily-use flow for all returning users. Once registration and verification work, sign-in must work before the application has any practical use.

**Independent Test**: With a verified account, enter correct credentials → reach the main application. Enter wrong password → see generic error. Enter an unverified account's credentials → see verification reminder.

**Acceptance Scenarios**:

1. **Given** a user enters their correct email and password, **When** their email is verified, **Then** they are authenticated and redirected to the main application.
2. **Given** a user enters an incorrect password or unregistered email, **When** they submit the sign-in form, **Then** the system displays a single generic error message — it does not reveal whether the email or the password was wrong.
3. **Given** a user enters correct credentials for an unverified account, **When** they submit the sign-in form, **Then** the system blocks sign-in and shows a message prompting them to verify their email, with an option to resend the verification email.
4. **Given** a user submits the sign-in form with an empty email or password field, **When** the form is submitted, **Then** field-level validation errors are displayed before the form is sent to the server.

---

### User Story 4 — User Resets a Forgotten Password (Priority: P4)

A returning user cannot remember their password. They click "Forgot password?" on the sign-in page, enter their email address, and see a confirmation message that says a reset link has been sent — regardless of whether that email is registered, to protect user privacy. If a reset email arrives, they click the link, set a new password, and are redirected to sign-in. They can then sign in with the new password.

**Why this priority**: Password reset unblocks locked-out users. It is less critical than the core sign-in flow but essential for the system to be self-sufficient without administrator intervention.

**Independent Test**: From the sign-in page, click "Forgot password?" → enter a registered email → receive reset email → click link → set new password → sign in with new password successfully.

**Acceptance Scenarios**:

1. **Given** a user submits their email on the forgot-password page, **When** the email is registered, **Then** a password reset email is sent and the page displays a generic confirmation — "If this email is registered, you will receive a reset link."
2. **Given** a user submits their email on the forgot-password page, **When** the email is not registered, **Then** the page displays the same generic confirmation — the response is identical to the registered case.
3. **Given** a user clicks a valid password reset link, **When** the link has not expired and has not been used, **Then** they are shown a form to enter and confirm a new password.
4. **Given** a user submits a new password via the reset form, **When** the password meets the minimum requirements, **Then** their password is updated, the reset link is invalidated, and they are redirected to sign-in with a success message.
5. **Given** a user clicks an expired or already-used password reset link, **When** they follow the link, **Then** the system shows an error explaining the link is invalid and directs them back to the forgot-password page.

---

### User Story 5 — Unauthenticated User Is Redirected to Sign-In (Priority: P5)

Any user who is not signed in and tries to access a page inside the application (dashboard, transactions, settings, etc.) is automatically redirected to the sign-in page. The authentication pages themselves (sign-up, sign-in, forgot password, reset password) remain accessible without being signed in.

**Why this priority**: Route protection is required for the application to be secure at all. However, it is lower priority than the flows themselves — a working auth system with all pages temporarily accessible is preferable to a blocked auth system while this enforcement is built.

**Independent Test**: Without being signed in, navigate directly to the dashboard URL → land on the sign-in page, not the dashboard. Navigate to `/sign-up` → the sign-up page loads normally.

**Acceptance Scenarios**:

1. **Given** a user is not signed in, **When** they navigate to any application page (dashboard, accounts, transactions, etc.), **Then** they are redirected to the sign-in page.
2. **Given** a user is not signed in, **When** they navigate to an authentication page (sign-up, sign-in, forgot password, reset password), **Then** the page loads normally without a redirect.

---

### Edge Cases

- What happens when a user submits the registration form with an email that differs only in letter casing from an existing account (e.g., `User@example.com` vs `user@example.com`)? The system must treat email addresses as case-insensitive.
- What happens when a verification link is accessed by a user whose account was deleted? The system must show an error, not crash.
- What happens if a user registers, verifies their email, and then tries to re-use the same verification link? The system must treat the link as already consumed.
- What happens when a user submits an extremely long email address or display name? The system must enforce maximum field lengths and show appropriate errors.
- What happens if a user requests multiple password reset emails in quick succession? The system must invalidate previous reset links when a new one is issued.
- What happens if the verification or reset email is never received? The user must have a way to resend the verification email from the sign-in page.

## Requirements _(mandatory)_

### Functional Requirements

**Registration**

- **FR-001**: The system MUST provide a sign-up page accessible to unauthenticated users where they can submit an email address, display name, and password.
- **FR-002**: The system MUST validate the email address format before submission and display a field-level error if invalid.
- **FR-003**: The system MUST enforce a minimum password length of 8 characters; passwords shorter than 8 characters MUST be rejected with a clear error.
- **FR-004**: The system MUST require a non-empty display name; an empty display name MUST be rejected with a clear error.
- **FR-005**: Upon successful registration, the system MUST send a verification email to the provided address and display a confirmation page.
- **FR-006**: The system MUST treat email addresses as case-insensitive and prevent registration with a duplicate email (regardless of case).
- **FR-007**: The system MUST block sign-in for accounts with unverified email addresses.

**Email Verification**

- **FR-008**: The verification email MUST contain a unique, time-limited link that confirms the user's email address when clicked.
- **FR-009**: Verification links MUST expire after 24 hours from the time of issue.
- **FR-010**: A used verification link MUST be permanently invalidated — clicking it a second time MUST show an appropriate message, not re-verify.
- **FR-011**: The system MUST allow users to request a new verification email; issuing a new link MUST invalidate any previously issued link for that account.
- **FR-012**: Upon successful verification, the system MUST redirect the user to the sign-in page with a success confirmation.

**Sign-In**

- **FR-013**: The system MUST authenticate users by matching their submitted email and password against stored credentials.
- **FR-014**: Failed sign-in attempts (wrong email, wrong password, or unregistered email) MUST display a single generic error message — the system MUST NOT reveal which field was incorrect.
- **FR-015**: A successful sign-in MUST redirect the authenticated user to the main application.
- **FR-016**: Sign-in attempts for accounts with unverified email addresses MUST be blocked; the system MUST show a message indicating email verification is required and offer a link to resend the verification email.

**Password Reset**

- **FR-017**: The system MUST provide a "forgot password" page accessible from the sign-in page.
- **FR-018**: Upon submitting an email on the forgot-password page, the system MUST display a generic confirmation message — the message MUST be identical whether the email is registered or not.
- **FR-019**: If the submitted email is registered, the system MUST send a password reset email containing a unique, time-limited link.
- **FR-020**: Password reset links MUST expire after 1 hour from the time of issue.
- **FR-021**: A used password reset link MUST be permanently invalidated after the password is changed.
- **FR-022**: Requesting a new password reset email MUST invalidate any previously issued reset link for that account.
- **FR-023**: The password reset form MUST enforce the same minimum password requirements as registration (8 characters minimum).
- **FR-024**: Upon successful password reset, the system MUST redirect the user to sign-in with a success confirmation.

**Route Protection**

- **FR-025**: All application pages except the four authentication pages MUST redirect unauthenticated users to the sign-in page.
- **FR-026**: The sign-up, sign-in, forgot-password, and reset-password pages MUST be accessible to unauthenticated users.

### Key Entities

- **User Account**: Represents a registered user — holds email address (case-normalised), display name, credential verification status (verified / unverified), and registration timestamp.
- **Email Verification Token**: A single-use, time-limited token linked to a user account — used to confirm ownership of the registered email address. Has an expiry time and a consumed flag.
- **Password Reset Token**: A single-use, time-limited token linked to a user account — used to authorise a password change without knowing the current password. Has an expiry time and a consumed flag.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A new user can complete registration and receive a verification email in under 2 minutes from landing on the sign-up page.
- **SC-002**: A user can sign in to the main application in under 30 seconds from landing on the sign-in page.
- **SC-003**: A user can complete the full password reset flow — from clicking "Forgot password?" to signing in with a new password — in under 5 minutes.
- **SC-004**: 100% of protected application pages redirect unauthenticated users to sign-in — no protected content is reachable without authentication.
- **SC-005**: The forgot-password page returns an identical response for registered and unregistered email addresses — 0 information leakage about account existence.
- **SC-006**: Failed sign-in attempts never reveal whether the email or password was wrong — the error message is identical in both cases.
- **SC-007**: All form validation errors are surfaced before server submission — users are informed of input issues without waiting for a network round-trip.
- **SC-008**: Verification links and password reset links are single-use — attempting to reuse a consumed link returns an error 100% of the time.

## Assumptions

- The application has a single user role — there are no admin, read-only, or guest tiers introduced by this feature.
- Email delivery is handled by an external email service; the system is responsible for triggering the send, not the delivery infrastructure itself.
- Verification tokens expire after 24 hours; password reset tokens expire after 1 hour — both are standard industry defaults for the respective flows.
- Minimum password length is 8 characters. No additional complexity requirements (mixed case, numbers, symbols) are enforced in v1 — this can be tightened in a future security hardening pass.
- Email addresses are stored and compared in lowercase; a user registering as `User@Example.com` is treated as identical to `user@example.com`.
- The "resend verification email" action is available from the sign-in page when an unverified user attempts to sign in, and from the expired-link error page.
- Password reset links are per-request: requesting a second reset email before using the first invalidates the first link, preventing accumulation of live reset tokens.
- Session management beyond confirming successful authentication (e.g., token refresh, remember-me, session expiry) is out of scope and covered by a separate feature.
- Social login (Google, GitHub, etc.) and two-factor authentication are out of scope for this feature.
- The reset password page must validate that both password fields match before submission (confirm-password field).
