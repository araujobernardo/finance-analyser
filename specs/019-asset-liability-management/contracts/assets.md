# API Contract: Assets

**Base path**: `/api/assets`  
**Auth**: All endpoints require `Authorization: Bearer <jwt>` header (enforced by `authenticateToken` middleware).  
**Scope**: All operations are automatically scoped to the authenticated user's `userId`.

---

## GET /api/assets

List all assets for the authenticated user.

**Response `200`**

```json
{
  "assets": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "My House",
      "type": "property",
      "value": "450000.00",
      "linkedAccountId": null,
      "createdAt": "2026-05-15T10:00:00.000Z",
      "updatedAt": "2026-05-15T10:00:00.000Z"
    }
  ]
}
```

Ordered by `createdAt ASC`. Returns empty array `{ "assets": [] }` when user has no assets.

---

## POST /api/assets

Create a new asset.

**Request body**

```json
{
  "name": "My House",
  "type": "property",
  "value": 450000,
  "linkedAccountId": null
}
```

| Field             | Type                  | Required | Constraints                                                           |
| ----------------- | --------------------- | -------- | --------------------------------------------------------------------- |
| `name`            | string                | Yes      | Min 1 char, max 100 chars                                             |
| `type`            | string (enum)         | Yes      | `property \| investments \| kiwisaver \| savings \| vehicle \| other` |
| `value`           | number                | Yes      | ≥ 0                                                                   |
| `linkedAccountId` | string (UUID) \| null | No       | Omit or null to leave unlinked                                        |

**Response `201`** — the created asset object (same shape as GET list item).

**Response `400`** — validation failure:

```json
{ "error": "String must contain at least 1 character(s)" }
```

---

## PATCH /api/assets/:id

Update an existing asset. At least one field must be provided.

**Request body** (all fields optional)

```json
{
  "name": "Updated Name",
  "type": "savings",
  "value": 12000,
  "linkedAccountId": "uuid-or-null"
}
```

**Response `200`** — the updated asset object.

**Response `400`** — validation failure.

**Response `404`** — asset not found or belongs to a different user (do not distinguish).

**Behaviour**: Handler sets `updatedAt: new Date()` in the `.set({})` payload — there is no DB trigger.

---

## DELETE /api/assets/:id

Hard-delete an asset.

**Response `204`** — deleted successfully (no body).

**Response `404`** — asset not found or belongs to a different user.

The linked bank account is **not** affected by deleting an asset.
