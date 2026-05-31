# Data Model: Akahu Bank Sync

**Feature**: FA-BANK-002 | **Branch**: `772-akahu-bank-sync` | **Date**: 2026-05-31

## Entities Used (all from FA-BANK-001 or existing)

This feature creates **no new tables**. It reads and writes to the three
entities below.

---

## AkahuConnection (FA-BANK-001)

**Role in this feature**: Read to obtain the encrypted user token; written
on `POST /api/bank/connect` (upsert) and `DELETE /api/bank/connection` (delete).

Key fields accessed:

- `userId` — owner identity; uniqueness enforced by DB
- `encryptedUserToken` — decrypted at sync time; **never returned in responses**
- `akahuUserId` — returned in connection status response
- `connectedAt`, `lastSyncedAt` — returned in connection status response
- `updatedAt` — set to `new Date()` on every write

---

## AkahuAccountLink (FA-BANK-001)

**Role in this feature**: Read to find linked accounts during sync; written
by `POST /api/bank/accounts/link` (upsert), `DELETE /api/bank/accounts/link/:id`
(delete), and the sync service (balance + sync-state updates).

Key fields accessed:

- `userId`, `akahuAccountId`, `financeAccountId` — routing and lookup
- `akahuAccountName`, `akahuAccountType` — set on link creation
- `lastBalance` — updated from Akahu account balance on every sync
- `lastTransactionSyncedAt` — bookmark; null → fetch 12 months; non-null → fetch since this date
- `syncStatus` — transitions: `active` → `syncing` → `active` | `error`
- `syncError` — set on error, cleared on next success

**State transitions during sync**:

```
active
  │
  │  sync starts
  ▼
syncing
  │
  ├─ success → active  (lastTransactionSyncedAt updated, syncError cleared)
  └─ failure → error   (syncError set; account skipped for rest of sync)
```

---

## Transaction (existing)

**Role in this feature**: Written by the sync service for each new transaction
that passes deduplication. Read for deduplication checks.

Fields written by sync:

```
userId               — from auth context
accountId            — link.financeAccountId
date                 — YYYY-MM-DD string from Akahu
amount               — String(akahu_amount) — postgres-js numeric requires string
description          — from Akahu transaction description
category             — null (user categorises manually)
isTransfer           — false
isManualTransfer     — false
```

Deduplication check: `SELECT 1 FROM transactions WHERE date = ? AND amount = ? AND description = ? AND accountId = ?`

---

## SyncResult (response shape — not persisted)

Returned by `POST /api/bank/sync`. Not a DB entity.

```ts
interface SyncResult {
  accountsSynced: number; // count of linked accounts processed
  transactionsAdded: number; // total new transactions inserted
  errors: {
    accountId: string; // Akahu account ID
    error: string; // error message
  }[];
}
```
