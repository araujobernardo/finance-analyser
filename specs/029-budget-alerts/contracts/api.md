# API Contracts: FA-BUDG-003 — Budget Alerts

All user-facing endpoints require a valid session cookie (authenticateToken middleware). The job endpoint uses a shared-secret header instead.

---

## GET /api/budgets/alerts

Returns the list of budget categories for the current period that meet or exceed the user's configured alert threshold. Called by the frontend `AlertBanner` on app load.

### Response 200

```json
[
  {
    "categoryName": "Groceries",
    "limitAmount": 500,
    "actualSpend": 420,
    "percentageUsed": 84
  },
  {
    "categoryName": "Dining",
    "limitAmount": 300,
    "actualSpend": 285,
    "percentageUsed": 95
  }
]
```

Returns `[]` when no categories meet the threshold, when the user has no budgets for the current period, or when the user has no preferences row.

### Error Responses

| Status | Condition       |
| ------ | --------------- |
| 401    | Unauthenticated |

---

## PATCH /api/preferences (extended from FA-BUDG-002)

Updates one or more user preference fields. All fields are optional — send only what changed.

### Request Body

```json
{
  "monthStartDay": 15,
  "alertThreshold": 70,
  "emailAlertsEnabled": false
}
```

| Field              | Type    | Constraints      | New in FA-BUDG-003 |
| ------------------ | ------- | ---------------- | ------------------ |
| monthStartDay      | integer | Optional, 1–28   | No                 |
| alertThreshold     | integer | Optional, 50–100 | Yes                |
| emailAlertsEnabled | boolean | Optional         | Yes                |

### Response 200

```json
{
  "id": "uuid",
  "monthStartDay": 15,
  "alertThreshold": 70,
  "emailAlertsEnabled": false,
  "lastAlertEmailSentAt": null
}
```

### Error Responses

| Status | Condition                                   |
| ------ | ------------------------------------------- |
| 400    | alertThreshold out of range (< 50 or > 100) |
| 400    | monthStartDay out of range (< 1 or > 28)    |
| 401    | Unauthenticated                             |

---

## POST /api/jobs/budget-alerts

Triggers the daily budget alert email job. Protected by a shared secret header — not by user session.

### Request Headers

| Header        | Value                          |
| ------------- | ------------------------------ |
| x-cron-secret | Value of `CRON_SECRET` env var |

### Response 200

```json
{ "ok": true }
```

### Error Responses

| Status | Condition                            |
| ------ | ------------------------------------ |
| 401    | Missing or incorrect `x-cron-secret` |
| 500    | Unhandled error during job execution |

### Vercel Cron Configuration (vercel.json)

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

Schedule: `0 20 * * *` = 20:00 UTC = 08:00 NZST.

Vercel passes `x-vercel-cron-signature` — **not** used here. Instead the endpoint validates `x-cron-secret` which Vercel does not set automatically. The cron job must be configured to pass this header, or the request must originate from a trusted source. For Vercel Cron, the path is fetched as a GET internally — but since we define a POST handler, the cron config should match the HTTP method. If Vercel Cron only supports GET, use GET on the endpoint and secure via `x-cron-secret` check.

> **Implementation note**: Vercel Cron Jobs invoke the endpoint as a GET request. If `POST /api/jobs/budget-alerts` cannot be reached by Vercel Cron, define the handler as `GET /api/jobs/budget-alerts` instead. The `x-cron-secret` check is the security mechanism regardless.
