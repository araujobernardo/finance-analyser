# Data Model: Akahu Bank Connection

**Feature**: FA-BANK-001 | **Branch**: `771-akahu-bank-connection-model` | **Date**: 2026-05-31

## Entity Overview

```
users (existing)
  │
  ├─── akahu_connections  (1 per user)
  │        └── encryptedUserToken: AES-256-GCM ciphertext
  │
  └─── akahu_account_links  (0..N per user)
           └── financeAccountId → accounts.id (existing)
```

---

## Table: `akahu_connections`

One record per user. Stores the encrypted Akahu user token and connection metadata.

| Column                 | Type        | Nullable | Default             | Notes                                           |
| ---------------------- | ----------- | -------- | ------------------- | ----------------------------------------------- |
| `id`                   | uuid        | NO       | `gen_random_uuid()` | Primary key                                     |
| `user_id`              | uuid        | NO       | —                   | FK → `users.id` ON DELETE CASCADE               |
| `akahu_user_id`        | varchar(50) | NO       | —                   | Akahu's user ID (e.g. `user_xxxx`)              |
| `encrypted_user_token` | text        | NO       | —                   | AES-256-GCM ciphertext; never plaintext         |
| `connected_at`         | timestamptz | NO       | `now()`             | When the Akahu connection was first established |
| `last_synced_at`       | timestamptz | YES      | NULL                | Null until first sync completes                 |
| `created_at`           | timestamptz | NO       | `now()`             |                                                 |
| `updated_at`           | timestamptz | NO       | `now()`             |                                                 |

**Unique indexes**:

- `akahu_connections_user_id_idx` on `(user_id)` — enforces one connection per user

**Cascade**: deleting a `users` row deletes its `akahu_connections` row and,
transitively, all `akahu_account_links` rows for that user.

**TypeScript types**:

```ts
export type AkahuConnection = typeof akahuConnections.$inferSelect;
export type NewAkahuConnection = typeof akahuConnections.$inferInsert;
```

---

## Table: `akahu_account_links`

One record per Akahu-account-to-Finance-Analyser-account mapping. Tracks sync
state and last-known balance.

| Column                       | Type          | Nullable | Default             | Notes                                                            |
| ---------------------------- | ------------- | -------- | ------------------- | ---------------------------------------------------------------- |
| `id`                         | uuid          | NO       | `gen_random_uuid()` | Primary key                                                      |
| `user_id`                    | uuid          | NO       | —                   | FK → `users.id` ON DELETE CASCADE                                |
| `akahu_account_id`           | varchar(50)   | NO       | —                   | Akahu's account ID (e.g. `acc_xxxx`)                             |
| `finance_account_id`         | uuid          | NO       | —                   | FK → `accounts.id` ON DELETE CASCADE                             |
| `akahu_account_name`         | varchar(200)  | NO       | —                   | Display name from Akahu (e.g. "ASB Streamline")                  |
| `akahu_account_type`         | varchar(50)   | YES      | NULL                | Account type from Akahu                                          |
| `last_balance`               | numeric(15,2) | YES      | NULL                | Most recent balance from Akahu; null until first sync            |
| `last_transaction_synced_at` | timestamptz   | YES      | NULL                | Bookmark for incremental sync; null until first sync             |
| `sync_status`                | varchar(20)   | NO       | `'active'`          | `active` \| `syncing` \| `error` \| `disconnected`               |
| `sync_error`                 | text          | YES      | NULL                | Last error message; only meaningful when `sync_status = 'error'` |
| `created_at`                 | timestamptz   | NO       | `now()`             |                                                                  |
| `updated_at`                 | timestamptz   | NO       | `now()`             |                                                                  |

**Unique indexes**:

- `akahu_account_links_user_akahu_idx` on `(user_id, akahu_account_id)` — one link per Akahu account per user
- `akahu_account_links_finance_account_idx` on `(finance_account_id)` — one Akahu account per Finance Analyser account

**Cascade**: deleting a `users` row cascades to all their `akahu_account_links`.
Deleting an `accounts` row cascades to the linked `akahu_account_links` record.

**TypeScript types**:

```ts
export type AkahuAccountLink = typeof akahuAccountLinks.$inferSelect;
export type NewAkahuAccountLink = typeof akahuAccountLinks.$inferInsert;
```

---

## Sync Status State Machine

```
         created
            │
            ▼
         active ◄────── sync succeeds
            │
    sync starts│
            ▼
         syncing
            │
      ┌─────┴─────┐
  success       failure
      │             │
      ▼             ▼
   active         error
                    │
           user disconnects
                    │
                    ▼
             disconnected
```

---

## Encryption Utility: `src/server/utils/encryption.ts`

```
encrypt(plaintext: string) → string
  AES-256-GCM, key from process.env.ENCRYPTION_KEY (32-byte hex)
  Output: base64( iv[12] || authTag[16] || ciphertext )
  Throws if ENCRYPTION_KEY missing or wrong length

decrypt(ciphertext: string) → string
  Reverses encrypt(); throws on tampered data (GCM auth failure)
```

The utility has no side effects, no database access, and no HTTP calls —
pure functions suitable for unit testing without mocks.

---

## Migration

Generated by Drizzle after `schema.ts` is updated:

```
src/db/migrations/0009_akahu_bank_integration.sql
```

Run: `npm run db:generate`

The migration creates both tables with their columns, foreign keys, and unique
indexes in a single file. No manual SQL edits needed.
