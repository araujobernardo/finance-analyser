# API Contract: /api/bank

**Feature**: FA-BANK-002 | **Branch**: `772-akahu-bank-sync`
**Router**: `src/server/routes/akahuSync.ts` — mounted at `/api/bank` in `src/server/index.ts`
**Auth**: All routes require a valid JWT (via `authenticateToken` middleware at router level)

---

## POST /api/bank/connect

Store or update the user's Akahu connection credentials.

**Request body**:

```json
{
  "akahuUserId": "user_xxxxxxxxxxxxxxxxxxxx",
  "userToken": "user_token_xxxxxxxxxxxxxxxxxxxx"
}
```

| Field         | Type   | Required | Constraints                            |
| ------------- | ------ | -------- | -------------------------------------- |
| `akahuUserId` | string | yes      | min length 1                           |
| `userToken`   | string | yes      | min length 1; encrypted before storage |

**Success — 201 Created**:

```json
{
  "id": "uuid",
  "userId": "uuid",
  "akahuUserId": "user_xxxx",
  "connectedAt": "2026-05-31T00:00:00.000Z",
  "lastSyncedAt": null,
  "createdAt": "2026-05-31T00:00:00.000Z",
  "updatedAt": "2026-05-31T00:00:00.000Z"
}
```

`encryptedUserToken` is **never** included in the response.

If a connection already exists for this user, the token is updated (upsert) and
201 is returned.

**Error — 400 Bad Request**: `{ "error": "<zod message>" }` — body failed validation.

---

## GET /api/bank/connection

Retrieve the current connection status and all linked accounts.

**Success — 200 OK**:

```json
{
  "connection": {
    "id": "uuid",
    "userId": "uuid",
    "akahuUserId": "user_xxxx",
    "connectedAt": "2026-05-31T00:00:00.000Z",
    "lastSyncedAt": null,
    "createdAt": "2026-05-31T00:00:00.000Z",
    "updatedAt": "2026-05-31T00:00:00.000Z"
  },
  "accountLinks": [
    {
      "id": "uuid",
      "userId": "uuid",
      "akahuAccountId": "acc_xxxx",
      "financeAccountId": "uuid",
      "akahuAccountName": "ASB Streamline",
      "akahuAccountType": "CHECKING",
      "lastBalance": "1234.56",
      "lastTransactionSyncedAt": null,
      "syncStatus": "active",
      "syncError": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

**Error — 404 Not Found**: `{ "error": "No Akahu connection found" }` — no connection record exists.

---

## DELETE /api/bank/connection

Remove the Akahu connection. All account links are removed via cascade. Previously
imported transactions are preserved.

**Success — 204 No Content**: empty body.

**Error — 404 Not Found**: if no connection exists (optional — acceptable to return 204 idempotently).

---

## POST /api/bank/sync

Trigger a manual sync. Fetches live account data and transactions from Akahu
for all linked accounts. Returns a summary.

**Request body**: empty / not required.

**Success — 200 OK**:

```json
{
  "accountsSynced": 2,
  "transactionsAdded": 14,
  "errors": []
}
```

Partial success (some accounts errored):

```json
{
  "accountsSynced": 1,
  "transactionsAdded": 8,
  "errors": [{ "accountId": "acc_xxxx", "error": "Akahu API timeout" }]
}
```

**Error — 404 Not Found**: `{ "error": "No Akahu connection found" }` — no connection record for this user.

---

## POST /api/bank/accounts/link

Link an Akahu bank account to a Finance Analyser account.

**Request body**:

```json
{
  "akahuAccountId": "acc_xxxxxxxxxxxxxxxxxxxx",
  "financeAccountId": "uuid",
  "akahuAccountName": "ASB Streamline"
}
```

| Field              | Type   | Required | Constraints                                 |
| ------------------ | ------ | -------- | ------------------------------------------- |
| `akahuAccountId`   | string | yes      | min length 1                                |
| `financeAccountId` | string | yes      | valid UUID; must reference existing account |
| `akahuAccountName` | string | yes      | min length 1                                |

**Success — 201 Created** (or 200 if updating existing link):

```json
{
  "id": "uuid",
  "userId": "uuid",
  "akahuAccountId": "acc_xxxx",
  "financeAccountId": "uuid",
  "akahuAccountName": "ASB Streamline",
  "akahuAccountType": null,
  "lastBalance": null,
  "lastTransactionSyncedAt": null,
  "syncStatus": "active",
  "syncError": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Error — 400 Bad Request**: body validation failed.
**Error — 409 Conflict**: `financeAccountId` is already linked to a different Akahu account.

---

## DELETE /api/bank/accounts/link/:akahuAccountId

Remove the link between the specified Akahu account and its Finance Analyser
account. Previously imported transactions are **not** deleted.

**Path param**: `akahuAccountId` — Akahu account ID string (e.g. `acc_xxxx`).

**Success — 204 No Content**: empty body.

**Error — 404 Not Found**: link with this `akahuAccountId` does not exist for this user.
