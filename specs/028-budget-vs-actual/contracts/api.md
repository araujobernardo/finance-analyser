# API Contracts: FA-BUDG-002 — Budget vs Actual Spend Comparison View

All endpoints require a valid session cookie (authenticateToken middleware). All amounts are returned as JS numbers (numeric DB values are parsed via `parseFloat` before serialisation). NZD formatting is applied client-side only.

---

## GET /api/budgets

Returns all budget rows for the selected month, each enriched with actual spend calculated from qualifying transactions. Auto-populates from budget defaults if the month has zero existing rows.

### Query Parameters

| Parameter | Type    | Required | Description               |
| --------- | ------- | -------- | ------------------------- |
| year      | integer | Yes      | Calendar year (e.g. 2026) |
| month     | integer | Yes      | Calendar month 1–12       |

### Response 200

```json
[
  {
    "id": "uuid",
    "categoryName": "Groceries",
    "year": 2026,
    "month": 5,
    "limitAmount": 500,
    "actualSpend": 312.5,
    "remaining": 187.5,
    "percentageUsed": 62.5
  }
]
```

### Error Responses

| Status | Condition                       |
| ------ | ------------------------------- |
| 400    | year or month missing / invalid |
| 401    | Unauthenticated                 |

---

## POST /api/budgets

Creates a new monthly budget. Rejects duplicates (same user + category + year + month).

### Request Body

```json
{
  "categoryName": "Dining",
  "year": 2026,
  "month": 5,
  "limitAmount": 300
}
```

| Field        | Type    | Constraints           |
| ------------ | ------- | --------------------- |
| categoryName | string  | Required, 1–100 chars |
| year         | integer | Required              |
| month        | integer | Required, 1–12        |
| limitAmount  | number  | Required, ≥ 0         |

### Response 201

```json
{
  "id": "uuid",
  "categoryName": "Dining",
  "year": 2026,
  "month": 5,
  "limitAmount": 300,
  "actualSpend": 0,
  "remaining": 300,
  "percentageUsed": 0
}
```

### Error Responses

| Status | Condition                                     |
| ------ | --------------------------------------------- |
| 400    | Validation failure                            |
| 401    | Unauthenticated                               |
| 409    | Budget already exists for this category+month |

---

## PATCH /api/budgets/:id

Updates the spending limit on an existing budget.

### Request Body

```json
{ "limitAmount": 400 }
```

### Response 200

Returns the updated budget row in the same shape as POST 201 (with recalculated actualSpend, remaining, percentageUsed).

### Error Responses

| Status | Condition          |
| ------ | ------------------ |
| 400    | Validation failure |
| 401    | Unauthenticated    |
| 404    | Budget not found   |

---

## DELETE /api/budgets/:id

Permanently removes a monthly budget. Does not affect any default budget for the same category.

### Response 204

No body.

### Error Responses

| Status | Condition        |
| ------ | ---------------- |
| 401    | Unauthenticated  |
| 404    | Budget not found |

---

## GET /api/budget-defaults

Returns all default budgets for the authenticated user.

### Response 200

```json
[
  { "id": "uuid", "categoryName": "Groceries", "limitAmount": 500 },
  { "id": "uuid", "categoryName": "Dining", "limitAmount": 200 }
]
```

---

## POST /api/budget-defaults

Creates or updates (upsert) a default budget. One default per user per category.

### Request Body

```json
{ "categoryName": "Groceries", "limitAmount": 500 }
```

| Field        | Type   | Constraints           |
| ------------ | ------ | --------------------- |
| categoryName | string | Required, 1–100 chars |
| limitAmount  | number | Required, ≥ 0         |

### Response 200

```json
{ "id": "uuid", "categoryName": "Groceries", "limitAmount": 500 }
```

---

## DELETE /api/budget-defaults/:id

Removes a default budget. Does not delete any existing monthly budgets created from this default.

### Response 204

No body.

### Error Responses

| Status | Condition         |
| ------ | ----------------- |
| 401    | Unauthenticated   |
| 404    | Default not found |

---

## GET /api/preferences

Returns the user's preferences. Creates a default row (`monthStartDay: 1`) if none exists.

### Response 200

```json
{ "id": "uuid", "monthStartDay": 1 }
```

---

## PATCH /api/preferences

Updates the user's month start day preference.

### Request Body

```json
{ "monthStartDay": 15 }
```

| Field         | Type    | Constraints              |
| ------------- | ------- | ------------------------ |
| monthStartDay | integer | Required, 1–28 inclusive |

### Response 200

```json
{ "id": "uuid", "monthStartDay": 15 }
```

### Error Responses

| Status | Condition                             |
| ------ | ------------------------------------- |
| 400    | monthStartDay out of range or not int |
| 401    | Unauthenticated                       |
