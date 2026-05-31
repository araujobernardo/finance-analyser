# Research: Akahu Bank Sync

**Feature**: FA-BANK-002 | **Branch**: `772-akahu-bank-sync` | **Date**: 2026-05-31

## Akahu SDK Package

**Decision**: `akahu` v2.5.1 — the official NZ Akahu open-banking SDK.

**Rationale**: Confirmed via npmjs.com search. The package is `akahu` (not
`@akahu/sdk`). It is the official SDK with ISC licence, TypeScript support,
and current maintenance. Install: `npm install akahu`.

**SDK usage pattern** (from docs/types — verify constructor against installed
package at implementation time):

```ts
import { AkahuClient } from "akahu";
const akahu = new AkahuClient({ appToken: process.env.AKAHU_APP_TOKEN });
const accounts = await akahu.accounts.list(userToken);
const txns = await akahu.transactions.list(userToken, { start, end });
const pending = await akahu.transactions.listPending(userToken);
```

---

## Route Pattern

**Decision**: Follow `src/server/routes/budgets.ts` exactly.

- `export const akahuSyncRouter = Router()`
- `akahuSyncRouter.use(authenticateToken)` — protects all routes at the
  router level; individual handlers do not add middleware
- All handlers: `try { ... } catch (err) { next(err) }` — error forwarding
  to the global `errorHandler`
- Request body validation: `z.object({...}).safeParse(req.body)` — return
  `400` with `error` string on parse failure
- Auth user ID: `(res.locals as AuthLocals).user.userId`
- Numeric values (amounts) stored as `String(number)` — postgres-js requires
  strings for `numeric` columns
- Import paths use `.ts` extensions (project uses ESM with verbatim extensions)

---

## `src/server/services/` Directory

**Decision**: Directory already exists — `authService.ts` and `emailService.ts`
are present. No `mkdir` needed.

---

## Deduplication Strategy

**Decision**: Match on `(date, amount, description, accountId)` in the
`transactions` table before inserting.

**Rationale**: Matches the heuristic used for CSV import. A Drizzle
`db.select().from(transactions).where(and(eq(...), eq(...), eq(...), eq(...)))`
check before each insert is sufficient given the single-user, low-volume context.
No unique index on these four columns exists currently — the check is
application-level. Adding a DB-level unique constraint is out of scope and
would require a migration; application-level dedup is consistent with the
existing import flow.

**Alternatives considered**: A DB unique constraint on `(date, amount,
description, accountId)` — rejected as it requires a new migration and would
break import of legitimate duplicate transactions (same date/amount/description
from different Akahu accounts).

---

## Sync Error Isolation

**Decision**: Per-account try/catch inside the `syncUserAccounts` function.
A failed account sets `syncStatus = 'error'` and pushes to the `errors` array;
the function continues to the next account.

**Rationale**: FR-013 requires isolation. This matches the spec's acceptance
scenario: "other linked accounts continue syncing normally."

---

## Accounts Without Transaction Access

**Decision**: Check for the `'TRANSACTIONS'` string in the Akahu account's
`attributes` array before fetching transactions.

**Rationale**: Some Akahu account types (e.g. LOAN) return no attributes. The
balance is still updated for these accounts; transaction fetch is skipped.

---

## Pending Transactions

**Decision**: Call `akahu.transactions.listPending(userToken)` after settled
transactions and insert pending ones using the same dedup check.

**Rationale**: FR-017 requires pending transaction import. Dedup ensures that
when a pending transaction settles and appears in a future sync, it is not
double-counted.

---

## Route Mount Point

**Decision**: `app.use('/api/bank', akahuSyncRouter)` in `src/server/index.ts`.

All six endpoint paths are relative to this mount: `/sync`, `/connection`,
`/connect`, `/accounts/link`, `/accounts/link/:akahuAccountId`.

---

## Render Environment Variables

**Required on Render backend web service before deployment**:

- `ENCRYPTION_KEY` — already defined in `.env.example` by FA-BANK-001
- `AKAHU_APP_TOKEN` — already defined in `.env.example` by FA-BANK-001

No new environment variables are introduced by FA-BANK-002.
