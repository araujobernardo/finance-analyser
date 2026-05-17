# API Contract: Goals (FA-GOAL-002)

All routes are under `/api/goals`. All require a valid `Authorization: Bearer <token>` header — requests without a valid token receive `401`. User identity is derived server-side; no client-supplied userId is accepted.

---

## GET /api/goals

Returns all goals for the authenticated user, ordered by `createdAt ASC`. The frontend is responsible for splitting by `status`.

**Response 200**

```json
{
  "goals": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "House deposit",
      "type": "savings_target",
      "targetAmount": "20000.00",
      "targetDate": "2027-12-31",
      "linkedAccountId": "uuid | null",
      "categoryName": null,
      "currentAmount": "5000.00",
      "status": "active",
      "createdAt": "2026-05-17T00:00:00.000Z",
      "updatedAt": "2026-05-17T00:00:00.000Z"
    }
  ]
}
```

---

## POST /api/goals

Creates a new goal. Status defaults to `active` (DB default — not required in body).

**Request body**

```json
{
  "name": "House deposit",
  "type": "savings_target",
  "targetAmount": 20000,
  "targetDate": "2027-12-31",
  "linkedAccountId": "uuid",
  "categoryName": null
}
```

| Field             | Required | Rules                                                                                                               |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `name`            | YES      | string, 1–100 chars                                                                                                 |
| `type`            | YES      | enum: `savings_target` / `debt_payoff` / `net_worth_milestone` / `spending_limit`                                   |
| `targetAmount`    | YES      | number ≥ 0                                                                                                          |
| `targetDate`      | NO       | string `YYYY-MM-DD` or null                                                                                         |
| `linkedAccountId` | NO       | UUID string or null                                                                                                 |
| `categoryName`    | NO\*     | string ≤ 100 chars or null. **Required (non-null) when `type = spending_limit`; must be null for all other types.** |

**Response 201** — the created `ApiGoal` object

**Response 400** — `{ "error": "<first Zod issue message>" }`

---

## PATCH /api/goals/:id

Partial update. At least one field required. `updatedAt` is set to `new Date()` on every PATCH.

A goal that belongs to a different user returns **404** (not 403 — no cross-user enumeration).

**Request body** (all fields optional)

```json
{
  "name": "Updated name",
  "type": "debt_payoff",
  "targetAmount": 15000,
  "targetDate": "2028-06-30",
  "linkedAccountId": "uuid",
  "categoryName": null,
  "status": "achieved",
  "currentAmount": 8000
}
```

| Field             | Rules                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `name`            | string, 1–100 chars                                                                        |
| `type`            | enum (same values as POST)                                                                 |
| `targetAmount`    | number ≥ 0                                                                                 |
| `targetDate`      | string `YYYY-MM-DD` or null                                                                |
| `linkedAccountId` | UUID or null                                                                               |
| `categoryName`    | string ≤ 100 or null. Cross-field rule applies when `type` is also present in the payload. |
| `status`          | enum: `active` / `achieved` / `abandoned`                                                  |
| `currentAmount`   | number or null                                                                             |

**Response 200** — the updated `ApiGoal` object

**Response 400** — `{ "error": "<first Zod issue message>" }`

**Response 404** — `{ "error": "Goal not found" }`

---

## DELETE /api/goals/:id

Hard deletes the goal. Goal belonging to a different user returns **404**.

**Response 204** — no body

**Response 404** — `{ "error": "Goal not found" }`
