# Research: Auto-Sync Bank Account Balances (FA-NW-004)

## Decision 1: Balance computation — SQL aggregate vs. in-process sum

**Decision**: Use a SQL `SUM(amount)` aggregate query via Drizzle `sql` helper, not a JS-side loop over fetched rows.

**Rationale**: A single SQL aggregate is more efficient and avoids loading every transaction into memory. The `transactions.amount` column is `numeric(15,2)` — Drizzle returns this as a string, so the result must be `parseFloat()`-ed. The return value should be `0` when `SUM` returns `NULL` (no rows).

**Alternatives considered**:

- Fetch all rows then `reduce` in JS — rejected; unnecessary data transfer for large accounts.

---

## Decision 2: Sync trigger placement — route-level vs. middleware

**Decision**: Call `syncLinkedAssets(accountId, userId, db)` directly inside each mutating transaction route handler (POST single, POST /import, PATCH, DELETE), after the DB write succeeds, before sending the response.

**Rationale**:

- Three transaction mutation points exist: `transactionsRouter.post("/")`, `transactionsRouter.post("/import")`, `transactionOpsRouter.patch("/:id")`, `transactionOpsRouter.delete("/:id")`.
- The DELETE handler only has the `transactionId` — the `accountId` must be recovered from the deleted row (which is available via `.returning()`).
- Calling sync inline is simpler than a middleware approach; a middleware would need the account ID in scope anyway.
- The PATCH handler (`transactionOpsRouter`) does not receive `accountId` via params — it must be retrieved from the deleted/updated row's `accountId` field in the `.returning()` result.

**Alternatives considered**:

- Database trigger — rejected; adds operational complexity and bypasses application-level logic.
- Background job / queue — rejected; spec explicitly requires in-request sync only.

---

## Decision 3: autoSync flag semantics on manual value PATCH

**Decision**: When `PATCH /api/assets/:id` receives a `value` field, automatically set `autoSync = false`. When it receives `autoSync: true` without a `value`, set `autoSync = true` and immediately run `syncLinkedAssets` so the value updates in the same request.

**Rationale**: This makes the two use cases distinct and predictable:

1. User edits value → implicit override → `autoSync = false`.
2. User clicks "Re-enable" → sends `{ autoSync: true }` → `autoSync = true` + immediate sync.

**Alternatives considered**:

- Require client to always explicitly send `autoSync: false` on value edits — rejected; too error-prone.

---

## Decision 4: Clamping and warning signal

**Decision**: `computeAccountBalance` returns the raw signed sum. `syncLinkedAssets` clamps using `Math.max(0, rawBalance)` for assets and `Math.max(0, Math.abs(rawBalance))` for liabilities. When clamping occurs (rawBalance < 0 for assets, which is unusual, or rawBalance > 0 for liabilities which means credit), the DB update also sets a `balanceClamped: boolean` flag — **but only in the response payload, not in the DB** — by including a derived field.

**Rationale**: Storing `balanceClamped` in the DB would add a column solely for a transient UI warning. Instead, `GET /api/assets` and `GET /api/liabilities` can derive `balanceClamped` at read time: for an asset with `autoSync=true`, `balanceClamped = (rawComputedBalance < 0)`. However, computing this at GET time requires re-running the aggregate per-record which is expensive.

**Revised decision**: Store `balanceClamped: boolean` in the `assets` and `liabilities` tables. `syncLinkedAssets` sets it alongside `value`. Set to `false` on manual override. This keeps GET simple and avoids per-request aggregate recomputation.

**Schema addition**: `balanceClamped: boolean NOT NULL DEFAULT false` on `assets` and `liabilities`.

---

## Decision 5: Transaction PATCH — accountId recovery

**Decision**: The existing `transactionOpsRouter.patch("/:id")` does not currently receive `accountId` in the request. After updating and calling `.returning()`, the updated row includes `accountId` — use that to call `syncLinkedAssets`.

**Rationale**: No route changes needed; the `.returning()` pattern already used in the codebase provides all needed fields.
