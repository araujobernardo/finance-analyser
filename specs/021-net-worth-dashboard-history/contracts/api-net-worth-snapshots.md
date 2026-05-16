# API Contract: /api/net-worth/snapshots

**Phase**: 1 — Design  
**Branch**: `021-net-worth-dashboard-history`  
**Date**: 2026-05-16  
**Route file**: `src/server/routes/netWorth.ts`  
**Registered in**: `src/server/index.ts` as `app.use("/api/net-worth", netWorthRouter)`

All endpoints require a valid JWT in the `Authorization: Bearer <token>` header. The `userId` is extracted from the token by the `authenticateToken` middleware — never trusted from the request body or query string.

---

## GET /api/net-worth/snapshots

Returns the authenticated user's net worth snapshot history for the last 24 months, ordered oldest-first.

### Request

```
GET /api/net-worth/snapshots
Authorization: Bearer <jwt>
```

No query parameters.

### Response — 200 OK

```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "totalAssets": "125000.00",
    "totalLiabilities": "45000.00",
    "netWorth": "80000.00",
    "snapshotDate": "2026-03-01",
    "createdAt": "2026-03-01T08:12:34.000Z"
  },
  ...
]
```

- Array is ordered by `snapshotDate ASC` (oldest first).
- All numeric fields are returned as strings (postgres-js behaviour). Frontend parses with `parseFloat()`.
- Returns `[]` if no snapshots exist (first visit before today's snapshot is recorded).
- Maximum 24 months of history returned.

### Response — 401 Unauthorized

```json
{ "error": "Unauthorised" }
```

---

## POST /api/net-worth/snapshots

Upserts today's snapshot for the authenticated user. Safe to call multiple times on the same day — the unique constraint on `(userId, snapshotDate)` ensures idempotency via `onConflictDoUpdate`.

### Request

```
POST /api/net-worth/snapshots
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "totalAssets": 125000.00,
  "totalLiabilities": 45000.00
}
```

| Field              | Type   | Required | Notes       |
| ------------------ | ------ | -------- | ----------- |
| `totalAssets`      | number | Yes      | Must be ≥ 0 |
| `totalLiabilities` | number | Yes      | Must be ≥ 0 |

Server computes:

- `netWorth = totalAssets - totalLiabilities` (may be negative)
- `snapshotDate = new Date().toISOString().split('T')[0]` (UTC date)

### Response — 200 OK (created or updated)

```json
{
  "id": "uuid",
  "userId": "uuid",
  "totalAssets": "125000.00",
  "totalLiabilities": "45000.00",
  "netWorth": "80000.00",
  "snapshotDate": "2026-05-16",
  "createdAt": "2026-05-16T08:00:00.000Z"
}
```

Returns the upserted row. `createdAt` reflects the original creation time (not updated on conflict).

### Response — 400 Bad Request

```json
{ "error": "totalAssets and totalLiabilities are required numbers" }
```

Returned when either field is missing or not a finite number.

### Response — 401 Unauthorized

```json
{ "error": "Unauthorised" }
```

---

## Drizzle Upsert Pattern

```typescript
await db
  .insert(netWorthSnapshots)
  .values({
    userId,
    totalAssets: String(totalAssets),
    totalLiabilities: String(totalLiabilities),
    netWorth: String(totalAssets - totalLiabilities),
    snapshotDate: today,
  })
  .onConflictDoUpdate({
    target: [netWorthSnapshots.userId, netWorthSnapshots.snapshotDate],
    set: {
      totalAssets: String(totalAssets),
      totalLiabilities: String(totalLiabilities),
      netWorth: String(totalAssets - totalLiabilities),
    },
  })
  .returning();
```

---

## Frontend Integration (NetWorthPage.tsx)

```typescript
// On mount — fire and forget
useEffect(() => {
  if (!isLoading) {
    apiFetch("/api/net-worth/snapshots", {
      method: "POST",
      body: JSON.stringify({ totalAssets, totalLiabilities }),
    }).catch(() => {});
  }
}, [isLoading]);

// Fetch history
useEffect(() => {
  setSnapshotsLoading(true);
  apiFetch("/api/net-worth/snapshots")
    .then((data) => setSnapshots(data))
    .catch(() => setSnapshots([]))
    .finally(() => setSnapshotsLoading(false));
}, []);
```
