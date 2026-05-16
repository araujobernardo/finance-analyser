# Tasks: Net Worth Dashboard & History Snapshots

**Input**: Design documents from `/specs/021-net-worth-dashboard-history/`  
**Branch**: `021-net-worth-dashboard-history`  
**Date**: 2026-05-16

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: DB schema, migration, shared type, and route scaffold that MUST exist before any user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 Add `netWorthSnapshots` table to `src/db/schema.ts` — import `uniqueIndex` from `drizzle-orm/pg-core`, define the table with columns `id` (uuid PK), `userId` (uuid FK → users.id CASCADE DELETE), `totalAssets` (numeric 15,2), `totalLiabilities` (numeric 15,2), `netWorth` (numeric 15,2), `snapshotDate` (date), `createdAt` (timestamptz defaultNow); add `uniqueIndex("net_worth_snapshots_user_id_date_uniq").on(table.userId, table.snapshotDate)`; export `NetWorthSnapshot` and `NewNetWorthSnapshot` inferred types
- [ ] T002 Write migration `src/db/migrations/0004_net_worth_snapshots.sql` — `CREATE TABLE IF NOT EXISTS "net_worth_snapshots"` with all columns matching T001, plus `CREATE UNIQUE INDEX "net_worth_snapshots_user_id_date_uniq" ON "net_worth_snapshots" ("user_id", "snapshot_date")`
- [ ] T003 [P] Add `ApiSnapshot` interface to `src/types/api.ts` — fields: `id: string`, `userId: string`, `totalAssets: string`, `totalLiabilities: string`, `netWorth: string`, `snapshotDate: string`, `createdAt: string` (all numerics are strings from postgres-js)
- [ ] T004 Create `src/server/routes/netWorth.ts` — export a named `netWorthRouter` (Express Router), apply `authenticateToken` middleware to all routes on the router, leave GET and POST handler stubs returning 501 (filled in US2/US3 phases)
- [ ] T005 Register `netWorthRouter` in `src/server/index.ts` — import `netWorthRouter` from `./routes/netWorth.ts`, add `app.use("/api/net-worth", netWorthRouter)` after the liabilities router line

**Checkpoint**: DB table defined, migration file ready, type exported, route registered — foundation complete.

---

## Phase 2: User Story 1 — Net Worth Dashboard at a Glance (Priority: P1) 🎯 MVP

**Goal**: Add a visual category breakdown of assets and liabilities by type to the existing Net Worth page. The summary bar (total assets, total liabilities, net worth) already exists from FA-NW-002; this phase adds the "visual composition" layer.

**Independent Test**: Navigate to the Net Worth page with assets and liabilities of multiple types entered. Confirm that each category is shown as a distinct visual segment (not a list of numbers), and that zero-data states display gracefully.

- [ ] T006 [US1] Create `src/components/net-worth/NetWorthBreakdownChart.tsx` — accepts props `assets: ApiAsset[]` and `liabilities: ApiLiability[]`; groups assets by `type` and liabilities by `type` using `reduce`; renders two Recharts `PieChart` components side by side (one for assets, one for liabilities) inside `ResponsiveContainer`; each pie uses `Cell` components with colours from `src/constants/colors.ts`; renders an empty-state `<p>` when both arrays are empty; add `data-testid="nw-breakdown-chart"`
- [ ] T007 [US1] Add breakdown chart section to `src/pages/NetWorthPage.tsx` — import `NetWorthBreakdownChart`; add a `<section className="nw-breakdown" data-testid="nw-breakdown">` between the summary bar and the two-column grid; render `<NetWorthBreakdownChart assets={assets} liabilities={liabilities} />` inside it; guard with `!isLoading`
- [ ] T008 [US1] Add `nw-breakdown` CSS to `src/components/net-worth/NetWorthPage.css` — layout styles for the breakdown section (heading, two-column pie container, responsive behaviour)

**Checkpoint**: The Net Worth page shows a visual category breakdown. Independently testable with no snapshot data needed.

---

## Phase 3: User Story 2 — Net Worth History Chart (Priority: P2)

**Goal**: Display a Recharts `LineChart` on the Net Worth page showing net worth over time, fed by the GET endpoint. Handles 0, 1, and many-snapshot states gracefully.

**Independent Test**: Seed the DB with several `net_worth_snapshots` rows for the authenticated user. Navigate to the Net Worth page. Confirm the line chart renders with correct data points, x-axis shows month labels, y-axis shows NZD values, and tooltip appears on hover. Confirm the empty-state message shows when no snapshots exist.

- [ ] T009 [US2] Implement GET `/api/net-worth/snapshots` handler in `src/server/routes/netWorth.ts` — replace the 501 stub; query `netWorthSnapshots` with Drizzle: `where(and(eq(userId), gte(snapshotDate, 24-months-ago)))`, `orderBy(asc(snapshotDate))`; return the array as JSON; use the same auth/DB pattern as `src/server/routes/assets.ts`
- [ ] T010 [P] [US2] Create `src/components/net-worth/NetWorthHistoryChart.tsx` — accepts `snapshots: ApiSnapshot[]`; if `snapshots.length < 2` renders `<p data-testid="nw-history-empty">"Your net worth history will appear here after a few visits."</p>`; otherwise renders `<ResponsiveContainer width="100%" height={280}><LineChart data={...}>` with `XAxis dataKey="snapshotDate"` and `tickFormatter` showing `MMM YY`, `YAxis tickFormatter` using abbreviated NZD format, `<Line dataKey="netWorth" type="monotone">`, `<Tooltip>` showing full date and formatted net worth; parse `netWorth` values with `parseFloat` before passing to chart data; add `data-testid="nw-history-chart"`
- [ ] T011 [US2] Add snapshot fetch + loading state + history chart to `src/pages/NetWorthPage.tsx` — add `useState<ApiSnapshot[]>([])` and `useState<boolean>(true)` (snapshotsLoading); add `useEffect` that calls `apiFetch('/api/net-worth/snapshots')`, sets snapshots, and clears loading; render `<SkeletonCard />` while loading, `<NetWorthHistoryChart snapshots={snapshots} />` when loaded; add the history section below the two-column grid with `data-testid="nw-history-section"`

**Checkpoint**: History chart renders correctly for seeded data. Empty state shown on first visit. Independently testable without the snapshot POST being wired up.

---

## Phase 4: User Story 3 — Automatic Daily Snapshot (Priority: P3)

**Goal**: On every Net Worth page mount, silently POST current totals to the server. The server upserts one row per day. Multiple visits on the same day leave the snapshot count unchanged.

**Independent Test**: Visit the Net Worth page. Query `SELECT COUNT(*) FROM net_worth_snapshots WHERE user_id = '...' AND snapshot_date = CURRENT_DATE`. Confirm count is 1. Refresh the page multiple times. Confirm count remains 1. Visit the next day. Confirm count becomes 2.

- [ ] T012 [US3] Implement POST `/api/net-worth/snapshots` handler in `src/server/routes/netWorth.ts` — replace the 501 stub; validate body has `totalAssets` and `totalLiabilities` as finite numbers (return 400 if invalid); compute `netWorth = totalAssets - totalLiabilities` and `snapshotDate = new Date().toISOString().split('T')[0]`; upsert using `db.insert(netWorthSnapshots).values({...}).onConflictDoUpdate({ target: [netWorthSnapshots.userId, netWorthSnapshots.snapshotDate], set: { totalAssets, totalLiabilities, netWorth } }).returning()`; return the upserted row as JSON with status 200
- [ ] T013 [US3] Add fire-and-forget snapshot POST to `src/pages/NetWorthPage.tsx` — add `useEffect(() => { if (!isLoading) { apiFetch('/api/net-worth/snapshots', { method: 'POST', body: JSON.stringify({ totalAssets, totalLiabilities }) }).catch(() => {}); } }, [isLoading])` — this must NOT be awaited and must NOT block the history GET or any UI render

**Checkpoint**: Page mount triggers exactly one DB write per day. Snapshot count stays at 1 on repeat visits. History chart gains a new point on subsequent days.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: `data-testid` completeness for E2E coverage, visual polish, and final verification.

- [ ] T014 [P] Audit all new UI elements across `src/pages/NetWorthPage.tsx`, `src/components/net-worth/NetWorthBreakdownChart.tsx`, and `src/components/net-worth/NetWorthHistoryChart.tsx` for `data-testid` attribute coverage — every interactable or verifiable element must have one per the project's E2E DoD requirement
- [ ] T015 [P] Run `npm run build` and `npm run typecheck` (or equivalent) and fix any TypeScript errors introduced by the new schema types, route file, and component props

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on T003 (`ApiSnapshot` not needed for US1, but T001–T005 should be complete as a foundation checkpoint)
- **US2 (Phase 3)**: Depends on T001, T002, T003, T004, T005
- **US3 (Phase 4)**: Depends on T001, T002, T004, T005
- **Polish (Phase 5)**: Depends on all user story phases

### User Story Dependencies

- **US1 (P1)**: Independent — needs only existing `ApiAsset`/`ApiLiability` types and `NetWorthContext`
- **US2 (P2)**: Depends on T003 (ApiSnapshot type), T004/T005 (GET route). Can be tested by seeding DB without US3
- **US3 (P3)**: Depends on T001/T002 (DB schema), T004/T005 (POST route). Can be tested independently of US2

### Within Each Phase

- T001 → T002 (migration must match schema definition)
- T003 is parallel to T001/T002 (different file)
- T004 → T005 (router must exist before registration)
- T006, T007, T008 are sequential (component → page integration → styles)
- T009 can run parallel to T010 (different files); T011 depends on both
- T012 is parallel to T010/T011 (different concern in same route file, but edit the same file — do sequentially in practice); T013 depends on T012 being stubbed
- T014, T015 are parallel to each other

---

## Parallel Opportunities

```text
# Phase 1 — run in parallel after T001:
T002  Write migration SQL
T003  Add ApiSnapshot to src/types/api.ts

# Phase 3 — run in parallel:
T009  GET handler in src/server/routes/netWorth.ts
T010  NetWorthHistoryChart component in src/components/net-worth/

# Phase 5 — run in parallel:
T014  data-testid audit
T015  Type-check and build verification
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Complete Phase 1: Foundational
2. Complete Phase 2: US1 (breakdown chart)
3. **STOP and VALIDATE**: Net Worth page shows visual category breakdown
4. Deploy/demo — delivers immediate value with no snapshot infra needed

### Incremental Delivery

1. Phase 1 → foundation ready
2. Phase 2 (US1) → breakdown chart live → validate → demo
3. Phase 3 (US2) → history chart live → validate → demo (seed data to test)
4. Phase 4 (US3) → snapshot recording live → validate by visiting page on two different days
5. Phase 5 → polish and E2E attributes

---

## Notes

- `[P]` marks tasks that touch different files and can be parallelised
- `[US1/2/3]` maps each task to its user story for traceability
- The snapshot POST (T013) is fire-and-forget — never `await` it and never show the user an error if it fails
- All numeric fields from `ApiSnapshot` must be parsed with `parseFloat()` before use in chart data or arithmetic
- The migration file must be named exactly `0004_net_worth_snapshots.sql` to fit the existing Drizzle journal sequence
