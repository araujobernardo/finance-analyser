# Tasks: Auto-Sync Bank Account Balances into Net Worth

**Input**: Design documents from `specs/022-auto-sync-bank-balances/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths are included in every description

---

## Phase 1: Setup

**Purpose**: Confirm existing schema foundation before adding to it.

- [ ] T001 Verify `linkedAccountId` exists on both `assets` and `liabilities` tables by reading `src/db/schema.ts`; confirm the latest migration is `0004_net_worth_snapshots.sql` and the next filename is `0005_auto_sync_flag.sql`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema migration and server-side utilities that ALL user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until T002–T006 are complete.

- [ ] T002 [P] Create `src/db/migrations/0005_auto_sync_flag.sql` — two `ALTER TABLE` statements: `ALTER TABLE assets ADD COLUMN auto_sync boolean NOT NULL DEFAULT true, ADD COLUMN balance_clamped boolean NOT NULL DEFAULT false;` and identical statement for `liabilities`
- [ ] T003 [P] Update `src/db/schema.ts` — add `autoSync: boolean("auto_sync").notNull().default(true)` and `balanceClamped: boolean("balance_clamped").notNull().default(false)` to both the `assets` and `liabilities` table definitions; the inferred `Asset`, `Liability`, `NewAsset`, `NewLiability` types update automatically
- [ ] T004 Apply the migration — run `npx drizzle-kit migrate` from repo root; confirm `0005_auto_sync_flag.sql` applies without error and the two columns exist in Neon
- [ ] T005 [P] Create `src/server/utils/accountBalance.ts` — export `async function computeAccountBalance(accountId: string, userId: string, db: typeof import("../db/index.ts").db): Promise<number>` that uses the Drizzle `sql` helper to run `SELECT COALESCE(SUM(amount), '0') FROM transactions WHERE account_id = $1 AND user_id = $2`, parses the result with `parseFloat()`, and returns `0` if the result is null or there are no rows
- [ ] T006 Create `src/server/utils/syncLinkedAssets.ts` — export `async function syncLinkedAssets(accountId: string, userId: string, db: typeof import("../db/index.ts").db): Promise<void>` that: (1) queries all `assets` where `linkedAccountId = accountId AND userId = userId AND autoSync = true`; for each, calls `computeAccountBalance`, sets `value = String(Math.max(0, raw))`, `balanceClamped = raw < 0`, updates the row; (2) queries all `liabilities` under the same WHERE clause; for each, sets `value = String(Math.max(0, Math.abs(raw)))`, `balanceClamped = raw > 0` (net credit on card — unusual), updates the row

**Checkpoint**: Migration applied, utilities in place — user story work can now begin.

---

## Phase 3: User Story 1 — Link Savings/Cheque Account to Asset (Priority: P1) 🎯 MVP

**Goal**: When a bank account is linked to an asset, the asset value automatically reflects the current account balance. Value field is read-only with an "Auto-synced" badge.

**Independent Test**: Create or edit an asset, select a linked savings account, save — verify the displayed value equals the sum of that account's transactions, and an "Auto-synced" badge appears next to the value.

- [ ] T007 [P] [US1] Add `autoSync: boolean` and `balanceClamped: boolean` to `ApiAsset` and `ApiLiability` interfaces in `src/types/api.ts`
- [ ] T008 [US1] Update PATCH `/api/assets/:id` in `src/server/routes/assets.ts`: add `autoSync: z.boolean().optional()` to `updateAssetSchema`; in the handler implement three branches — (a) if `parsed.data.value !== undefined`: set `updates.autoSync = false`, `updates.balanceClamped = false`, `updates.value = String(parsed.data.value)`; (b) if `parsed.data.autoSync === true` (no value): set `updates.autoSync = true`, then after the DB update fetch the current asset's `linkedAccountId` and call `await syncLinkedAssets(linkedAccountId, userId, db)` followed by a re-fetch of the asset to return the synced value; (c) if `linkedAccountId` is being changed and the current record has `autoSync = true`: after update call `await syncLinkedAssets(newLinkedAccountId, userId, db)` and re-fetch
- [ ] T009 [P] [US1] Update POST `/api/assets` in `src/server/routes/assets.ts`: after the `.returning()` insert, if `linkedAccountId` is provided, call `await syncLinkedAssets(linkedAccountId, userId, db)` then re-fetch the inserted asset with `db.select().from(assets).where(eq(assets.id, newAsset.id))` and return that record (so the auto-computed value is returned rather than the caller-supplied value)
- [ ] T010 [US1] Update `src/context/NetWorthContext.tsx`: (a) add `autoSync?: boolean` to the `updates` parameter type of `updateAsset`; (b) since `addAsset` already replaces the optimistic placeholder with the full server response (`const newAsset = (await res.json()) as ApiAsset`), no change is needed there — but update the optimistic placeholder's `ApiAsset` shape to include `autoSync: true, balanceClamped: false` to satisfy TypeScript; (c) in `updateAsset`, replace the local optimistic state update with the actual server response after the PATCH (already done: `setAssets((prev) => prev.map((a) => (a.id === id ? updated : a)))`)
- [ ] T011 [US1] Update `src/components/net-worth/AssetModal.tsx`: derive `const isAutoSynced = Boolean(asset?.linkedAccountId && asset?.autoSync)` at the top of the component; when `isAutoSynced` is true: add `readOnly` to the value `<input>` and visually distinguish it (e.g. `nw-modal__input--readonly` class); render a blue "Auto-synced" badge (a `<span>` element) next to the value label when `isAutoSynced`; render an amber ⚠ warning message below the value field when `asset?.balanceClamped` is true; in `handleSave`, omit `value` from the payload when `isAutoSynced` (only send `name`, `type`, `linkedAccountId`)

**Checkpoint**: US1 fully functional — linking a savings account to an asset auto-populates and locks the value.

---

## Phase 4: User Story 2 — Link Credit Card Account to Liability (Priority: P1)

**Goal**: When a credit card account is linked to a liability, the liability value equals the absolute value of the running balance. Same "Auto-synced" badge and read-only field as US1.

**Independent Test**: Create or edit a liability, select a linked credit card account, save — verify the displayed value equals `abs(sum of transactions)` for that account.

- [ ] T012 [US2] Update PATCH `/api/liabilities/:id` in `src/server/routes/liabilities.ts`: apply the same three-branch `autoSync` logic as T008 for assets; `syncLinkedAssets` already handles the `abs()` computation for liabilities
- [ ] T013 [P] [US2] Update POST `/api/liabilities` in `src/server/routes/liabilities.ts`: same as T009 — call `syncLinkedAssets` after insert if `linkedAccountId` provided, then re-fetch and return the synced liability record
- [ ] T014 [US2] Update `updateLiability` signature in `src/context/NetWorthContext.tsx`: add `autoSync?: boolean` to the updates parameter type (parallel to T010 for assets)
- [ ] T015 [US2] Update `src/components/net-worth/LiabilityModal.tsx`: apply the same auto-sync UI as T011 — `isAutoSynced` derived from `liability?.linkedAccountId && liability?.autoSync`; read-only value field, "Auto-synced" badge, amber warning when `liability?.balanceClamped`; omit `value` from save payload when `isAutoSynced`

**Checkpoint**: US1 + US2 both functional — assets and liabilities both auto-sync when linked to accounts.

---

## Phase 5: User Story 3 — Transactions Auto-Trigger Value Update (Priority: P2)

**Goal**: Adding, editing, or deleting a transaction on a linked account automatically updates all connected assets and liabilities without any user action on the Net Worth page.

**Independent Test**: With an asset linked to a savings account, add a new transaction (+$500) to that account — navigate to the Net Worth page and verify the asset value has increased by $500.

- [ ] T016 [US3] Update POST `/api/accounts/:accountId/transactions` handler in `src/server/routes/transactions.ts`: after `res.status(201).json(serializeTransaction(row))` preparation (before sending), call `await syncLinkedAssets(accountId, userId, db)`; then send the response
- [ ] T017 [US3] Update POST `/api/accounts/:accountId/transactions/import` handler in `src/server/routes/transactions.ts`: after the bulk insert (`await db.insert(transactions).values(validRows)`), call `await syncLinkedAssets(accountId, userId, db)` before sending the `{ imported, skipped }` response
- [ ] T018 [US3] Update PATCH `/api/transactions/:id` in `transactionOpsRouter` in `src/server/routes/transactions.ts`: the `.returning()` result already provides `updated.accountId`; after the update, call `await syncLinkedAssets(updated.accountId, userId, db)` before `res.json(serializeTransaction(updated))`
- [ ] T019 [US3] Update DELETE `/api/transactions/:id` in `transactionOpsRouter` in `src/server/routes/transactions.ts`: the `.returning()` result already provides `deleted.accountId`; after the delete, call `await syncLinkedAssets(deleted.accountId, userId, db)` before `res.status(204).send()`
- [ ] T020 [P] [US3] Add `refreshNetWorth: () => void` to `NetWorthContextValue` in `src/context/NetWorthContext.tsx`: implement as a `useCallback` that re-runs the same `fetchAll` logic (re-fetch `/api/assets` and `/api/liabilities`) and updates `assets` and `liabilities` state; expose via the context value
- [ ] T021 [US3] Find all React components and pages that call transaction mutation APIs (add single transaction, import transactions, patch/delete transaction) and call `refreshNetWorth()` from `useNetWorth()` after each successful mutation, so the Net Worth page context reflects the server-side sync without a full page reload

**Checkpoint**: US3 functional — any transaction change on a linked account instantly reflects in the net worth context.

---

## Phase 6: User Story 4 — Manual Override Suspends Auto-Sync (Priority: P2)

**Goal**: Editing the value of an auto-synced asset or liability suspends auto-sync and shows a "Manual override" badge.

**Independent Test**: With an auto-synced asset, open the edit modal, change the value, save — verify `autoSync` is now false (server returns it), and a "Manual override" badge replaces the "Auto-synced" badge.

_Note: The server-side logic (setting `autoSync=false` when `value` is sent) is already implemented in T008/T012. These tasks add only the frontend UI._

- [ ] T022 [US4] Update `src/components/net-worth/AssetModal.tsx`: when `!isAutoSynced && asset?.linkedAccountId`: render a grey "Manual override" badge next to the value label (replacing or alongside no badge); ensure the value input is editable in this state (it already is, since `isAutoSynced` is false); add `data-testid="manual-override-badge"` to the badge element
- [ ] T023 [US4] Update `src/components/net-worth/LiabilityModal.tsx`: same "Manual override" badge as T022 — grey badge when `!isAutoSynced && liability?.linkedAccountId`; add `data-testid="manual-override-badge"`

**Checkpoint**: US4 functional — manual edits visibly suspend auto-sync.

---

## Phase 7: User Story 5 — Re-Enable Auto-Sync After Manual Override (Priority: P3)

**Goal**: A "Re-enable auto-sync" button restores auto-sync on a manually-overridden asset or liability, immediately recomputing the value from the linked account.

**Independent Test**: On a manually-overridden asset, click "Re-enable auto-sync" — verify the value updates to the current account balance and the "Auto-synced" badge reappears.

- [ ] T024 [US5] Update `src/components/net-worth/AssetModal.tsx`: when `!isAutoSynced && asset?.linkedAccountId`, render a "Re-enable auto-sync" `<button>` (type="button") below the value field; clicking it calls `updateAsset(asset.id, { autoSync: true })` and, on success, closes the modal (or re-derives `isAutoSynced` from the updated asset in state); add `data-testid="reenable-autosync-btn"` to the button
- [ ] T025 [US5] Update `src/components/net-worth/LiabilityModal.tsx`: same "Re-enable auto-sync" button as T024, calling `updateLiability(liability.id, { autoSync: true })`; add `data-testid="reenable-autosync-btn"`

**Checkpoint**: All 5 user stories functional end-to-end.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T026 [P] Run `npm run lint` and fix any TypeScript or ESLint errors introduced by the new `autoSync` and `balanceClamped` fields (particularly in `src/types/api.ts`, `NetWorthContext.tsx`, and the modal components)
- [ ] T027 Manual smoke test per spec acceptance scenarios: (a) link savings account to asset → value syncs; (b) link credit card to liability → value = abs(sum); (c) add transaction to linked account → net worth context reflects new balance; (d) manually edit asset value → "Manual override" badge appears; (e) click "Re-enable" → value syncs back to account balance

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
  - T002 and T003 can run in parallel (different files)
  - T004 depends on T002 (migration file must exist before running it)
  - T005 can run in parallel with T002/T003 (different file)
  - T006 depends on T005 (imports `computeAccountBalance`)
- **Phase 3 (US1)**: Depends on Phase 2 complete
- **Phase 4 (US2)**: Depends on Phase 2 complete; can run in parallel with Phase 3
- **Phase 5 (US3)**: Depends on Phase 2 complete; routes can start once T006 is done
- **Phase 6 (US4)**: Depends on Phase 3 and Phase 4 (server PATCH logic in T008/T012 must be complete)
- **Phase 7 (US5)**: Depends on Phase 6 (builds on same modal components)
- **Phase 8 (Polish)**: Depends on all story phases complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — no dependency on other stories
- **US2 (P1)**: After Phase 2 — no dependency on other stories; parallels US1
- **US3 (P2)**: After Phase 2 — parallel to US1/US2 for backend tasks; frontend (T020/T021) after US1
- **US4 (P2)**: After US1 and US2 (needs PATCH logic from T008/T012)
- **US5 (P3)**: After US4 (builds on same modals)

### Within Each User Story

- API route tasks before frontend tasks (frontend depends on API types)
- Types (T007) before context (T010) before modal (T011)
- Server utilities (T005/T006) before any route changes that call them

---

## Parallel Opportunities

```bash
# Phase 2 — run together:
T002  # Write migration SQL
T003  # Update schema.ts
T005  # Create accountBalance.ts

# After T002:
T004  # Apply migration

# After T005:
T006  # Create syncLinkedAssets.ts

# After Phase 2 — run US1 and US2 together:
T007  # Types (shared, do once)
T008  # PATCH /api/assets/:id
T012  # PATCH /api/liabilities/:id
T009  # POST /api/assets
T013  # POST /api/liabilities
T016-T019  # Transaction route sync calls (can parallel with US1/US2 once T006 done)
T020  # refreshNetWorth in context (parallel)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2 (Foundational) — T002–T006
2. Complete Phase 3 (US1) — T007–T011
3. **STOP and VALIDATE**: Link a savings account to an asset, verify value auto-populates and is read-only
4. Demo if ready

### Incremental Delivery

1. Phase 2 → Foundation ready
2. Phase 3 → US1: asset sync working (MVP)
3. Phase 4 → US2: liability sync working
4. Phase 5 → US3: transaction mutations trigger auto-update
5. Phase 6 → US4: manual override UX
6. Phase 7 → US5: re-enable UX
7. Phase 8 → Polish and smoke test

---

## Notes

- `autoSync` defaults to `true` in the DB, so all existing assets and liabilities with a `linkedAccountId` will auto-sync after the migration is applied and the next transaction mutation occurs
- The optimistic update in `addAsset` / `addLiability` will briefly show the user-entered value before the server response replaces it with the synced value — this is acceptable and already handled by the existing server-response-replacement pattern
- `syncLinkedAssets` is idempotent — calling it multiple times is safe
- The `transactionOpsRouter` PATCH and DELETE handlers do not receive `accountId` via URL params; always extract it from the `.returning()` result
