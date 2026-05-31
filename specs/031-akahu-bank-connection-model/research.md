# Research: Akahu Bank Connection Data Model

**Feature**: FA-BANK-001 | **Branch**: `771-akahu-bank-connection-model` | **Date**: 2026-05-31

## Encryption Strategy for Akahu User Token

**Decision**: AES-256-GCM using Node.js built-in `crypto` module — no new npm packages.

**Rationale**: Node.js `crypto` is available in all Node 20 environments including
Render. AES-256-GCM provides authenticated encryption (integrity + confidentiality)
in one pass, making it the correct choice for sensitive tokens. The GCM auth tag
detects tampering. No external dependency means no supply-chain risk.

**Format**: `encrypt()` returns a single base64 string encoding
`iv (12 bytes) + authTag (16 bytes) + ciphertext (variable)` concatenated.
`decrypt()` reverses the split. This keeps the stored value self-contained —
no separate columns for IV or tag needed.

**Key source**: `process.env.ENCRYPTION_KEY` — a 32-byte value expressed as a
64-character hex string. The utility must throw `Error('ENCRYPTION_KEY env var is missing or wrong length')` if the key is absent or not 64 hex chars, so misconfigured
deploys fail loudly at startup rather than silently storing plaintext.

**Alternatives considered**:

- `bcrypt` — one-way hash, cannot decrypt; unsuitable for a token that must be
  sent to Akahu.
- `jsonwebtoken` signing — signs but does not encrypt; token would be readable.
- External KMS — appropriate for multi-tenant production; overkill for a
  single-user personal finance app.

---

## Drizzle Migration Strategy

**Decision**: Add two new `pgTable` definitions to `src/db/schema.ts`, then run
`npm run db:generate` to produce `0009_akahu_bank_integration.sql` automatically.

**Rationale**: All existing tables follow this pattern. Drizzle's introspection
produces correct DDL including foreign-key constraints and unique indexes.
Hand-writing the SQL would risk drift between schema.ts and the migration file.

**Migration filename convention**: The project uses descriptive suffixes (e.g.
`0007_budget_data_model.sql`). The new file will be
`0009_akahu_bank_integration.sql` — Drizzle sets the prefix, the suffix is set
in `drizzle.config.ts` or is auto-generated. If Drizzle generates a different
suffix, that is acceptable; the content is authoritative.

**Highest existing migration**: `0008_budget_alert_preferences.sql` — confirmed
by directory listing.

---

## Unique Index Patterns

**Decision**: Use `uniqueIndex()` from `drizzle-orm/pg-core`, already imported
in `schema.ts`, matching the patterns in `netWorthSnapshots` and `budgets`.

Three unique constraints required:

1. `akahu_connections_user_id_idx` on `(userId)` — one connection per user.
2. `akahu_account_links_user_akahu_idx` on `(userId, akahuAccountId)` — one
   link per Akahu account per user.
3. `akahu_account_links_finance_account_idx` on `(financeAccountId)` — one
   Akahu account per Finance Analyser account.

---

## Sync Status Enum

**Decision**: `varchar(20)` with application-level constraint — values are
`active`, `syncing`, `error`, `disconnected`. Default: `active`.

**Rationale**: Matches the existing pattern (`goals.status`, `assets.type`)
where status is a varchar rather than a Postgres enum. Avoids a migration cost
when new statuses are added in future Akahu features. The type contract is
enforced in TypeScript, not the DB.

---

## Environment Variables

Three new backend-only vars (no `VITE_` prefix — not needed in the browser bundle):

| Variable           | Purpose                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `ENCRYPTION_KEY`   | 32-byte hex key for AES-256-GCM; generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `AKAHU_APP_TOKEN`  | Akahu application token (used in FA-BANK-002/003)                                                                         |
| `AKAHU_USER_TOKEN` | Akahu user token placeholder for local dev (stored encrypted in DB at runtime)                                            |

`AKAHU_APP_TOKEN` and `AKAHU_USER_TOKEN` are documented now so operators can
provision them before FA-BANK-002 lands.

---

## No New npm Dependencies

**Decision**: Zero new packages for FA-BANK-001.

`crypto` is a Node.js built-in. `drizzle-orm` and `drizzle-kit` are already in
`package.json`. No Akahu SDK is needed for the data layer — the HTTP client
comes in FA-BANK-003.
