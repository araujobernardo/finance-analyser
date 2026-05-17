# API Contracts: Auto-Sync Bank Account Balances (FA-NW-004)

Base URL: `/api`
Auth: All endpoints require `Authorization: Bearer <jwt>` header.

---

## GET /api/assets

Returns all assets for the authenticated user.

### Response 200

```json
{
  "assets": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "Savings Account",
      "type": "savings",
      "value": "3200.00",
      "linkedAccountId": "uuid | null",
      "autoSync": true,
      "balanceClamped": false,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-05-17T10:00:00.000Z"
    }
  ]
}
```

**New fields** (FA-NW-004):

- `autoSync` `boolean` — `true` if value is computed from linked account; `false` if manually overridden.
- `balanceClamped` `boolean` — `true` if the last sync clamped a negative balance to 0. Drives amber warning in UI.

---

## GET /api/liabilities

Returns all liabilities for the authenticated user.

### Response 200

```json
{
  "liabilities": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "Visa Card",
      "type": "credit_card",
      "value": "850.00",
      "linkedAccountId": "uuid | null",
      "autoSync": true,
      "balanceClamped": false,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-05-17T10:00:00.000Z"
    }
  ]
}
```

Same new fields as assets.

---

## PATCH /api/assets/:id

Updates an asset. Behaviour depends on which fields are sent.

### Request body

```json
{
  "name": "string (optional)",
  "type": "savings|property|investments|kiwisaver|vehicle|other (optional)",
  "value": "number ≥ 0 (optional)",
  "linkedAccountId": "uuid | null (optional)",
  "autoSync": "boolean (optional)"
}
```

### Sync rules (server-enforced)

| Sent fields                                            | Server action                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| `value` present (any other fields)                     | Set `autoSync = false`, `balanceClamped = false`, store new value |
| `autoSync: true` (no `value`)                          | Set `autoSync = true`, run `syncLinkedAssets` immediately         |
| `autoSync: false` (no `value`)                         | Set `autoSync = false` only (no value change)                     |
| `linkedAccountId` changed, `autoSync` currently `true` | Run `syncLinkedAssets` with new accountId                         |

### Response 200

Returns the updated asset object (same shape as GET response).

### Response 400

```json
{ "error": "At least one field required" }
```

### Response 404

```json
{ "error": "Asset not found" }
```

---

## PATCH /api/liabilities/:id

Identical semantics to PATCH /api/assets/:id. Sync computation uses `Math.max(0, Math.abs(rawBalance))` for liabilities.

---

## Transaction mutation endpoints (sync side-effect)

The following existing endpoints now call `syncLinkedAssets` after each successful DB write. No request/response shape changes.

| Endpoint                                            | Trigger condition                    |
| --------------------------------------------------- | ------------------------------------ |
| `POST /api/accounts/:accountId/transactions`        | Always; `accountId` from URL param   |
| `POST /api/accounts/:accountId/transactions/import` | Always; `accountId` from URL param   |
| `PATCH /api/transactions/:id`                       | Always; `accountId` from updated row |
| `DELETE /api/transactions/:id`                      | Always; `accountId` from deleted row |
