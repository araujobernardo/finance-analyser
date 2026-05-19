# Feature Specification: FA-BUDG-003 — Budget Alerts

**Feature Branch**: `029-budget-alerts`
**Created**: 2026-05-19
**Status**: Draft
**Input**: User description: "FA-BUDG-003 — Budget alert when category exceeds 80% of limit"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — In-App Alert Banner (Priority: P1)

A user opens the Finance Analyser on any page — Dashboard, Transactions, Net Worth, or Budget. At the top of the page, a banner appears listing the budget categories where spending has reached or exceeded 80% of the monthly limit for the current budget period. Each affected category is shown with its name and current usage percentage. The user reads the banner, decides they have noted the warning, and clicks Dismiss. The banner disappears for the rest of their session. When they open the app the next day (new session), the banner reappears if those categories are still over the threshold.

**Why this priority**: The in-app banner is the most immediate and universally visible form of alerting — it reaches the user the moment they open the app, regardless of whether they have email notifications configured. Email alerts (US2) depend on the same threshold-check logic developed for this story, making US1 the natural foundation.

**Independent Test**: Set up a budget for "Groceries" at $500 with $410 in transactions for the current period (82% — over the default 80% threshold). Open the app on any page — the banner appears listing "Groceries" at 82%. Dismiss the banner — it disappears. Navigate to another page in the same session — the banner does not reappear. Refresh the page (new session) — the banner reappears because the category is still over threshold. Set up a budget for "Dining" at $300 with $200 in transactions (67% — under threshold) — "Dining" does not appear in the banner.

**Acceptance Scenarios**:

1. **Given** a budget category where actual spend is at or above the alert threshold percentage of the limit, **When** the user visits any page in the application, **Then** an alert banner is displayed at the top of the page listing that category's name and current usage percentage.
2. **Given** multiple budget categories are over the threshold, **When** the banner renders, **Then** all affected categories are listed in the banner (not just the first).
3. **Given** the alert banner is visible, **When** the user clicks Dismiss, **Then** the banner disappears immediately and does not reappear during the same browser session.
4. **Given** the user dismissed the banner in a previous session, **When** they open the app in a new session and the affected categories are still over threshold, **Then** the banner reappears.
5. **Given** no budget categories are at or above the alert threshold, **When** the user visits any page, **Then** no alert banner is shown.
6. **Given** a user has no budgets configured for the current month, **When** they visit any page, **Then** no alert banner is shown.
7. **Given** a budget category has `limitAmount = 0` and any actual spend > 0 (i.e., percentageUsed = 100%), **When** the user visits any page, **Then** that category appears in the alert banner (100% ≥ 80% threshold).

---

### User Story 2 — Daily Email Notification (Priority: P2)

Once a day, the system checks the user's budget categories for the current period. If one or more categories have actual spend at or above the alert threshold and the user has not already received an alert email today, the system sends a summary email listing the affected categories by name and their current usage percentages, along with a link to the Budget page. If the user has already received an alert email today, no additional email is sent. If the user has opted out of email alerts, no email is sent regardless.

**Why this priority**: Email alerts extend the in-app banner to reach users who are not actively using the app. They are more complex to implement (scheduling, deduplication, email delivery) so they follow the simpler in-app story. A user who never checks the app would only be protected by this story.

**Independent Test**: Configure one budget category at 85% spend. Run the daily alert check — one email is sent. Run the daily alert check again (same calendar day) — no second email is sent. Advance to the next calendar day, confirm the category is still over threshold, run the check again — one email is sent. Opt out of email alerts and run the check — no email is sent. Opt back in and set all categories below threshold — no email is sent.

**Acceptance Scenarios**:

1. **Given** one or more budget categories are at or above the alert threshold and no alert email has been sent today, **When** the daily alert check runs, **Then** one summary email is sent listing all affected categories and their current usage percentages, with a link to the Budget page.
2. **Given** an alert email has already been sent today, **When** the daily alert check runs again on the same calendar day, **Then** no email is sent.
3. **Given** no budget categories are at or above the alert threshold, **When** the daily alert check runs, **Then** no email is sent.
4. **Given** the user has opted out of email alert notifications, **When** the daily alert check runs regardless of category status, **Then** no email is sent.
5. **Given** a category was over threshold yesterday and is still over threshold today, **When** the daily alert check runs, **Then** one email is sent for today (the one-per-day limit is per calendar day, not per alert event).
6. **Given** a user has no budgets for the current month, **When** the daily alert check runs, **Then** no email is sent.

---

### User Story 3 — Configurable Alert Threshold (Priority: P3)

A user finds the default 80% threshold too late — by the time they get an alert at 80%, it is already difficult to cut spending enough to stay under limit. They lower their threshold to 60% so they get an earlier warning. From their preferences, they update the threshold to 60%. The in-app banner and email alerts now trigger when any category reaches 60% of its limit. Another user finds 80% too aggressive and raises it to 95%.

**Why this priority**: The 80% default is usable for most users, so alerting works without this story. Threshold configurability is a quality-of-life improvement. US1 and US2 use the threshold value — if no custom threshold is set, 80% is used.

**Independent Test**: With a budget category at 75% spend: at the default 80% threshold, no alert appears. Change the threshold to 70% — the in-app banner now shows that category. Change the threshold to 50% — the banner still shows it. Change the threshold to 80% (reset to default) — the banner no longer shows it. Attempt to set threshold to 49% — rejected. Attempt 101% — rejected. Set to 50% and 100% (boundaries) — both accepted.

**Acceptance Scenarios**:

1. **Given** a user updates their alert threshold to 70%, **When** a budget category has actual spend at or above 70% of its limit, **Then** that category triggers both the in-app banner and the daily email check.
2. **Given** a user updates their alert threshold to 90%, **When** a budget category is at 85%, **Then** that category does NOT appear in the banner or email (85% < 90% threshold).
3. **Given** a user submits a threshold value below 50 or above 100, **When** the value is validated, **Then** the system rejects it with an appropriate message and the previous threshold is retained.
4. **Given** a user changes their threshold, **When** they navigate to any page, **Then** the in-app banner immediately reflects the new threshold — categories that were previously hidden (below the old threshold) may now appear, and vice versa.
5. **Given** no threshold has been configured, **When** the alert system evaluates categories, **Then** the default threshold of 80% is used.

---

### User Story 4 — Email Opt-Out Preference (Priority: P4)

A user finds the daily emails unnecessary — they check the app regularly and the in-app banner is sufficient. From their preferences, they turn off email alert notifications. The daily alert check continues to run but sends no email to this user. If they later want to re-enable email alerts, they can toggle the setting back on.

**Why this priority**: The email opt-out is a safeguard against notification fatigue. The email feature (US2) works without opt-out — opt-out is a preference layer on top of it.

**Independent Test**: With a category over threshold and email alerts enabled — confirm an alert email would be sent. Disable email alerts in preferences. Run the daily alert check — no email is sent. Enable email alerts again — confirm the daily check would send an email again.

**Acceptance Scenarios**:

1. **Given** email alerts are enabled (default), **When** the daily alert check finds over-threshold categories, **Then** an email is sent.
2. **Given** a user disables email alerts, **When** the daily alert check runs, **Then** no email is sent regardless of category status.
3. **Given** a user re-enables email alerts after having disabled them, **When** the daily alert check runs and categories are over threshold, **Then** email alerts resume.
4. **Given** a user with email alerts disabled, **When** they view their preferences, **Then** the opt-out status is clearly visible and the current setting is accurately reflected.
5. **Given** email alerts are disabled, **When** the user visits any page, **Then** the in-app alert banner is unaffected — opt-out only suppresses email, not the banner.

---

### Edge Cases

- What if no budgets exist for the current month? → No alert banner appears; no alert email is sent.
- What if a budget has `limitAmount = 0` and any spend > 0? → Usage is treated as 100% (inherited from FA-BUDG-002 definition) — this always meets the alert threshold.
- What if the user's alert threshold is exactly 80% and a category is at exactly 80%? → The alert triggers (condition is `>=`, inclusive).
- What if the user dismisses the banner and then, within the same session, a new category crosses the threshold? → The dismissed state suppresses the banner for the session; the new category's alert is visible on the next session load.
- What if the daily email check runs and the user simultaneously updates their threshold to exclude all affected categories? → The check uses the threshold at the time it runs — no alert is sent if no categories meet the (now-higher) threshold.
- What if multiple categories are over threshold on the same day? → A single consolidated email lists all of them.
- What if the budget period crosses a calendar month boundary (monthStartDay > 1)? → The alert check uses the same budget period definition as FA-BUDG-002 (start = monthStartDay of current month, end = one period later minus one day).
- What happens if the alert email fails to deliver? → The per-day deduplication state should only be updated after successful delivery, so the system may retry or the next day's check will catch it again.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The application MUST display an in-app alert banner at the top of every page when one or more of the user's budget categories for the current budget period has actual spend at or above the user's configured alert threshold percentage of its limit.
- **FR-002**: The alert banner MUST list every affected category by name and current usage percentage. All affected categories are shown, not just the first.
- **FR-003**: The user MUST be able to dismiss the alert banner; once dismissed, it MUST NOT reappear within the same browser session.
- **FR-004**: The dismissed state is session-scoped only — the banner MUST reappear in a new session if the affected categories are still over threshold.
- **FR-005**: A daily background process MUST check the user's budget categories for the current period and send a summary alert email if any categories are at or above the alert threshold and the user has not already received an alert email on the current calendar day.
- **FR-006**: The alert email MUST list each affected category by name and current usage percentage, and MUST include a link to the Budget page.
- **FR-007**: The system MUST send at most one alert email per user per calendar day. If an alert email was already sent today, subsequent daily checks MUST NOT send another email.
- **FR-008**: The user MUST be able to opt out of email alert notifications. When opted out, no alert emails are sent; the in-app banner is unaffected.
- **FR-009**: The system MUST allow the user to configure their alert threshold as an integer percentage between 50 and 100 inclusive. The default threshold is 80.
- **FR-010**: The alert threshold MUST apply uniformly to all budget categories for the user. Per-category thresholds are not supported.
- **FR-011**: The alert threshold and email opt-out preference MUST persist across sessions.
- **FR-012**: A category triggers an alert when `(actualSpend / limitAmount) × 100 >= alertThreshold`. For zero-limit categories where actualSpend > 0, usage is treated as 100% and the alert always triggers (since 100% ≥ any threshold ≤ 100).
- **FR-013**: Alert checks MUST use the same budget period date range as FA-BUDG-002 — start date determined by the user's configured `monthStartDay`.

### Key Entities

- **Alert Preferences** (stored, extends user_preferences from FA-BUDG-001): Per-user alert threshold (integer 50–100, default 80) and email alerts enabled flag (boolean, default true).
- **Alert Email Log** (stored): Records when an alert email was last sent per user, used to enforce the one-per-day deduplication rule. Contains at minimum: user reference and the date the email was sent.
- **Budget Alert** (view model, not stored): A computed summary of budget categories that meet or exceed the alert threshold for the current period. Contains: category name, current usage percentage. Derived from the same budget calculation logic as FA-BUDG-002.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The in-app alert banner appears on every page within one page load after a category meets or exceeds the threshold — verified by a manual smoke test against three pages (Dashboard, Transactions, Budget).
- **SC-002**: The daily alert email is sent at most once per calendar day per user — verified by an automated test that runs the daily check twice on the same day and confirms only one email is dispatched.
- **SC-003**: Threshold configuration correctly controls which categories appear in alerts — verified by automated tests at the 50%, 80%, and 100% boundary values, confirming categories at exactly the threshold are included and categories one point below are excluded.
- **SC-004**: Email opt-out reliably suppresses all outgoing alert emails — verified by an automated test confirming zero emails are dispatched when the user has opted out.
- **SC-005**: Alert preferences (threshold value and email opt-out) persist correctly — verified by setting preferences, reloading the app, and confirming the saved values are restored.
- **SC-006**: Alert email deduplication state is not updated on delivery failure — the system does not suppress tomorrow's alert email if today's failed to send.

## Assumptions

- This feature depends on FA-BUDG-001 (data model for user preferences table) and FA-BUDG-002 (budget calculation logic and BudgetContext) being shipped and available.
- The budget period used for alert calculations matches FA-BUDG-002: `[monthStartDay of current month, monthStartDay of next month − 1 day]`.
- Transfer transactions are excluded from spend totals used in alert calculations (inherited from FA-BUDG-002).
- The in-app alert banner fetches budget alert data via a lightweight API call on app load — it does not require BudgetContext to be mounted on every page.
- The single-user app has one registered email address; no per-user email selection is needed for alert delivery.
- The daily check runs once per calendar day at a server-configured time; the specific time is not user-configurable.
- "Calendar day" for deduplication purposes is based on the server's configured timezone (UTC by default).
- SMS alerts, mobile push notifications, and webhook integrations are explicitly out of scope for this feature.
- Per-category alert thresholds are out of scope; a single threshold applies to all categories.
- The alert email does not need to include transaction-level detail — category name and usage percentage are sufficient.
- If an alert email fails to deliver, the deduplication record is not written, allowing a retry or the next day's check to attempt delivery again.
- The in-app banner dismissal is implemented with client-side session state (e.g., sessionStorage) — no server-side tracking of dismissal is required.
