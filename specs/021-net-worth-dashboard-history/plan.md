# Implementation Plan: Net Worth Dashboard & History Snapshots

**Branch**: `021-net-worth-dashboard-history` | **Date**: 2026-05-16 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/021-net-worth-dashboard-history/spec.md`

## Summary

Extend the existing Net Worth page (built in FA-NW-002) with a daily snapshot system and history chart. On every page mount the frontend posts current totals to a new `/api/net-worth/snapshots` endpoint; the server upserts one row per day using a DB-level unique constraint. A `GET` endpoint returns up to 24 months of snapshots ordered by date, which are rendered as a Recharts `LineChart` below the existing summary bar. Empty and single-point states are handled gracefully with a message rather than a broken chart.

## Technical Context

**Language/Version**: TypeScript 5.x — React 19 (frontend) + Node.js / Express 5.x (backend)  
**Primary Dependencies**: Drizzle ORM 0.45.x, postgres-js 3.x, Recharts 3.8.x, Zod 4.x, JWT auth  
**Storage**: PostgreSQL — new `net_worth_snapshots` table (migration 0004)  
**Testing**: Vitest (unit/component), Playwright (E2E)  
**Target Platform**: Web browser (SPA) + Node.js server  
**Project Type**: Fullstack web application — React SPA + Express REST API  
**Performance Goals**: Standard interactive web app; chart must render without perceptible lag for ≤24 months of daily data (~730 rows)  
**Constraints**: Single-user app; at most one snapshot per calendar day (UTC); 24-month window on GET; snapshot failure must not block page load  
**Scale/Scope**: Single authenticated user; small data volume

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Rule                                 | Check                                                             | Status  |
| ------------------------------------ | ----------------------------------------------------------------- | ------- |
| GR-1: No silent product assumptions  | Spec and user input fully specify all behaviour; no gaps          | ✅ PASS |
| GR-2: No credentials/secrets exposed | New route reads userId from JWT; no secrets in code               | ✅ PASS |
| GR-3: No localStorage schema changes | All persistence is server-side PostgreSQL; localStorage untouched | ✅ PASS |
| GR-4: DoR before implementation      | This plan is the DoR artifact; tasks follow                       | ✅ PASS |
| GR-5: DoD before merging             | QA enforces DoD at PR time                                        | ✅ PASS |
| GR-6: When in doubt, do less and ask | Spec is complete; no ambiguity requiring escalation               | ✅ PASS |

No violations. Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/021-net-worth-dashboard-history/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── api-net-worth-snapshots.md   ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── db/
│   ├── schema.ts                              ← ADD netWorthSnapshots table + exports
│   └── migrations/
│       └── 0004_net_worth_snapshots.sql       ← NEW migration file
│
├── server/
│   ├── index.ts                               ← REGISTER /api/net-worth router
│   └── routes/
│       └── netWorth.ts                        ← NEW route file (GET + POST /api/net-worth/snapshots)
│
├── pages/
│   └── NetWorthPage.tsx                       ← UPDATE (snapshot POST on mount + chart section)
│
├── components/
│   └── net-worth/
│       └── NetWorthHistoryChart.tsx            ← NEW chart component (Recharts LineChart)
│
└── types/
    └── api.ts                                 ← ADD ApiSnapshot interface
```

**Structure Decision**: Single fullstack project (no mono-repo split). Frontend lives under `src/`, backend under `src/server/`. This matches the existing layout exactly — new files follow the same patterns as `src/server/routes/assets.ts` (route) and `src/components/net-worth/AssetList.tsx` (component).
