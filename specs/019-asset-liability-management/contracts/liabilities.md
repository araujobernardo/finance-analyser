# API Contract: Liabilities

**Base path**: `/api/liabilities`  
**Auth**: All endpoints require `Authorization: Bearer <jwt>` header (enforced by `authenticateToken` middleware).  
**Scope**: All operations are automatically scoped to the authenticated user's `userId`.

---

## GET /api/liabilities

List all liabilities for the authenticated user.

**Response `200`**

```json
{
  "liabilities": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "Home Loan",
      "type": "mortgage",
      "value": "320000.00",
      "linkedAccountId": null,
      "createdAt": "2026-05-15T10:00:00.000Z",
      "updatedAt": "2026-05-15T10:00:00.000Z"
    }
  ]
}
```

Ordered by `createdAt ASC`. Returns empty array `{ "liabilities": [] }` when user has no liabilities.

---

## POST /api/liabilities

Create a new liability.

**Request body**

```json
{
  "name": "Home Loan",
  "type": "mortgage",
  "value": 320000,
  "linkedAccountId": null
}
```

| Field             | Type                  | Required | Constraints                                                                     |
| ----------------- | --------------------- | -------- | ------------------------------------------------------------------------------- |
| `name`            | string                | Yes      | Min 1 char, max 100 chars                                                       |
| `type`            | string (enum)         | Yes      | `mortgage \| personal_loan \| car_loan \| student_loan \| credit_card \| other` |
| `value`           | number                | Yes      | ≥ 0                                                                             |
| `linkedAccountId` | string (UUID) \| null | No       | Omit or null to leave unlinked                                                  |

**Response `201`** — the created liability object (same shape as GET list item).

**Response `400`** — validation failure:

```json
{ "error": "Invalid enum value. Expected 'mortgage' | 'personal_loan' | ..." }
```

---

## PATCH /api/liabilities/:id

Update an existing liability. At least one field must be provided.

**Request body** (all fields optional)

```json
{
  "name": "Updated Name",
  "type": "personal_loan",
  "value": 5000,
  "linkedAccountId": "uuid-or-null"
}
```

**Response `200`** — the updated liability object.

**Response `400`** — validation failure.

**Response `404`** — liability not found or belongs to a different user (do not distinguish).

**Behaviour**: Handler sets `updatedAt: new Date()` in the `.set({})` payload — there is no DB trigger.

---

## DELETE /api/liabilities/:id

Hard-delete a liability.

**Response `204`** — deleted successfully (no body).

**Response `404`** — liability not found or belongs to a different user.

The linked bank account is **not** affected by deleting a liability.
