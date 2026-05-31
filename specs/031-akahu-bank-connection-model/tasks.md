# Tasks: Akahu Bank Connection Data Model

**Input**: Design documents from `specs/031-akahu-bank-connection-model/`
**Branch**: `771-akahu-bank-connection-model`
**Feature ID**: FA-BANK-001

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks (different files, no conflicts)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

**Purpose**: Add the environment configuration the encryption utility and future sync features require.

- [ ] T001 Add `ENCRYPTION_KEY`, `AKAHU_APP_TOKEN`, and `AKAHU_USER_TOKEN` entries to `.env.example` with placeholder values and generation instructions

---

## Phase 2: Foundational

**Purpose**: Encryption utility that schema usage and future sync calls depend on. No DB changes.

**⚠️ CRITICAL**: T003 and T004 depend on T002 for correct encryptedUserToken handling at the application layer.

- [ ] T002 [P] Create `src/server/utils/encryption.ts` — export `encrypt(plaintext: string): string` and `decrypt(ciphertext: string): string` using `node:crypto` AES-256-GCM; key sourced from `process.env.ENCRYPTION_KEY` (32-byte hex); output format: base64-encoded `iv[12] || authTag[16] || ciphertext`; throw with a clear message if the key is missing or not 64 hex characters

**Checkpoint**: `encryption.ts` compiles, exports two pure functions, and fails loudly on a missing key.

---

## Phase 3: User Story 1 — Store Akahu Connection Credentials (P1) 🎯 MVP

**Goal**: Persist one encrypted Akahu user token per user, queryable and deletable.

**Independent Test**: Insert a row into `akahu_connections`, query it back, confirm `encrypted_user_token` is not plaintext. Attempt to insert a second row for the same user and confirm it is rejected by the unique index.

- [ ] T003 [US1] Add `akahuConnections` pgTable definition to `src/db/schema.ts` — columns: `id` (uuid PK defaultRandom), `userId` (uuid NOT NULL FK → users.id CASCADE), `akahuUserId` (varchar 50 NOT NULL), `encryptedUserToken` (text NOT NULL), `connectedAt` (timestamp tz NOT NULL defaultNow), `lastSyncedAt` (timestamp tz nullable), `createdAt` (timestamp tz NOT NULL defaultNow), `updatedAt` (timestamp tz NOT NULL defaultNow); add `uniqueIndex("akahu_connections_user_id_idx")` on `userId`; export `AkahuConnection` and `NewAkahuConnection` inferred types

**Checkpoint**: User Story 1 schema is complete and type-checks. One connection per user is enforced.

---

## Phase 4: User Story 2 & 3 — Link Accounts + Track Sync State (P2/P3)

**Goal**: Map Akahu bank accounts to Finance Analyser accounts and record live sync state per account.

**Note**: US3 (sync state tracking) fields are defined in the same table as US2 (account linking). Both user stories are delivered together in T004 since the `akahuAccountLinks` table is the single entity for both.

**Independent Test**: Insert a link record, update `syncStatus` through all four states, confirm `lastBalance` and `lastTransactionSyncedAt` round-trip correctly. Attempt duplicate links (same user+akahuAccountId, and same financeAccountId) and confirm both unique indexes reject them.

- [ ] T004 [US2] [US3] Add `akahuAccountLinks` pgTable definition to `src/db/schema.ts` — columns: `id` (uuid PK defaultRandom), `userId` (uuid NOT NULL FK → users.id CASCADE), `akahuAccountId` (varchar 50 NOT NULL), `financeAccountId` (uuid NOT NULL FK → accounts.id CASCADE), `akahuAccountName` (varchar 200 NOT NULL), `akahuAccountType` (varchar 50 nullable), `lastBalance` (numeric 15,2 nullable), `lastTransactionSyncedAt` (timestamp tz nullable), `syncStatus` (varchar 20 NOT NULL default `'active'`), `syncError` (text nullable), `createdAt` (timestamp tz NOT NULL defaultNow), `updatedAt` (timestamp tz NOT NULL defaultNow); add `uniqueIndex("akahu_account_links_user_akahu_idx")` on `(userId, akahuAccountId)` and `uniqueIndex("akahu_account_links_finance_account_idx")` on `(financeAccountId)`; export `AkahuAccountLink` and `NewAkahuAccountLink` inferred types

**Checkpoint**: User Stories 2 and 3 schema is complete and type-checks. Both unique constraints are present.

---

## Phase 5: Polish — Generate Migration

**Purpose**: Produce the Drizzle migration file from the completed schema and verify it is correct.

- [ ] T005 Run `npm run db:generate` from the repo root; verify Drizzle produces `src/db/migrations/0009_akahu_bank_integration.sql` creating both `akahu_connections` and `akahu_account_links` with all columns, foreign keys, and unique indexes; commit the generated migration file

**Checkpoint**: Migration file present, reviewed, and committed. Schema and migration are in sync. The feature is complete.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: No dependency on Phase 1; can run in parallel with T001
- **Phase 3 (US1)**: Depends on Phase 2 completion (encryption utility must exist before token handling is implemented correctly)
- **Phase 4 (US2/US3)**: Depends on Phase 3 completion (both tables go in the same file; must be sequential to avoid conflicts)
- **Phase 5 (Polish)**: Depends on Phase 4 completion (generates from the complete schema)

### Task Dependencies

```
T001 ──────────────────────────────────────────► (standalone)
T002 [P] ──────────────────────────────────────► T003
                                                    │
                                                    ▼
                                                  T004
                                                    │
                                                    ▼
                                                  T005
```

### Parallel Opportunities

- **T001 and T002** can run in parallel (`.env.example` vs `src/server/utils/encryption.ts`)
- **T003 and T004** CANNOT run in parallel — both edit `src/db/schema.ts`

---

## Implementation Strategy

### MVP (User Story 1 only)

1. T001 — env vars
2. T002 — encryption utility
3. T003 — `akahuConnections` table + types
4. T005 — generate migration (partial, US1 only)
5. **VALIDATE**: Confirm unique constraint rejects duplicate connection records

### Full Delivery

1. T001 + T002 (parallel)
2. T003 → T004 (sequential, same file)
3. T005 (generates from complete schema)

---

## Notes

- T003 and T004 both edit `src/db/schema.ts` — complete T003 and commit before starting T004
- `npm run db:generate` in T005 must be run after **both** T003 and T004 are merged; running it after only T003 produces an incomplete migration
- `syncStatus` is a `varchar(20)` — the four permitted values (`active`, `syncing`, `error`, `disconnected`) are enforced at the application layer, not by a DB constraint, matching the existing pattern for status columns in this project
- The encryption key must be added to the Render environment before any code that calls `encrypt()`/`decrypt()` is deployed; the utility will throw at call time if the key is absent
