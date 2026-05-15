# Tasks: FA-NW-002 — Asset and Liability Management

**Input**: Design documents from `specs/019-asset-liability-management/`  
**Branch**: `019-asset-liability-management`  
**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1, US2, US3)
- No test tasks — tests not requested in spec

> **Critical note**: `ApiAsset.value` and `ApiLiability.value` are returned as `string` by
> postgres-js (numeric columns). All client-side arithmetic — totals, net worth — MUST call
> `parseFloat(item.value)` before operating on these values. This applies to NetWorthContext
> aggregations and the summary bar calculation.

---

## Phase 1: Setup

**Purpose**: Confirm prerequisite DB state before any code is written.

- [ ] T001 Confirm `assets` and `liabilities` tables exist in Supabase by running `npm run db:migrate` — if the migration has not been applied, the command will apply it; if already applied, it exits cleanly with no changes

**Checkpoint**: DB tables confirmed present — backend implementation can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, backend routes, context, and navigation that every user story depends on.

**⚠️ CRITICAL**: No user story UI work can begin until this phase is complete.

- [ ] T002 Add `ApiAsset` and `ApiLiability` interfaces to `src/types/api.ts` — both have fields: `id: string`, `userId: string`, `name: string`, `type: string`, `value: string` (postgres-js returns numeric as string), `linkedAccountId: string | null`, `createdAt: string`, `updatedAt: string`

- [ ] T003 [P] Create `src/server/routes/assets.ts` with `assetsRouter`:
  - `ASSET_TYPES = ["property", "investments", "kiwisaver", "savings", "vehicle", "other"] as const`
  - `createAssetSchema`: `name` (string min 1 max 100), `type` (enum), `value` (number min 0 — rejects negatives), `linkedAccountId` (uuid string or null, optional)
  - `updateAssetSchema`: all fields optional, refine to require at least one
  - `GET /`: `db.select().from(assets).where(eq(assets.userId, userId)).orderBy(asc(assets.createdAt))` → `{ assets: rows }`
  - `POST /`: Zod parse → insert + `.returning()` → 201
  - `PATCH /:id`: Zod parse → `db.update(assets).set({ ...updates, updatedAt: new Date() }).where(and(eq(assets.id, id), eq(assets.userId, userId))).returning()` → 200 or 404
  - `DELETE /:id`: `db.delete(assets).where(and(...)).returning()` → 204 or 404
  - All handlers use `authenticateToken` middleware and `(res.locals as AuthLocals).user.userId`

- [ ] T004 [P] Create `src/server/routes/liabilities.ts` with `liabilitiesRouter` — identical structure to T003 with:
  - `LIABILITY_TYPES = ["mortgage", "personal_loan", "car_loan", "student_loan", "credit_card", "other"] as const`
  - All table references use `liabilities` from schema; response key is `"liabilities"`

- [ ] T005 Register both routers in `src/server/index.ts` — add imports for `assetsRouter` and `liabilitiesRouter` and mount: `app.use("/api/assets", assetsRouter)` and `app.use("/api/liabilities", liabilitiesRouter)` (after existing route registrations, before the 404 handler)

- [ ] T006 Create `src/context/NetWorthContext.tsx`:
  - `useState<ApiAsset[]>` for `assets`, `useState<ApiLiability[]>` for `liabilities`, `useState<boolean>` for `isLoading`
  - `useEffect` on mount: `Promise.all([apiFetch("/api/assets"), apiFetch("/api/liabilities")])` — parse both responses and set state
  - Optimistic `addAsset`: append temp record with `id = "optimistic-" + crypto.randomUUID()`, POST, replace temp with server record on success, filter out + `addToast(...)` on error
  - Optimistic `updateAsset`: patch local state immediately, PATCH, rollback to snapshot + `addToast(...)` on error
  - Optimistic `removeAsset`: remove immediately saving snapshot by index, DELETE, restore snapshot + `addToast(...)` on error
  - Same three optimistic operations for `addLiability`, `updateLiability`, `removeLiability`
  - Export `NetWorthProvider` component and `useNetWorth()` hook
  - Context value exposes: `assets`, `liabilities`, `isLoading`, `addAsset`, `updateAsset`, `removeAsset`, `addLiability`, `updateLiability`, `removeLiability`

- [ ] T007 [P] Add `/net-worth` route to `src/App.tsx` inside the `appShell` Routes block, following the same `<ProtectedRoute>` pattern as `/dashboard` and other routes:

  ```tsx
  <Route
    path="/net-worth"
    element={
      <ProtectedRoute>
        <NetWorthProvider>
          <NetWorthPage />
        </NetWorthProvider>
      </ProtectedRoute>
    }
  />
  ```

  Import `NetWorthProvider` from `../context/NetWorthContext` and `NetWorthPage` from `../pages/NetWorthPage`

- [ ] T008 [P] Add Net Worth entry to the NAV array in `src/components/Sidebar.tsx`: `{ path: "/net-worth", icon: "◈", label: "Net Worth" }` — insert after the existing dashboard entry, following the exact same object shape used by other nav items

**Checkpoint**: Backend endpoints live, context wired, nav entry present, route registered. User story implementation can begin.

---

## Phase 3: User Story 1 — View and Manage Assets (Priority: P1) 🎯 MVP

**Goal**: A signed-in user can view all their assets grouped by type, add a new asset, edit it, and delete it. The total asset value updates immediately on every change.

**Independent Test**: Navigate to `/net-worth`. With no assets: empty state is shown. Add an asset — it appears in the correct type group and the total updates. Edit it — change reflects. Delete it — removed from list and total updates. The liabilities column can be empty/absent and this story still works.

- [ ] T009 [P] [US1] Create `src/components/net-worth/AssetList.tsx`:
  - Read `assets` and `addAsset`, `updateAsset`, `removeAsset` from `useNetWorth()`
  - Display asset total: `assets.reduce((sum, a) => sum + parseFloat(a.value), 0)` formatted with `Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" })`
  - Group by type in display order `["property", "investments", "kiwisaver", "savings", "vehicle", "other"]`; skip groups with no items
  - Display labels: `property` → "Property", `investments` → "Investments", `kiwisaver` → "KiwiSaver", `savings` → "Savings", `vehicle` → "Vehicle", `other` → "Other"
  - Each asset row: name, type badge, NZD-formatted value, edit button (opens `AssetModal` pre-filled), delete button (window.confirm before calling `removeAsset`)
  - "Add Asset" button at top: opens `AssetModal` in add mode (no initial data)
  - Empty state (when `assets.length === 0`): message prompting user to add their first asset

- [ ] T010 [P] [US1] Create `src/components/net-worth/AssetModal.tsx`:
  - Props: `asset?: ApiAsset` (undefined = add mode, defined = edit mode), `onClose: () => void`
  - Fields: Name (text input, required), Type (select with all 6 asset type options), Value (number input, min 0, step 0.01), Linked Account (select from `useAccount().accounts` — show nickname; "None" option sets `linkedAccountId` to null)
  - `isSubmitting` boolean state: disables Save button during inflight request
  - On submit (add mode): call `addAsset(...)` from context; on success call `onClose()`; on error leave modal open (toast shown by context)
  - On submit (edit mode): call `updateAsset(asset.id, {...})` from context; same success/error behaviour
  - Follows `AddAccountModal.tsx` pattern: backdrop `div` with `role="dialog"` and `aria-modal="true"`, inner panel div with title, form fields (label + input/select), cancel and save buttons

- [ ] T011 [US1] Create `src/pages/NetWorthPage.tsx` with assets column only (liabilities column added in T016):
  - Import and render `<AssetList />` in the left grid column
  - Show loading skeleton (e.g., placeholder divs with opacity pulse) while `isLoading` is true from `useNetWorth()`
  - Apply `NetWorthPage.css` grid layout class to the columns container

- [ ] T012 [P] [US1] Create `src/components/net-worth/NetWorthPage.css`:
  - `.net-worth-columns`: `display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem`
  - `@media (max-width: 768px)`: override to `grid-template-columns: 1fr` (single column, stacked)
  - `.net-worth-summary`: styles for the summary bar (added in T017)
  - `.net-worth-loading`: skeleton pulse animation for loading state

- [ ] T013 [P] [US1] Create `src/components/net-worth/NetWorthModal.css`:
  - Backdrop: fixed position, full-screen, semi-transparent background (`rgba(0,0,0,0.5)`)
  - Panel: centred card with padding, white background, `border-radius`
  - Form fields: label + input/select rows with consistent spacing
  - Error span: red colour, small font
  - Buttons: cancel (secondary) and save (primary, disabled state) — match existing button styles in the project

**Checkpoint**: US1 fully functional. User can navigate to `/net-worth`, see the assets column, add, edit, and delete assets. Total updates optimistically. Mobile layout stacks to single column.

---

## Phase 4: User Story 2 — View and Manage Liabilities (Priority: P2)

**Goal**: A signed-in user can view all their liabilities grouped by type, add a new liability, edit it, and delete it. The total outstanding balance updates immediately.

**Independent Test**: On the `/net-worth` page, the right column shows liabilities. With no liabilities: empty state. Add a liability — appears in correct type group, total updates. Edit, delete — changes reflect immediately. Assets column can be ignored.

- [ ] T014 [P] [US2] Create `src/components/net-worth/LiabilityList.tsx` — same pattern as `AssetList.tsx` (`T009`) with:
  - Read `liabilities`, `addLiability`, `updateLiability`, `removeLiability` from `useNetWorth()`
  - Total: `liabilities.reduce((sum, l) => sum + parseFloat(l.value), 0)` formatted as NZD
  - Group by `["mortgage", "personal_loan", "car_loan", "student_loan", "credit_card", "other"]`
  - Display labels: `mortgage` → "Mortgage", `personal_loan` → "Personal Loan", `car_loan` → "Car Loan", `student_loan` → "Student Loan", `credit_card` → "Credit Card", `other` → "Other"
  - "Add Liability" button, empty state prompt, per-row edit + delete with confirm

- [ ] T015 [P] [US2] Create `src/components/net-worth/LiabilityModal.tsx` — same pattern as `AssetModal.tsx` (`T010`) with:
  - Props: `liability?: ApiLiability`, `onClose: () => void`
  - Type select options: all 6 liability types with display labels
  - On submit calls `addLiability` or `updateLiability` from context

- [ ] T016 [US2] Update `src/pages/NetWorthPage.tsx` to add the liabilities column — import and render `<LiabilityList />` inside the `.net-worth-columns` grid container as the right column (alongside the existing `<AssetList />` left column)

**Checkpoint**: US1 + US2 both functional. Two-column layout complete with assets left and liabilities right. Both sides have independent CRUD with optimistic updates.

---

## Phase 5: User Story 3 — Net Worth Summary (Priority: P3)

**Goal**: A signed-in user sees a summary bar at the top of the page showing total assets, total liabilities, and net worth (assets minus liabilities). The net worth figure is colour-coded green (positive or zero) and red (negative).

**Independent Test**: With at least one asset and one liability present, the summary bar shows three figures. The arithmetic is correct: net worth equals total assets minus total liabilities. The net worth value is green when positive and red when negative. All three figures show zero with no errors when the user has no assets or liabilities.

- [ ] T017 [US3] Update `src/pages/NetWorthPage.tsx` to add the summary bar above the columns:
  - Calculate `totalAssets = assets.reduce((sum, a) => sum + parseFloat(a.value), 0)`
  - Calculate `totalLiabilities = liabilities.reduce((sum, l) => sum + parseFloat(l.value), 0)`
  - Calculate `netWorth = totalAssets - totalLiabilities`
  - Render `.net-worth-summary` bar showing three labelled figures, each formatted with `Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" })`
  - Net worth value colour: `netWorth >= 0` → `var(--accent)` (green), `netWorth < 0` → `var(--red)` — applied via inline style or conditional CSS class
  - Summary bar renders while loading (shows zeros) and updates reactively as assets/liabilities change

**Checkpoint**: All three user stories complete. The `/net-worth` page shows a full-featured summary bar, assets column, and liabilities column. Net worth arithmetic is correct.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T018 Run `npm run typecheck && npm run lint && npm test` — all must pass with zero errors before opening a PR

- [ ] T019 Manual smoke test — verify the full feature on both desktop and mobile:
  - Navigate to `/net-worth` — page loads, Net Worth appears in sidebar
  - Empty state: both columns show empty-state prompts, summary bar shows $0.00 / $0.00 / $0.00
  - Add an asset (e.g., Property $450,000) — appears in Property group, total assets updates, net worth updates
  - Edit the asset — change reflects immediately
  - Delete the asset — removed from list, totals update
  - Add a liability (e.g., Mortgage $320,000) — appears in Mortgage group, total liabilities updates, net worth updates
  - Net worth positive → green; add a liability that makes net worth negative → verify red
  - Resize viewport to 375 px width — columns stack vertically, no horizontal scroll
  - Resize to 1440 px — two-column layout restored

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 — can begin as soon as Foundational is complete
- **Phase 4 (US2)**: Depends on Phase 2 — can begin in parallel with Phase 3 (different files)
- **Phase 5 (US3)**: Depends on Phase 3 + Phase 4 — summary bar needs both lists to exist in the page
- **Phase 6 (Polish)**: Depends on all prior phases

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational — independently testable
- **US2 (P2)**: Depends only on Foundational — independently testable
- **US3 (P3)**: Depends on US1 + US2 being in the page (`NetWorthPage.tsx` must have both columns before the summary bar makes sense to validate)

### Within Foundational (Phase 2)

- T002 first (types needed by T003, T004, T006)
- T003, T004 in parallel (different files, both depend on T002)
- T005 after T003 + T004 (registers both routers)
- T006 after T002 (context uses the types)
- T007, T008 in parallel after T006 (different files)

### Within US1 (Phase 3)

- T009, T010, T012, T013 in parallel (different files, all depend on Foundational)
- T011 after T009, T010 (NetWorthPage renders AssetList and must handle AssetModal)

### Within US2 (Phase 4)

- T014, T015 in parallel (different files)
- T016 after T014, T015 (NetWorthPage update needs both components available)

---

## Parallel Execution Examples

### Foundational phase (after T002)

```
T003 src/server/routes/assets.ts
T004 src/server/routes/liabilities.ts
T006 src/context/NetWorthContext.tsx
```

### US1 phase

```
T009 src/components/net-worth/AssetList.tsx
T010 src/components/net-worth/AssetModal.tsx
T012 src/components/net-worth/NetWorthPage.css
T013 src/components/net-worth/NetWorthModal.css
```

### US2 phase (can run in parallel with US1 if starting from Foundational)

```
T014 src/components/net-worth/LiabilityList.tsx
T015 src/components/net-worth/LiabilityModal.tsx
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002–T008)
3. Complete Phase 3: US1 (T009–T013)
4. **Stop and validate**: navigate to `/net-worth`, add/edit/delete an asset, confirm total updates
5. Ship if needed

### Incremental Delivery

1. Setup + Foundational → backend live, route registered, nav entry visible
2. Add US1 → assets CRUD working → validate independently → demo-ready MVP
3. Add US2 → liabilities CRUD working → two-column layout complete
4. Add US3 → summary bar with colour-coded net worth → feature complete
5. Polish → typecheck + lint + tests pass → open PR

---

## Notes

- All `value` fields from the API are `string` — always call `parseFloat(item.value)` before arithmetic
- `updatedAt: new Date()` must appear in every PATCH handler's `.set({})` — no DB trigger
- Ownership scope: every DB query uses `and(eq(table.id, id), eq(table.userId, userId))`; 404 is returned for missing OR cross-user records (do not distinguish)
- Modal CSS classes can be shared between `AssetModal` and `LiabilityModal` via `NetWorthModal.css`
- The `linkedAccountId` dropdown in both modals reads from `useAccount().accounts` — users only see their own accounts
- [P] tasks touch different files and have no blocking inter-dependencies within the same phase
