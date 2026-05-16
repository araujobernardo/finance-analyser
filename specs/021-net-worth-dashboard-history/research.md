# Research: Net Worth Dashboard & History Snapshots

**Phase**: 0 — Pre-design research  
**Branch**: `021-net-worth-dashboard-history`  
**Date**: 2026-05-16

All decisions below are fully resolved. No NEEDS CLARIFICATION items remain.

---

## Decision 1: Upsert strategy for once-per-day constraint

**Decision**: Use Drizzle `onConflictDoUpdate` targeting the `(userId, snapshotDate)` unique constraint. The POST body carries `{ totalAssets, totalLiabilities }` and the server computes `netWorth` and `snapshotDate` (UTC date string `YYYY-MM-DD`).

**Rationale**: The unique constraint is enforced at the DB level — no race condition possible. If the same user posts twice on the same day the row is updated (not duplicated). This is exactly what the user specified, and it matches the Drizzle pattern already used in `assets.ts` / `liabilities.ts`.

**Alternatives considered**:

- Check-then-insert: two round trips, subject to race condition — rejected.
- Client-side deduplication (localStorage flag): fragile across devices/sessions — rejected; spec requires server-side enforcement.

---

## Decision 2: Date handling — "today"

**Decision**: `snapshotDate` is computed server-side as `new Date().toISOString().split('T')[0]` (UTC date string, e.g. `2026-05-16`). The Drizzle column type is `date`, which stores as `YYYY-MM-DD`.

**Rationale**: Server clock prevents client-clock spoofing. UTC is consistent regardless of user timezone. The `date` Drizzle column returns a string from postgres-js, which matches the `snapshotDate: string` field in `ApiSnapshot`.

**Alternatives considered**:

- Use client's local date: inconsistent across timezones, spoofable — rejected. (Spec says server-computed.)
- Use a full timestamp and truncate on query: more complex, no benefit — rejected.

---

## Decision 3: History window on GET

**Decision**: `GET /api/net-worth/snapshots` returns up to 24 months of snapshots, ordered by `snapshotDate ASC`. The 24-month cutoff is computed server-side: `WHERE snapshot_date >= now() - interval '24 months'`. No pagination — maximum ~730 rows, trivial for Recharts.

**Rationale**: User specified "at least 12 months"; 24 months gives meaningful long-term trend without unbounded growth. The spec explicitly says no auto-purge within the window. Recharts handles ~730 points without performance issues.

**Alternatives considered**:

- Return all history: unbounded over many years — rejected in favour of 24-month cap (user specified "last 24 months maximum").
- Paginate: unnecessary complexity for this data volume — rejected.

---

## Decision 4: Recharts LineChart configuration

**Decision**: Use `<LineChart>` from `recharts` (already installed at ^3.8.1) with:

- `<XAxis dataKey="snapshotDate">` — raw date strings, formatted with a `tickFormatter` to show `MMM YY` (e.g. `May 26`)
- `<YAxis tickFormatter>` — NZD currency format, abbreviated for axis labels
- `<Line dataKey="netWorth" type="monotone">` — single line, dot on hover
- `<Tooltip>` — shows full date + formatted net worth
- `<ResponsiveContainer width="100%" height={280}>`

**Rationale**: Recharts is already in the project. `LineChart` with `ResponsiveContainer` is the idiomatic pattern used in existing chart components (`MonthlyTrendChart`, `CategoryTrendChart`). No new dependency required.

**Alternatives considered**:

- Chart.js: not installed, requires additional dependency — rejected.
- D3: high complexity, overkill for a single-line chart — rejected.

---

## Decision 5: Empty and single-point states

**Decision**:

- 0 snapshots (first visit): show message `"Your net worth history will appear here after a few visits."` — no chart rendered.
- 1 snapshot: same message (a single point has no trend to show).
- ≥ 2 snapshots: render the chart.

**Rationale**: Recharts `LineChart` with a single data point renders a dot with no line, which looks broken. The spec requires graceful empty-state handling for 0 and sparse data. The threshold of ≥ 2 is the minimum needed to draw a meaningful line.

**Alternatives considered**:

- Show chart with 1 point: renders oddly in Recharts — rejected.
- Use different threshold (e.g. ≥ 3): no justification in spec — rejected in favour of minimal threshold.

---

## Decision 6: Snapshot failure isolation

**Decision**: The snapshot POST is "fire and forget" — called with `.catch(() => {})` (no `await`). If it fails the page continues to render current figures and history from the GET.

**Rationale**: Spec explicitly requires: "Snapshot recording failure MUST NOT prevent the Net Worth page from loading." The GET for history is a separate call and is independent of the POST result.

**Alternatives considered**:

- Await POST before GET: blocks history load on snapshot write — rejected.
- Show toast on POST failure: adds noise for a background operation the user did not trigger — rejected.

---

## Decision 7: Where to store snapshots state (frontend)

**Decision**: Local state in `NetWorthPage.tsx` via `useState<ApiSnapshot[]>`. No changes to `NetWorthContext` — that context owns assets/liabilities CRUD, and snapshot history is read-only from the page's perspective.

**Rationale**: Snapshot history is only needed on the Net Worth page. Adding it to context would increase context complexity for no benefit. Mirrors the existing pattern where page-specific data lives in local state.

**Alternatives considered**:

- Add snapshots to `NetWorthContext`: unnecessary coupling — rejected.
- New `SnapshotContext`: overkill for page-local data — rejected.
