# Tasks: Akahu Bank Sync — Connection Management & Transaction Sync

**Input**: Design documents from `specs/032-akahu-bank-sync/`
**Branch**: `772-akahu-bank-sync`
**Feature ID**: FA-BANK-002
**Prerequisite**: FA-BANK-001 fully merged and deployed (tables `akahu_connections` and `akahu_account_links` must exist)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks (different files)
- **[Story]**: Which user story this task belongs to (US1/US2/US3)

---

## Phase 1: Setup

**Purpose**: Install the Akahu SDK dependency before any implementation begins.

- [ ] T001 Run `npm install akahu` in the repo root — verify `akahu` appears in `package.json` dependencies and `package-lock.json` is updated

**Checkpoint**: `akahu` is importable; `tsc --noEmit` passes.

---

## Phase 2: Foundational

**Purpose**: Create the route file skeleton and mount it in the server. All subsequent endpoint tasks add to this file. These two tasks can run in parallel (different files).

**⚠️ CRITICAL**: T005–T007 cannot begin until both T002 and T003 are merged.

- [ ] T002 [P] Create `src/server/routes/akahuSync.ts` — file exports `akahuSyncRouter = Router()` with `akahuSyncRouter.use(authenticateToken)` applied at the router level; no endpoint handlers yet; import pattern follows `src/server/routes/budgets.ts` exactly (Router, authenticateToken, AuthLocals from `../middleware/authenticateToken.ts`; imports use `.ts` extensions)
- [ ] T003 [P] Mount `akahuSyncRouter` in `src/server/index.ts` — add `import { akahuSyncRouter } from "./routes/akahuSync.ts"` with the other route imports; add `app.use("/api/bank", akahuSyncRouter)` after the existing `app.use()` lines and before the 404 handler

**Checkpoint**: Server starts; `GET /api/bank/anything` returns 404 from Express (router mounted but no handlers). `tsc --noEmit` passes.

---

## Phase 3: User Story 1 — Manual Sync (P1) 🎯 MVP

**Goal**: `POST /api/bank/sync` triggers a full account + transaction sync from Akahu and returns a summary.

**Independent Test**: With a valid `akahuConnections` row and at least one `akahuAccountLinks` row, call `POST /api/bank/sync`. Confirm new transactions appear in the `transactions` table, the linked account's `lastTransactionSyncedAt` advances, and a second sync adds zero duplicate transactions.

Note: T004 (service) and T005 (endpoint) touch different files and can be developed in parallel, but T005 must not be merged until T004 is complete.

- [ ] T004 [P] [US1] Create `src/server/services/akahuSync.ts` — export `async function syncUserAccounts(userId: string): Promise<SyncResult>` implementing the full sync algorithm:
  1. Fetch `akahuConnections` row for `userId`; throw if none exists
  2. `decrypt(encryptedUserToken)` using `../utils/encryption.ts`
  3. Initialise `new AkahuClient({ appToken: process.env.AKAHU_APP_TOKEN })`
  4. `akahu.accounts.list(userToken)` — update `lastBalance` on each matching `akahuAccountLinks` row
  5. For each linked account (has `financeAccountId`): check `attributes` array for `'TRANSACTIONS'` before fetching; set `syncStatus = 'syncing'`; determine date range (`lastTransactionSyncedAt ?? 12 months ago` → now); `akahu.transactions.list()`; deduplicate by `(date, amount, description, accountId)` query; insert new transactions with `amount: String(tx.amount)`, `category: null`, `isTransfer: false`, `isManualTransfer: false`; on success set `syncStatus = 'active'` + update `lastTransactionSyncedAt`; on error set `syncStatus = 'error'` + `syncError`, push to errors array and continue
  6. After settled transactions, call `akahu.transactions.listPending(userToken)` and insert pending transactions with same dedup logic
  7. Return `{ accountsSynced, transactionsAdded, errors }` — see `SyncResult` in `specs/032-akahu-bank-sync/data-model.md`

- [ ] T005 [US1] Add `POST /sync` handler to `src/server/routes/akahuSync.ts` — import `syncUserAccounts` from `../services/akahuSync.ts`; handler calls `syncUserAccounts(userId)`; returns `200 { accountsSynced, transactionsAdded, errors }`; returns `404 { error: "No Akahu connection found" }` when service throws due to missing connection; all errors forwarded via `next(err)`

**Checkpoint**: `POST /api/bank/sync` with valid auth returns a SyncResult. Duplicate calls do not create duplicate transactions.

---

## Phase 4: User Story 2 — Connect & Disconnect Akahu (P2)

**Goal**: Owner can connect their Akahu integration, view connection status, and disconnect. All three endpoints are in the same route file — implement sequentially.

**Independent Test**: `POST /api/bank/connect` creates a connection row with encrypted token (token never in response). `GET /api/bank/connection` returns connection + account links. `DELETE /api/bank/connection` removes connection and links; imported transactions remain.

- [ ] T006 [US2] Add three connection management handlers to `src/server/routes/akahuSync.ts`:
  - **`POST /connect`** — body schema `z.object({ akahuUserId: z.string().min(1), userToken: z.string().min(1) })`; `encrypt(userToken)` before storage; upsert via `.onConflictDoUpdate({ target: akahuConnections.userId, set: { encryptedUserToken, updatedAt } })`; return 201 with connection row **excluding** `encryptedUserToken`
  - **`GET /connection`** — select `akahuConnections` row for `userId`; select all `akahuAccountLinks` rows for `userId`; return `{ connection, accountLinks }` excluding `encryptedUserToken`; return 404 if no connection
  - **`DELETE /connection`** — delete `akahuConnections` row for `userId`; schema cascade handles `akahuAccountLinks` deletion; return 204
  - All handlers follow the existing `try/catch → next(err)` pattern; import `encrypt` from `../utils/encryption.ts`

**Checkpoint**: All three connection endpoints return correct responses. Token is absent from every response. Disconnect leaves transactions intact.

---

## Phase 5: User Story 3 — Link & Unlink Bank Accounts (P3)

**Goal**: Owner can link an Akahu account to a Finance Analyser account, and unlink it without losing transactions.

**Independent Test**: `POST /api/bank/accounts/link` creates a link row with `syncStatus = 'active'`. Attempting to link the same Akahu account twice returns an error. `DELETE /api/bank/accounts/link/:akahuAccountId` removes the link; previously imported transactions remain.

- [ ] T007 [US3] Add two account-link handlers to `src/server/routes/akahuSync.ts`:
  - **`POST /accounts/link`** — body schema `z.object({ akahuAccountId: z.string().min(1), financeAccountId: z.string().uuid(), akahuAccountName: z.string().min(1) })`; upsert on conflict `(userId, akahuAccountId)`; return 201 with link row (or 200 on update)
  - **`DELETE /accounts/link/:akahuAccountId`** — delete `akahuAccountLinks` row matching `(userId, akahuAccountId)`; return 204; return 404 if not found
  - All handlers follow `try/catch → next(err)` pattern

**Checkpoint**: Both link endpoints function correctly. Uniqueness constraints (duplicate Akahu account, duplicate Finance Analyser account) are surfaced as errors. Unlink does not delete transactions.

---

## Phase 6: Polish — Render Deployment

**Purpose**: Ensure the two required environment variables are set in the Render backend web service before FA-BANK-002 code is deployed.

- [ ] T008 Set `AKAHU_APP_TOKEN` and `ENCRYPTION_KEY` on the Render backend web service environment — verify both variables are present in the Render dashboard; note: these variables were added to `.env.example` by FA-BANK-001 T001 (#820)

**Checkpoint**: Render deployment with FA-BANK-002 code starts without `ENCRYPTION_KEY missing` errors.

---

## Dependencies & Execution Order

```
T001
  │
  ├── T002 [P] ──────────────────────────────────┐
  │                                              │
  └── T003 [P]                                   │
        │                                        │
        │  (T002 must be merged first)            │
        ▼                                        ▼
      T004 [P] ─────────────────────────────► T005 [US1]
                                                  │
                                                  ▼
                                               T006 [US2]
                                                  │
                                                  ▼
                                               T007 [US3]

T008 (independent — operational, not code)
```

### Parallel Opportunities

- **T002 and T003** can run in parallel (different files: new route file vs. index.ts)
- **T004** can run in parallel with T002/T003 (different file: service vs. route boilerplate)
- **T005, T006, T007** CANNOT run in parallel — all edit `src/server/routes/akahuSync.ts`

---

## Implementation Strategy

### MVP (User Story 1 only)

1. T001 — install `akahu`
2. T002 + T003 (parallel) — route skeleton + mount
3. T004 + (T002 merge) → T005 — sync service + POST /sync endpoint
4. T008 — Render env vars
5. **VALIDATE**: `POST /api/bank/sync` works end-to-end with a real Akahu connection

### Full Delivery

1. T001 → T002 + T003 (parallel) + T004 (parallel with T002/T003)
2. T005 (US1) → T006 (US2) → T007 (US3)
3. T008 (Render, any time before deploy)

---

## Notes

- T004 (`akahuSync.ts` service) is the most complex task — check the Akahu SDK constructor signature after running `npm install akahu` in T001; the pattern in `research.md` (`new AkahuClient({ appToken })`) is the expected API
- `amount` must be stored as `String(tx.amount)` — postgres-js requires strings for `numeric` columns (same pattern as other routes in this codebase)
- `encryptedUserToken` must be excluded from **every** response shape — review each response in T006 carefully
- The cascade from `akahuConnections` → `akahuAccountLinks` is in the DB schema (FA-BANK-001); `DELETE /connection` does not need to manually delete link rows
- FA-BANK-001 issues (#820–#824) must all be merged before any task in this feature can be implemented
