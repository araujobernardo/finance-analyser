# Tasks: FA-BUDG-003 — Budget Alerts

**Input**: Design documents from `specs/029-budget-alerts/`
**Branch**: `029-budget-alerts`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to
- This feature spans `src/db/`, `src/server/utils/`, `src/server/jobs/`, `src/server/routes/`, `src/types/api.ts`, `src/components/`, `src/pages/SettingsPage.tsx`, `src/App.tsx`, `src/server/index.ts`, and `vercel.json`

**Prerequisite**: FA-BUDG-001 and FA-BUDG-002 must be merged before implementing this feature — migration 0007 (user_preferences table) and `calculateBudgetSpend` utility must exist.

---

## Phase 2: Foundational — Schema Extension + Alert Check Utility (Blocking Prerequisites)

**Goal**: Add the three new columns to `user_preferences`, update the Drizzle schema and TypeScript types, and create the `checkBudgetAlerts` utility that every story builds on. All four tasks must complete before any user story work begins.

**Independent Test**: Apply the migration — confirm `user_preferences` has `alert_threshold` (default 80), `email_alerts_enabled` (default true), and `last_alert_email_sent_at` (null). Import `checkBudgetAlerts` — confirm it returns an empty array when no budgets exist, returns the correct categories when spend meets or exceeds the threshold, and respects the stored `alertThreshold` value.

- [ ] T001 [P] Create `src/db/migrations/0008_budget_alert_preferences.sql` — write exactly: `ALTER TABLE "user_preferences" ADD COLUMN "alert_threshold" integer NOT NULL DEFAULT 80, ADD COLUMN "email_alerts_enabled" boolean NOT NULL DEFAULT true, ADD COLUMN "last_alert_email_sent_at" date;` followed by `--> statement-breakpoint` then `ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_alert_threshold_check" CHECK (alert_threshold >= 50 AND alert_threshold <= 100);` — follow the `-->  statement-breakpoint` separator pattern from `0004_net_worth_snapshots.sql`
- [ ] T002 Extend `userPreferences` table definition in `src/db/schema.ts` — after the `monthStartDay` column, add: `alertThreshold: integer("alert_threshold").notNull().default(80)`, `emailAlertsEnabled: boolean("email_alerts_enabled").notNull().default(true)`, `lastAlertEmailSentAt: date("last_alert_email_sent_at")` — `boolean` and `date` are already imported; no new imports needed; `UserPreferences` and `NewUserPreferences` type exports (already defined from FA-BUDG-001) automatically pick up the new columns
- [ ] T003 [P] Extend `ApiUserPreferences` and add `AlertedCategory` in `src/types/api.ts` — (1) extend the existing `ApiUserPreferences` interface (added in FA-BUDG-002) to add three fields: `alertThreshold: number`, `emailAlertsEnabled: boolean`, `lastAlertEmailSentAt: string | null`; (2) add a new exported interface `AlertedCategory { categoryName: string; limitAmount: number; actualSpend: number; percentageUsed: number }`
- [ ] T004 Create `src/server/utils/checkBudgetAlerts.ts` — export `async function checkBudgetAlerts(userId: string, db: DrizzleDb): Promise<AlertedCategory[]>`; implementation: (1) fetch `userPreferences` for userId — default `alertThreshold = 80`, `monthStartDay = 1` if no row; (2) determine current period year+month: `today = new Date()`; if `today.getDate() >= monthStartDay` then `year = today.getFullYear(), month = today.getMonth() + 1`; else step back one calendar month (if month is 1, year− 1 and month = 12, otherwise same year and month − 1); (3) fetch all budgets for `(userId, year, month)` from `budgets` table; (4) for each budget call `calculateBudgetSpend(userId, categoryName, year, month, monthStartDay, db)` (import from `./calculateBudgetSpend`); (5) compute `percentageUsed` using the same logic as FA-BUDG-002 (divide by limit; 100 if limit = 0 and spend > 0); (6) return rows where `percentageUsed >= alertThreshold` as `AlertedCategory[]`; return `[]` if no budgets

**Checkpoint**: Migration exists and is correct. `userPreferences` in `schema.ts` has all three new columns. `ApiUserPreferences` has three new fields; `AlertedCategory` is exported from `api.ts`. `checkBudgetAlerts` is importable and returns correctly filtered results.

---

## Phase 3: User Story 1 — In-App Alert Banner (Priority: P1) 🎯 MVP

**Goal**: Every page in the app shows a dismissible banner listing budget categories that have reached or exceeded the alert threshold for the current period. The banner fetches data on mount without blocking page render and is dismissed via sessionStorage.

**Independent Test**: With a budget category at 85% spend and the default 80% threshold: open any page — the banner appears listing that category at 85%. Click Dismiss — the banner disappears. Navigate to another page — no banner. Refresh — banner reappears. Set the category's spend below 80% — no banner on the next load. Have no budgets — no banner.

- [ ] T005 [US1] Add `GET /alerts` route to `src/server/routes/budgets.ts` — add a new handler `router.get("/alerts", authenticateToken, async (req, res) => { ... })` to the existing `budgetsRouter`; handler calls `checkBudgetAlerts(req.user!.id, db)` (import from `../../utils/checkBudgetAlerts`); returns `AlertedCategory[]` with status 200; returns `[]` (not 404) when no categories are alerted; **Prerequisite**: FA-BUDG-002 must be merged (budgets.ts must exist)
- [ ] T006 [P] [US1] Create `src/components/AlertBanner.tsx` — on mount: (1) check `sessionStorage.getItem("fa-budget-alert-dismissed")` — if equal to today's ISO date (`new Date().toISOString().slice(0, 10)`), return null immediately (no fetch); (2) fetch `GET /api/budgets/alerts` (fire-and-forget in `useEffect` — does not block render); (3) if response is empty array or fetch fails, render nothing; (4) if alerted categories exist, render a banner: `⚠ Budget alert — [category]: [X]% · [category]: [Y]% — [View Budget link to /budget] — [✕ dismiss button]`; dismiss sets `sessionStorage.setItem("fa-budget-alert-dismissed", todayISO)` and hides the banner; use the same `useApi` hook for the fetch as other components in the project
- [ ] T007 [US1] Wire `AlertBanner` into authenticated layout in `src/App.tsx` — import `AlertBanner` from `./components/AlertBanner`; render `<AlertBanner />` once inside the authenticated layout section, above `<Routes>` so it appears on every authenticated page; the component is self-contained and requires no props or context

**Checkpoint**: Banner appears on any page when categories are over threshold. Dismiss suppresses it for the session. Refresh restores it. No banner when nothing is over threshold.

---

## Phase 4: User Story 2 — Daily Email Notification (Priority: P2)

**Goal**: A daily cron job checks the user's budget categories and sends one alert email per day if any are over threshold and no email has been sent today. The job endpoint is protected by a shared secret.

**Independent Test**: With a category at 85% spend and no prior email today: trigger the job endpoint with the correct `x-cron-secret` — one email is dispatched and `lastAlertEmailSentAt` is updated to today. Trigger the endpoint again on the same day — no email sent (`lastAlertEmailSentAt` already equals today). Set all categories below threshold — no email. With email opt-in disabled: no email regardless. Call the endpoint without the secret header — receive 401.

- [ ] T008 [P] [US2] Create `src/server/utils/sendBudgetAlertEmail.ts` — export `async function sendBudgetAlertEmail(userEmail: string, month: string, alertedCategories: AlertedCategory[]): Promise<void>`; import `getResendClient` and `fromAddress` from `../services/emailService` (they are not currently exported — **check if they need to be exported or if this function should live in emailService.ts instead**; follow whichever approach avoids duplicating Resend initialisation); subject: `"Finance Analyser — budget alert for ${month}"`; HTML body lists each category: `${categoryName}: $${actualSpend.toFixed(2)} of $${limitAmount.toFixed(2)} (${percentageUsed}%)` with a link to `${appUrl()}/budget` at the end; `appUrl()` is already defined in `emailService.ts` — reuse or import
- [ ] T009 [US2] Create `src/server/jobs/budgetAlertJob.ts` (new `jobs/` directory) — export `async function runBudgetAlertJob(db: DrizzleDb): Promise<void>`; implementation: (1) get today's UTC ISO date: `const today = new Date().toISOString().slice(0, 10)`; (2) query `user_preferences` joined with `users` WHERE `email_alerts_enabled = true AND (last_alert_email_sent_at IS NULL OR last_alert_email_sent_at < today)` to get `{ userId, email }` list; (3) for each user sequentially (not parallel): call `checkBudgetAlerts(userId, db)`; if empty skip; call `sendBudgetAlertEmail(email, monthLabel, alerted)` where `monthLabel` is derived from the current period; on success only: `UPDATE user_preferences SET last_alert_email_sent_at = today, updated_at = now() WHERE user_id = userId`; on per-user error: log and continue to next user (do not rethrow)
- [ ] T010 [US2] Create `src/server/routes/jobs.ts` — export `jobsRouter = Router()`; implement handler: `router.get("/budget-alerts", async (req, res) => { ... })` (GET, not POST — Vercel Cron invokes endpoints as GET); check `req.headers["x-cron-secret"] === process.env.CRON_SECRET` — if missing or wrong return 401; call `await runBudgetAlertJob(db)` (import from `../../jobs/budgetAlertJob`); return `{ ok: true }` with status 200; wrap in try/catch and return 500 on unhandled error
- [ ] T011 [US2] Register `jobsRouter` in `src/server/index.ts` — add `import { jobsRouter } from "./routes/jobs.ts"` and `app.use("/api/jobs", jobsRouter)` after the existing route registrations
- [ ] T012 [P] [US2] Create `vercel.json` at the repository root — content: `{ "crons": [{ "path": "/api/jobs/budget-alerts", "schedule": "0 20 * * *" }] }` — schedule `0 20 * * *` = 20:00 UTC = 8:00 AM NZST; this file does not currently exist in the project

**Checkpoint**: `GET /api/jobs/budget-alerts` with correct `x-cron-secret` triggers the job. Email is sent for over-threshold categories. `lastAlertEmailSentAt` updated only on success. Same-day re-trigger sends no email. `vercel.json` present with correct cron schedule.

---

## Phase 5: User Story 3 — Configurable Alert Threshold (Priority: P3)

**Goal**: The user can change their alert threshold (50–100%) so alerts fire earlier or later than the default 80%. The new threshold takes effect immediately on the next page load.

**Independent Test**: With a category at 75% spend: at the default 80% threshold, no banner appears. Change threshold to 70% via the SettingsPage input — the banner now shows that category. Change to 76% — category still shown. Change back to 80% — banner gone. Submit 49% — rejected with validation error. Submit 101% — rejected.

- [ ] T013 [US3] Extend PATCH Zod schema in `src/server/routes/userPreferences.ts` — add `alertThreshold: z.number().int().min(50).max(100).optional()` to the existing Zod update schema; update the Drizzle `SET` clause to conditionally include `alertThreshold` when provided; return updated `ApiUserPreferences` (now including the three new fields from T003); **Prerequisite**: FA-BUDG-002 must be merged (userPreferences.ts must exist)
- [ ] T014 [P] [US3] Add `AlertPreferencesSection` to `src/pages/SettingsPage.tsx` — add a self-contained section below the existing content (do not modify the existing props-based pattern); the section uses `useApi` directly to: (a) fetch `GET /api/preferences` on mount to read current `alertThreshold`; (b) render a labelled number input (type="number", min=50, max=100) showing the current value; (c) on change validate client-side (50–100 integer; show inline error if invalid); (d) on valid change call `PATCH /api/preferences` with `{ alertThreshold: newValue }`; the section heading can be "Alert Preferences"

**Checkpoint**: Changing the threshold via the UI immediately affects which categories appear in the banner on the next load. Values outside 50–100 are rejected server-side (400) and client-side (inline error).

---

## Phase 6: User Story 4 — Email Opt-Out Preference (Priority: P4)

**Goal**: The user can disable email alert notifications. When disabled, the daily job skips sending email regardless of category status. The in-app banner is unaffected by this setting.

**Independent Test**: With email alerts enabled and a category over threshold: trigger the job — email sent. Disable email alerts via SettingsPage toggle — trigger the job — no email sent. Re-enable — trigger the job — email sent again. Confirm the in-app banner still appears whether email alerts are enabled or disabled.

- [ ] T015 [US4] Extend PATCH Zod schema in `src/server/routes/userPreferences.ts` — add `emailAlertsEnabled: z.boolean().optional()` to the existing Zod update schema (sequential extension of T013 — same file); update the Drizzle `SET` clause to conditionally include `emailAlertsEnabled` when provided
- [ ] T016 [P] [US4] Add email alerts toggle to `AlertPreferencesSection` in `src/pages/SettingsPage.tsx` — extend the section created in T014: (a) also fetch `emailAlertsEnabled` from `GET /api/preferences`; (b) render a labelled checkbox or toggle showing the current value; (c) on change call `PATCH /api/preferences` with `{ emailAlertsEnabled: newValue }` immediately (no debounce — boolean flip); note: this task modifies the same section created in T014, so T014 must complete first

**Checkpoint**: Toggle persists across page reloads. Job respects the opt-out. Banner is unaffected by the toggle state.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T017 [P] Run TypeScript typecheck (`tsc --noEmit`) and lint (`npm run lint`) across all new and modified files — `src/db/schema.ts`, `src/db/migrations/0008_budget_alert_preferences.sql`, `src/types/api.ts`, `src/server/utils/checkBudgetAlerts.ts`, `src/server/utils/sendBudgetAlertEmail.ts`, `src/server/jobs/budgetAlertJob.ts`, `src/server/routes/budgets.ts`, `src/server/routes/userPreferences.ts`, `src/server/routes/jobs.ts`, `src/server/index.ts`, `src/components/AlertBanner.tsx`, `src/pages/SettingsPage.tsx`, `src/App.tsx`, `vercel.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: Requires FA-BUDG-001 and FA-BUDG-002 merged — start immediately once those are available
  - T001 ∥ T003 (different files: migration SQL vs types/api.ts)
  - T002: schema.ts (can be written alongside T001; different file)
  - T004: depends on T002 (imports updated schema) and T003 (imports AlertedCategory) — run after both
- **US1 (Phase 3)**: Depends on T004 (checkBudgetAlerts) + FA-BUDG-002 budgets.ts file
  - T005: extend budgets.ts (requires FA-BUDG-002 merge)
  - T006 [P]: AlertBanner — can be drafted alongside T005 (different file)
  - T007: after T006 (AlertBanner must exist to import)
- **US2 (Phase 4)**: Depends on T004 (checkBudgetAlerts)
  - T008 [P]: standalone util — can run alongside T005/T006
  - T009: after T008 (imports sendBudgetAlertEmail) and T004 (imports checkBudgetAlerts)
  - T010: after T009 (imports runBudgetAlertJob)
  - T011: after T010 (imports jobsRouter)
  - T012 [P]: vercel.json — fully independent, can run any time
- **US3 (Phase 5)**: Depends on T002/T003 (schema/types updated) + FA-BUDG-002 userPreferences.ts
  - T013: extend userPreferences.ts PATCH schema
  - T014 [P]: SettingsPage section — can be drafted alongside T013 (different section, different concept)
- **US4 (Phase 6)**: Depends on T013 (same file to extend) and T014 (same SettingsPage section to extend)
  - T015: after T013 (sequential same-file extension)
  - T016: after T014 (sequential same-section extension)
- **Polish (Phase 7)**: Depends on all implementation tasks complete

### Within Each Phase

- Same-file edits are always sequential: T013 → T015 (userPreferences.ts), T014 → T016 (SettingsPage.tsx AlertPreferencesSection)
- `getResendClient` and `fromAddress` in `emailService.ts` — check export status before T008; may need to export them if currently unexported

### Parallel Opportunities

- T001 ∥ T002 ∥ T003 (different files: migration, schema.ts, types/api.ts)
- T006 ∥ T005 (AlertBanner component vs budgets.ts route extension)
- T008 ∥ T005 ∥ T006 (sendBudgetAlertEmail is fully independent)
- T012 ∥ everything (vercel.json touches no shared code)
- T014 ∥ T013 (SettingsPage new section vs userPreferences.ts Zod schema)

---

## Parallel Example: US1 Core Implementation

```
# After T001 + T002 + T003 + T004 complete:

# Run simultaneously:
T005 — add GET /alerts to src/server/routes/budgets.ts
T006 — create src/components/AlertBanner.tsx

# Then:
T007 — wire AlertBanner into src/App.tsx  (after T006)
```

---

## Implementation Strategy

### MVP (Phase 2 + Phase 3 only — US1)

1. Complete T001 + T002 + T003 (schema + types — can be parallel)
2. Complete T004 (checkBudgetAlerts utility)
3. Complete T005 + T006 (route + component — can be parallel)
4. Complete T007 (wire into App.tsx)
5. **VALIDATE**: Visit any page — banner appears for over-threshold categories; dismiss works; reappears on refresh
6. Ship — in-app alerting is live

### Incremental Delivery

1. Phase 2 (foundational) → schema updated, alert check utility ready ✅
2. Phase 3 (US1) → in-app banner on every page ✅
3. Phase 4 (US2) → daily email job + Vercel Cron ✅
4. Phase 5 (US3) → user-configurable threshold ✅
5. Phase 6 (US4) → email opt-out ✅
6. Phase 7 (polish) → typecheck + lint ✅

---

## Notes

- `getResendClient` and `fromAddress` in `src/server/services/emailService.ts` are not currently exported — T008 must either export them from that file or inline the Resend initialisation; follow whichever avoids duplication
- The `jobs/` directory (`src/server/jobs/`) does not currently exist — T009 creates it implicitly by creating the first file in it
- `vercel.json` does not currently exist — T012 creates it at the repository root
- FA-BUDG-002 must be merged before T005 (adds to budgets.ts) and T013/T015 (adds to userPreferences.ts); plan implementation order accordingly
- The `AlertBanner` does not use BudgetContext — it makes its own lightweight fetch to avoid requiring BudgetProvider on every page
- `lastAlertEmailSentAt` is only written after a confirmed successful Resend API call — this is intentional; a failed send does not consume the day's quota
