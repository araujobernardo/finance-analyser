# Tasks: Bank Connection and Sync Interface

**Input**: Design documents from `specs/033-bank-connection-ui/`
**Branch**: `773-bank-connection-ui`
**Feature ID**: FA-BANK-003
**Prerequisite**: FA-BANK-001 (#820–#824) and FA-BANK-002 (#825–#832) must be merged and deployed for end-to-end functionality. The UI renders in a not-connected state if the API is absent.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks (different files)
- **[Story]**: Which user story this task belongs to (US1/US2/US3)

---

## Phase 1: Setup

No new npm packages required. Proceed directly to Phase 2.

---

## Phase 2: Foundational

**Purpose**: Add shared API types and the sidebar nav entry. These do not depend on each other and can be implemented in parallel. `BankContext` (T003) depends on the API types from T001.

**⚠️ CRITICAL**: T004 cannot begin until T003 is merged. T003 depends on T001.

- [ ] T001 [P] Add `ApiAkahuConnection`, `ApiAkahuAccountLink`, and `SyncResult` interfaces to `src/types/api.ts` — append after the existing `AlertedCategory` interface; match the existing style (semicolons, inline comments for `string | null` numeric fields); `ApiAkahuAccountLink.lastBalance` must include the postgres-js comment; `syncStatus` typed as `"active" | "syncing" | "error" | "disconnected"`; `encryptedUserToken` intentionally omitted from `ApiAkahuConnection`

- [ ] T002 [P] Add `{ path: "/settings/bank", icon: "⬡", label: "Bank Connection" }` to the `NAV` array in `src/components/Sidebar.tsx` — place after the `{ path: "/settings", ... }` entry; use the same object shape as existing entries (the icon character can be any unused symbol from the existing set)

- [ ] T003 Create `src/context/BankContext.tsx` — follow `src/context/AccountContext.tsx` exactly; import `ApiAkahuConnection`, `ApiAkahuAccountLink`, `SyncResult` from `../types/api`; import `useApi` from `../lib/api` and `useToast` from `../hooks/useToast`; export `BankContextValue` interface with: `connection: ApiAkahuConnection | null`, `accountLinks: ApiAkahuAccountLink[]`, `isLoading: boolean`, `isSyncing: boolean`, `lastSyncResult: SyncResult | null`, `error: string | null`, and six async methods: `connect(akahuUserId, userToken): Promise<boolean>`, `disconnect(): Promise<boolean>`, `linkAccount(akahuAccountId, financeAccountId, akahuAccountName): Promise<boolean>`, `unlinkAccount(akahuAccountId): Promise<boolean>`, `syncNow(): Promise<void>`, `refetch(): Promise<void>`; on mount call `GET /api/bank/connection` — 404 sets `connection = null` (not an error); `syncNow()` calls `POST /api/bank/sync` and sets `lastSyncResult`; `connect()` calls `POST /api/bank/connect`; `disconnect()` calls `DELETE /api/bank/connection`; `linkAccount()` calls `POST /api/bank/accounts/link`; `unlinkAccount()` calls `DELETE /api/bank/accounts/link/:akahuAccountId`; export `BankProvider` and `useBankContext`

**Checkpoint**: `tsc --noEmit` passes. BankContext exports compile without errors.

---

## Phase 3: User Story 1 — Connect & Disconnect Akahu (P1) 🎯 MVP

**Goal**: Owner can visit `/settings/bank`, enter Akahu tokens to connect, see connection status including last sync time, and disconnect.

**Independent Test**: Navigate to `/settings/bank` with no connection — confirm the connect form is shown with the privacy note. Submit tokens — confirm the page transitions to connected state with connection metadata and a Disconnect button. Click Disconnect with confirmation — confirm the page returns to the disconnected state.

- [ ] T004 [US1] Create `src/pages/BankConnectionPage.tsx` with the `BankConnectionPage` default export and two sub-components in the same file — `ConnectionStatusCard` and `ConnectForm`:
  - **`ConnectionStatusCard`**: shown when `connection !== null`; displays `connection.connectedAt` (formatted date), `connection.lastSyncedAt` (formatted or "Never"), and a Disconnect button that calls `window.confirm("Disconnect your Akahu account?")` then `disconnect()` from `useBankContext()`; shows a spinner while `isLoading`
  - **`ConnectForm`**: shown when `connection === null`; two controlled text inputs — akahuUserId (label "Akahu User ID") and userToken (label "User Token"); help text "Get these from my.akahu.nz/developers"; privacy note "Your bank credentials are never stored. Only your Akahu tokens are saved, and you can revoke access at any time from my.akahu.nz."; submit calls `connect(akahuUserId, userToken)` from `useBankContext()`; button disabled while `isLoading`
  - `BankConnectionPage` renders both sub-components with `useBankContext()`; shows `error` string if context error is set

- [ ] T005 [US1] Register `BankProvider` and the `/settings/bank` route in `src/App.tsx`:
  - Import `BankProvider` from `./context/BankContext`
  - Import `BankConnectionPage` from `./pages/BankConnectionPage`
  - Wrap the `<div className="app-shell">` content (currently direct child of `<BudgetProvider>`) with `<BankProvider>...</BankProvider>`
  - Add `<Route path="/settings/bank" element={<BankConnectionPage />} />` inside the `<Routes>` block alongside the existing routes

**Checkpoint**: `/settings/bank` renders. Connect form shown when no connection. `tsc --noEmit` passes.

---

## Phase 4: User Story 2 — Map Akahu Accounts (P2)

**Goal**: When connected, owner sees all Akahu accounts with dropdowns to link each to a Finance Analyser account. Changes save immediately.

**Independent Test**: With a valid connection, confirm the account list is shown. Select a Finance Analyser account from one row's dropdown — confirm the link is saved and the row updates. Select "Not linked" — confirm the link is removed.

- [ ] T006 [US2] Add `AccountMappingList` and `AccountMappingRow` sub-components to `src/pages/BankConnectionPage.tsx` and render them inside `BankConnectionPage` when `connection !== null`:
  - **`AccountMappingRow`**: one row per `ApiAkahuAccountLink` in `accountLinks`; shows `akahuAccountName`, `akahuAccountType ?? "—"`, and balance (`parseFloat(link.lastBalance ?? "0").toFixed(2)` formatted as NZD); a `<select>` dropdown populated from `useAccount().accounts` with a "Not linked" option plus one option per Finance Analyser account; `onChange`: if new value is empty string → `unlinkAccount(link.akahuAccountId)`, else → `linkAccount(link.akahuAccountId, newValue, link.akahuAccountName)`; a sync status badge: green dot for `active`, spinner for `syncing`, red dot + `link.syncError` text for `error`, grey dot for `disconnected`; `lastTransactionSyncedAt` shown when present
  - **`AccountMappingList`**: maps `accountLinks` to `AccountMappingRow` components; shows "No Akahu accounts found" if `accountLinks` is empty

**Checkpoint**: Account mapping list renders for each linked account. Dropdown saves link on change. Status badge reflects `syncStatus` correctly.

---

## Phase 5: User Story 3 — Trigger Sync & View Results (P3)

**Goal**: Owner can trigger a manual sync, see progress, and read a results summary with per-account status.

**Independent Test**: With at least one linked account, click "Sync now". Confirm the button disables and a spinner appears. When sync completes, confirm a results summary is shown (e.g. "Synced 5 new transactions across 2 accounts"). Confirm the button re-enables.

- [ ] T007 [US3] Add `SyncControls` sub-component to `src/pages/BankConnectionPage.tsx` and render it inside `BankConnectionPage` when `connection !== null && accountLinks.length > 0`:
  - **`SyncControls`**: "Sync now" `<button>` disabled when `isSyncing`; a spinner element shown when `isSyncing`; `onClick` calls `syncNow()` from `useBankContext()`; when `lastSyncResult` is set, show summary: `"Synced {lastSyncResult.transactionsAdded} new transactions across {lastSyncResult.accountsSynced} accounts"` (or "No new transactions found" if `transactionsAdded === 0`); if `lastSyncResult.errors.length > 0`, list errors per account; security note paragraph: "Finance Analyser connects to your bank via Akahu, New Zealand's regulated open finance platform. Your bank login credentials are never shared with or stored by Finance Analyser. You can disconnect at any time by clicking Disconnect below or by visiting my.akahu.nz."

**Checkpoint**: Sync button triggers sync. Button disables while in-progress. Result summary appears after completion. Security note visible.

---

## Dependencies & Execution Order

```
T001 [P] (api.ts) ─────────────────────────────────── T003 (BankContext)
                                                          │
T002 [P] (Sidebar.tsx) ─── independent                   │
                                                          ▼
                                                       T004 [US1] (BankConnectionPage initial)
                                                          │
                                                          ▼
                                                       T005 [US1] (App.tsx — BankProvider + route)
                                                          │
                                                          ▼
                                                       T006 [US2] (AccountMappingList + Row)
                                                          │
                                                          ▼
                                                       T007 [US3] (SyncControls)
```

### Parallel Opportunities

- **T001 and T002** can run in parallel (different files: `api.ts` vs `Sidebar.tsx`)
- **T003** depends on T001 (imports the new types); must follow T001
- **T004–T007** are sequential — all edit or create `BankConnectionPage.tsx`, plus T005 edits `App.tsx` which imports the page

---

## Implementation Strategy

### MVP (User Story 1 only)

1. T001 + T002 (parallel) — API types + sidebar nav
2. T003 — BankContext
3. T004 → T005 — page shell + App registration
4. **VALIDATE**: `/settings/bank` renders; connect form works; disconnect works

### Full Delivery

1. T001 + T002 (parallel)
2. T003 → T004 → T005 (US1 complete)
3. T006 (US2 — account mapping)
4. T007 (US3 — sync controls)

---

## Notes

- T003 (`BankContext`) is the most complex task — `syncNow()` must set `isSyncing = true` before calling the API and `false` after, and call `refetch()` on completion so `accountLinks` sync statuses update in the UI
- T005 must wrap the `<div className="app-shell">` and its children (including `<Toast />`) with `<BankProvider>` — check current App.tsx structure at implementation time
- `encryptedUserToken` must never appear in any rendered output — `ApiAkahuConnection` omits it by design
- The page can be visited while FA-BANK-002 is not yet deployed — the 404 response from `GET /api/bank/connection` gracefully renders the connect form
