# Implementation Plan: FA-BUDG-003 — Budget Alerts

**Branch**: `029-budget-alerts` | **Date**: 2026-05-19 | **Spec**: [spec.md](./spec.md)

## Summary

Extends the budget feature with two alert delivery channels: an in-app dismissible banner (shown on every page when categories exceed the alert threshold) and a daily email notification (sent at most once per calendar day via Resend). Adds three columns to `user_preferences`, a new `checkBudgetAlerts` utility, a daily cron job endpoint protected by `CRON_SECRET`, an `AlertBanner` component wired into the app shell, and a preferences UI for threshold and email opt-out. Depends on FA-BUDG-001 (data model) and FA-BUDG-002 (budget calculations, `calculateBudgetSpend`, `/api/preferences` endpoint).

---

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: Drizzle ORM, PostgreSQL, Express, React 18, Resend, Zod, Vite
**Storage**: PostgreSQL via Drizzle ORM — one ALTER TABLE migration
**Testing**: Vitest — unit tests for alert-check and deduplication logic
**Target Platform**: Node.js server (Express) + React SPA (Vite) + Vercel Cron Jobs
**Project Type**: Full-stack web application (monorepo) — server utilities, a job endpoint, frontend component, and Vercel config
**Performance Goals**: Alert banner renders without blocking page load (fire-and-forget fetch); daily job runs sequentially per user to stay within Resend rate limits
**Constraints**: No new migration library; hand-written SQL only; `CRON_SECRET` env var must be added; `vercel.json` does not yet exist and must be created; Resend already configured via `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
**Scale/Scope**: Single-user app — daily job always processes exactly one user

---

## Constitution Check

| Rule                                         | Status                                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| GR-1 — No assumption about product decisions | ✅ Spec and user input define all thresholds, endpoints, cron schedule, and UI placement    |
| GR-2 — No credentials/secrets exposed        | ✅ `CRON_SECRET` added to env vars; never exposed in responses                              |
| GR-3 — No localStorage schema changes        | ✅ Only `sessionStorage` key `fa-budget-alert-dismissed` — no localStorage changes          |
| GR-4 — Definition of Ready check             | ✅ Spec complete, all FRs defined and checklist all-pass                                    |
| GR-5 — Definition of Done check              | ✅ QA will verify before merge                                                              |
| GR-6 — When in doubt, do less                | ✅ No per-category thresholds, no SMS/push; job runs sequentially (no parallel concurrency) |

No violations. No Complexity Tracking entries required.

---

## Project Structure

### Documentation (this feature)

```text
specs/029-budget-alerts/
├── plan.md              ← this file
├── data-model.md        ← Phase 1 output
├── contracts/           ← Phase 1 output (API contracts)
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code Changes

```text
src/
├── db/
│   ├── schema.ts                                    ← MODIFY: extend userPreferences table
│   └── migrations/
│       └── 0008_budget_alert_preferences.sql        ← NEW: ALTER TABLE user_preferences
├── server/
│   ├── index.ts                                     ← MODIFY: register jobsRouter
│   ├── routes/
│   │   ├── budgets.ts                               ← MODIFY: add GET /alerts route
│   │   ├── userPreferences.ts                       ← MODIFY: extend PATCH Zod schema
│   │   └── jobs.ts                                  ← NEW: POST /api/jobs/budget-alerts
│   ├── utils/
│   │   ├── checkBudgetAlerts.ts                     ← NEW
│   │   └── sendBudgetAlertEmail.ts                  ← NEW
│   └── jobs/
│       └── budgetAlertJob.ts                        ← NEW
├── components/
│   └── AlertBanner.tsx                              ← NEW
├── App.tsx                                          ← MODIFY: render AlertBanner in shell
└── pages/
    └── SettingsPage.tsx                             ← MODIFY: add alert preferences section
vercel.json                                          ← NEW: Vercel Cron configuration
```

---

## Phase 0: Research

### Decision: Migration is 0008 — ALTER TABLE on user_preferences

**Decision**: `0008_budget_alert_preferences.sql` uses `ALTER TABLE "user_preferences" ADD COLUMN ...` to add `alert_threshold`, `email_alerts_enabled`, and `last_alert_email_sent_at`. No new table is needed.

**Rationale**: FA-BUDG-001 creates `user_preferences` in migration `0007`. FA-BUDG-003 extends it. Single-user app — `lastAlertEmailSentAt` on the user row is simpler than a dedicated log table and sufficient for one-per-day deduplication.

**Alternatives considered**: Separate `alert_email_log` table — rejected; adds a join on every job run for no benefit in a single-user app.

### Decision: Reuse emailService.ts helpers

**Decision**: `sendBudgetAlertEmail.ts` calls `getResendClient()` and `fromAddress()` from the existing `src/server/services/emailService.ts` rather than instantiating Resend directly.

**Rationale**: `emailService.ts` already handles `RESEND_API_KEY` and `RESEND_FROM_EMAIL` env var validation with clear error messages. Reusing it keeps Resend configuration centralised.

### Decision: CRON_SECRET header check for job endpoint

**Decision**: `POST /api/jobs/budget-alerts` checks `req.headers["x-cron-secret"] === process.env.CRON_SECRET`. If the header is missing or wrong, return 401. This is a separate route file `src/server/routes/jobs.ts`, mounted at `/api/jobs`.

**Rationale**: The job is called by Vercel's cron infrastructure, not a signed-in user — JWT authentication is inappropriate here. A shared secret header is the standard pattern for cron-triggered webhooks.

**Alternatives considered**: IP allowlist — rejected; Vercel cron source IPs are not guaranteed to be stable. API key via query string — rejected; headers are more conventional and not logged by proxies.

### Decision: Vercel Cron at 20:00 UTC (8:00 AM NZST)

**Decision**: `vercel.json` crons config calls `POST /api/jobs/budget-alerts` at `schedule: "0 20 * * *"`.

**Rationale**: 8:00 AM NZST (UTC+12) is a natural time to receive a morning budget alert before the day's spending begins. UTC offset is 12 in summer (NZDT) — the schedule may drift by an hour in winter (NZST = UTC+12). Acceptable for a personal tool.

**Note**: `vercel.json` does not currently exist in the project. This plan creates it.

### Decision: SessionStorage key for banner dismissal

**Decision**: The `AlertBanner` component stores `sessionStorage.setItem("fa-budget-alert-dismissed", new Date().toISOString().slice(0, 10))` (today's ISO date, e.g. `"2026-05-19"`) on dismiss. On mount, if `sessionStorage.getItem("fa-budget-alert-dismissed") === today's ISO date`, skip the fetch entirely.

**Rationale**: Session-scoped dismissal matches the spec (reappears on next visit). Using today's date as the value means if the session spans midnight, the banner reappears the next day as expected.

### Decision: Alert preferences UI in SettingsPage.tsx as a new self-contained section

**Decision**: Add a new `<AlertPreferencesSection />` sub-component inside `SettingsPage.tsx`. It uses `useApi` directly (not through the legacy props pattern) to call `GET /api/preferences` on mount and `PATCH /api/preferences` on change.

**Rationale**: `SettingsPage.tsx` currently uses a legacy props-based pattern from the pre-backend era. Adding a self-contained section that connects directly to the API avoids having to thread new state through the existing props chain. The new section co-exists with the legacy content without refactoring it.

### Decision: checkBudgetAlerts determines "current month" from today + monthStartDay

**Decision**: `checkBudgetAlerts` computes the current budget period as: given today's date and the user's `monthStartDay`, if today's day-of-month >= `monthStartDay`, the current period starts on `monthStartDay` of this calendar month; otherwise, it started on `monthStartDay` of the previous calendar month.

**Rationale**: This mirrors how FA-BUDG-002's `calculateBudgetSpend` determines which year+month to pass. The alert check must use the same period boundaries to produce consistent results.

---

## Phase 1: Design & Contracts

### Migration SQL — `0008_budget_alert_preferences.sql`

```sql
-- FA-BUDG-003: Add alert preference columns to user_preferences
ALTER TABLE "user_preferences"
  ADD COLUMN "alert_threshold" integer NOT NULL DEFAULT 80,
  ADD COLUMN "email_alerts_enabled" boolean NOT NULL DEFAULT true,
  ADD COLUMN "last_alert_email_sent_at" date;
--> statement-breakpoint
ALTER TABLE "user_preferences"
  ADD CONSTRAINT "user_preferences_alert_threshold_check"
  CHECK (alert_threshold >= 50 AND alert_threshold <= 100);
```

### Drizzle schema update — `src/db/schema.ts`

Extend the `userPreferences` table definition (add three columns after `monthStartDay`):

```typescript
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  monthStartDay: integer("month_start_day").notNull().default(1),
  alertThreshold: integer("alert_threshold").notNull().default(80),
  emailAlertsEnabled: boolean("email_alerts_enabled").notNull().default(true),
  lastAlertEmailSentAt: date("last_alert_email_sent_at"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

`UserPreferences` and `NewUserPreferences` type exports are already defined from FA-BUDG-001 — they will automatically include the new columns.

### TypeScript interface update — `src/types/api.ts`

Extend `ApiUserPreferences` (defined in FA-BUDG-002) to include the new fields:

```typescript
export interface ApiUserPreferences {
  id: string;
  monthStartDay: number;
  alertThreshold: number;
  emailAlertsEnabled: boolean;
  lastAlertEmailSentAt: string | null; // ISO date string, e.g. "2026-05-19"
}
```

### Alert check utility — `src/server/utils/checkBudgetAlerts.ts`

```typescript
export interface AlertedCategory {
  categoryName: string;
  limitAmount: number;
  actualSpend: number;
  percentageUsed: number;
}

export async function checkBudgetAlerts(
  userId: string,
  db: DrizzleDb,
): Promise<AlertedCategory[]>;
```

**Implementation**:

1. Fetch `userPreferences` for userId (default `alertThreshold = 80`, `monthStartDay = 1` if no row)
2. Determine current budget period year+month: given `today = new Date()`, if `today.getDate() >= monthStartDay` then `year = today.getFullYear(), month = today.getMonth() + 1` (current calendar month); else step back one calendar month
3. Fetch all budgets for `(userId, year, month)` from `budgets` table
4. For each budget, call `calculateBudgetSpend(userId, categoryName, year, month, monthStartDay, db)`
5. Compute `percentageUsed` (same logic as FA-BUDG-002: divide by limit, 100 if limit=0 and spend>0)
6. Return rows where `percentageUsed >= alertThreshold`

### Alert email utility — `src/server/utils/sendBudgetAlertEmail.ts`

```typescript
export async function sendBudgetAlertEmail(
  userEmail: string,
  month: string, // e.g. "May 2026"
  alertedCategories: AlertedCategory[],
): Promise<void>;
```

Uses `getResendClient()` and `fromAddress()` from `src/server/services/emailService.ts`. Subject: `"Finance Analyser — budget alert for ${month}"`. HTML body lists each category:

```
Groceries: $420.00 of $500.00 (84%)
Dining: $285.00 of $300.00 (95%)

View your budget: ${appUrl()}/budget
```

### Daily job — `src/server/jobs/budgetAlertJob.ts`

```typescript
export async function runBudgetAlertJob(db: DrizzleDb): Promise<void>;
```

**Implementation**:

1. Get today's ISO date string: `today = new Date().toISOString().slice(0, 10)`
2. Fetch all users WHERE `emailAlertsEnabled = true` AND (`lastAlertEmailSentAt IS NULL` OR `lastAlertEmailSentAt < today`) — join `users` table to get `email`
3. For each user (sequentially, not parallel):
   a. `alertedCategories = await checkBudgetAlerts(userId, db)`
   b. If `alertedCategories.length === 0`: skip
   c. `await sendBudgetAlertEmail(user.email, monthLabel, alertedCategories)`
   d. On success only: `UPDATE user_preferences SET lastAlertEmailSentAt = today WHERE userId = userId`
4. Log summary (count of emails sent) — no throw on individual user failure; continue to next user

### Job endpoint — `src/server/routes/jobs.ts`

```typescript
export const jobsRouter = Router();

jobsRouter.post("/budget-alerts", async (req, res) => {
  const secret = req.headers["x-cron-secret"];
  if (!secret || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  await runBudgetAlertJob(db);
  res.status(200).json({ ok: true });
});
```

Register in `src/server/index.ts`:

```typescript
import { jobsRouter } from "./routes/jobs.ts";
app.use("/api/jobs", jobsRouter);
```

### API contract changes

**GET /api/budgets/alerts** (new route on existing budgetsRouter):

- Protected by `authenticateToken`
- Calls `checkBudgetAlerts(userId, db)`
- Returns `AlertedCategory[]`
- Returns `[]` if no categories meet the threshold or no budgets exist

**PATCH /api/preferences** (extend Zod schema in userPreferences.ts from FA-BUDG-002):

- Add `alertThreshold: z.number().int().min(50).max(100).optional()`
- Add `emailAlertsEnabled: z.boolean().optional()`
- Existing `monthStartDay` field remains unchanged

### Frontend — AlertBanner component

```typescript
// src/components/AlertBanner.tsx
```

**On mount**:

1. Check `sessionStorage.getItem("fa-budget-alert-dismissed")` — if equals today's ISO date, return null (no fetch, no render)
2. Fetch `GET /api/budgets/alerts` (fire-and-forget — does not block page render; use a `useEffect`)
3. If response is an empty array or fetch fails, render nothing
4. If alerted categories returned, render the banner

**Banner UI**:

```
⚠  Budget alert  |  Groceries: 84% · Dining: 95%  |  [View Budget]  [✕]
```

- Lists up to all alerted categories inline; links `[View Budget]` to `/budget`
- `[✕]` dismiss button: `sessionStorage.setItem("fa-budget-alert-dismissed", todayISO)`, hide banner

**Placement in App.tsx**: Inside the authenticated layout section, rendered once above `<Routes>`. The `AlertBanner` is self-contained — no context dependency.

### Vercel Cron — `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/jobs/budget-alerts",
      "schedule": "0 20 * * *"
    }
  ]
}
```

### Alert preferences section — `SettingsPage.tsx`

Add a self-contained `<AlertPreferencesSection />` component (can be defined in the same file or a separate file). Uses `useApi` directly:

- On mount: `GET /api/preferences` → populate `alertThreshold` (range slider or number input, 50–100) and `emailAlertsEnabled` (checkbox/toggle)
- On change: debounced `PATCH /api/preferences` with the updated field
- Validation: reject threshold < 50 or > 100 with inline message before sending

---

<!-- SPECKIT START -->

**Active feature plan**: [specs/029-budget-alerts/plan.md](specs/029-budget-alerts/plan.md)

<!-- SPECKIT END -->
