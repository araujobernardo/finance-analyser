# Data Model: FA-BUDG-003 — Budget Alerts

## Schema Changes

This feature adds three columns to the existing `user_preferences` table (created by FA-BUDG-001). No new tables are introduced.

---

## Extended Table: user_preferences

### New Columns

| Column                   | Type    | Constraints                                    |
| ------------------------ | ------- | ---------------------------------------------- |
| alert_threshold          | integer | NOT NULL, DEFAULT 80, CHECK 50–100             |
| email_alerts_enabled     | boolean | NOT NULL, DEFAULT true                         |
| last_alert_email_sent_at | date    | NULLABLE — stores ISO date of last alert email |

### Full Table After Migration

| Column                   | Type        | Constraints                                        |
| ------------------------ | ----------- | -------------------------------------------------- |
| id                       | uuid        | PK, default gen_random_uuid()                      |
| user_id                  | uuid        | FK → users.id ON DELETE CASCADE, NOT NULL, UNIQUE  |
| month_start_day          | integer     | NOT NULL, DEFAULT 1, CHECK 1–28 (from FA-BUDG-001) |
| alert_threshold          | integer     | NOT NULL, DEFAULT 80, CHECK 50–100 (new)           |
| email_alerts_enabled     | boolean     | NOT NULL, DEFAULT true (new)                       |
| last_alert_email_sent_at | date        | NULLABLE (new)                                     |
| created_at               | timestamptz | DEFAULT now(), NOT NULL                            |
| updated_at               | timestamptz | DEFAULT now(), NOT NULL                            |

### Migration File

`src/db/migrations/0008_budget_alert_preferences.sql`

```sql
ALTER TABLE "user_preferences"
  ADD COLUMN "alert_threshold" integer NOT NULL DEFAULT 80,
  ADD COLUMN "email_alerts_enabled" boolean NOT NULL DEFAULT true,
  ADD COLUMN "last_alert_email_sent_at" date;
--> statement-breakpoint
ALTER TABLE "user_preferences"
  ADD CONSTRAINT "user_preferences_alert_threshold_check"
  CHECK (alert_threshold >= 50 AND alert_threshold <= 100);
```

---

## Derived / View Models

### AlertedCategory (not stored — computed per request)

Produced by `checkBudgetAlerts()` and returned by `GET /api/budgets/alerts`:

| Field          | Type   | Derivation                                                       |
| -------------- | ------ | ---------------------------------------------------------------- |
| categoryName   | string | budgets.category_name                                            |
| limitAmount    | number | parseFloat(budgets.limit_amount)                                 |
| actualSpend    | number | calculateBudgetSpend() result for current period                 |
| percentageUsed | number | same formula as FA-BUDG-002 (100 if limit=0 and spend>0, else ÷) |

Only categories where `percentageUsed >= alertThreshold` are included.

---

## Current Period Calculation

Given `today` and `monthStartDay`:

```
if today.day >= monthStartDay:
  year  = today.year
  month = today.month          ← current calendar month
else:
  year  = today.year  (or today.year - 1 if today.month = 1)
  month = today.month - 1      ← previous calendar month
```

The start and end dates of this period are then computed the same way as FA-BUDG-002's `calculateBudgetSpend`.

---

## Email Deduplication Logic

`last_alert_email_sent_at` is compared to today's UTC date string:

```
shouldSendEmail = emailAlertsEnabled = true
  AND (lastAlertEmailSentAt IS NULL
    OR lastAlertEmailSentAt < todayISODate)
```

`last_alert_email_sent_at` is only updated after a successful Resend API call. If the email fails, the field remains null/unchanged, allowing a retry (next day's job will attempt again).

---

## TypeScript Types

### Drizzle schema.ts update

```typescript
// Extend userPreferences table definition — add after monthStartDay:
alertThreshold: integer("alert_threshold").notNull().default(80),
emailAlertsEnabled: boolean("email_alerts_enabled").notNull().default(true),
lastAlertEmailSentAt: date("last_alert_email_sent_at"),
```

`UserPreferences` and `NewUserPreferences` types (already exported from FA-BUDG-001) automatically include the new columns.

### ApiUserPreferences (extend from FA-BUDG-002)

```typescript
export interface ApiUserPreferences {
  id: string;
  monthStartDay: number;
  alertThreshold: number; // new
  emailAlertsEnabled: boolean; // new
  lastAlertEmailSentAt: string | null; // new — ISO date string
}
```

### AlertedCategory

```typescript
export interface AlertedCategory {
  categoryName: string;
  limitAmount: number;
  actualSpend: number;
  percentageUsed: number;
}
```
