# Implementation Plan: FA-NW-002 — Asset and Liability Management

**Branch**: `019-asset-liability-management` | **Date**: 2026-05-15 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `specs/019-asset-liability-management/spec.md`

## Summary

Add full CRUD management for assets and liabilities — two new Express route files (`/api/assets`, `/api/liabilities`), a `NetWorthContext` with optimistic updates, a `/net-worth` page with a two-column layout (assets left, liabilities right), a summary bar showing total assets / total liabilities / net worth, and modal forms for add and edit operations. The DB schema (`assets` and `liabilities` tables) already exists from FA-NW-001 — no new migrations are needed.

## Technical Context

**Language/Version**: TypeScript 5 / Node 20+ / React 18  
**Primary Dependencies**: Express 4, Drizzle ORM, Zod (all existing), React Context API  
**Storage**: PostgreSQL via Supabase — `assets` and `liabilities` tables (already migrated)  
**Testing**: Vitest + React Testing Library (unit/integration); Playwright available locally  
**Target Platform**: Web — Vite + React frontend, Express API on Vercel serverless  
**Project Type**: Web application — existing monorepo (frontend `src/`, backend `src/server/`)  
**Performance Goals**: Add/edit/delete reflects in UI in under 2 seconds (SC-001)  
**Constraints**: All data scoped to authenticated user; negative values rejected (FR-014, FR-015)  
**Scale/Scope**: Single-user app; responsive from 375 px to 1440 px (SC-003)

## Constitution Check

- No new authentication flows — existing `authenticateToken` middleware used throughout
- No schema changes — `assets` and `liabilities` tables already exist from FA-NW-001
- No new third-party services or secrets
- Data isolation enforced by `and(eq(table.id, id), eq(table.userId, userId))` in every mutating query
- Negative value validation at API boundary (Zod `z.number().min(0)`) — not at DB level
- Responsive layout required — two columns desktop, stacked mobile (SC-003)
- `updatedAt` set by app on every PATCH (`new Date()`) — no DB trigger exists

All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/019-asset-liability-management/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: 8 key decisions
├── data-model.md        # Phase 1: entities, fields, enums, validation
├── quickstart.md        # Phase 1: implementation reference
├── contracts/
│   ├── assets.md        # Phase 1: /api/assets endpoint contract
│   └── liabilities.md   # Phase 1: /api/liabilities endpoint contract
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── server/
│   ├── index.ts                          # Register assetsRouter + liabilitiesRouter
│   └── routes/
│       ├── assets.ts                     # NEW — GET/POST/PATCH/DELETE /api/assets
│       └── liabilities.ts               # NEW — GET/POST/PATCH/DELETE /api/liabilities
│
├── types/
│   └── api.ts                           # Add ApiAsset, ApiLiability interfaces
│
├── context/
│   └── NetWorthContext.tsx              # NEW — assets + liabilities state, optimistic CRUD
│
├── pages/
│   └── NetWorthPage.tsx                 # NEW — summary bar + two-column layout
│
├── components/
│   └── net-worth/
│       ├── AssetList.tsx                # NEW — assets column, grouped by type
│       ├── LiabilityList.tsx            # NEW — liabilities column, grouped by type
│       ├── AssetModal.tsx               # NEW — add/edit modal for assets
│       ├── LiabilityModal.tsx           # NEW — add/edit modal for liabilities
│       ├── NetWorthModal.css            # NEW — shared modal styles
│       └── NetWorthPage.css             # NEW — page + two-column layout styles
│
├── App.tsx                              # Add /net-worth ProtectedRoute
└── components/Sidebar.tsx              # Add Net Worth nav entry
```

## Implementation Phases

### Phase 1 — Backend routes

**T001** Create `src/server/routes/assets.ts`:

- `assetsRouter` with `authenticateToken` on every handler
- Zod schemas: `createAssetSchema` (name, type, value, linkedAccountId?), `updateAssetSchema` (all optional, min 1 field)
- `ASSET_TYPES` const: `["property", "investments", "kiwisaver", "savings", "vehicle", "other"]`
- `value`: `z.number().min(0)` — rejects negatives with 400
- GET: `db.select().from(assets).where(eq(assets.userId, userId)).orderBy(asc(assets.createdAt))` → `{ assets: rows }`
- POST: insert + `.returning()` → 201
- PATCH: `db.update(assets).set({ ...updates, updatedAt: new Date() }).where(and(...)).returning()` → 200 or 404
- DELETE: `db.delete(assets).where(and(...)).returning()` → 204 or 404

**T002** Create `src/server/routes/liabilities.ts` — identical structure to T001 with:

- `LIABILITY_TYPES`: `["mortgage", "personal_loan", "car_loan", "student_loan", "credit_card", "other"]`
- `liabilitiesRouter`, `liabilities` table, response key `"liabilities"`

**T003** Register both routers in `src/server/index.ts`:

```typescript
import { assetsRouter } from "./routes/assets.ts";
import { liabilitiesRouter } from "./routes/liabilities.ts";
app.use("/api/assets", assetsRouter);
app.use("/api/liabilities", liabilitiesRouter);
```

---

### Phase 2 — Frontend types and context

**T004** Add to `src/types/api.ts`:

```typescript
export interface ApiAsset {
  id: string;
  userId: string;
  name: string;
  type: string;
  value: string;
  linkedAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface ApiLiability {
  /* same shape */
}
```

**T005** Create `src/context/NetWorthContext.tsx`:

- `useState<ApiAsset[]>` and `useState<ApiLiability[]>`
- `isLoading` boolean; `useEffect` on mount → `Promise.all([apiFetch("/api/assets"), apiFetch("/api/liabilities")])`
- Expose: `assets`, `liabilities`, `isLoading`, `addAsset`, `updateAsset`, `removeAsset`, `addLiability`, `updateLiability`, `removeLiability`
- Optimistic updates following `AccountContext` pattern: temp record → replace on success → rollback + toast on failure
- `useNetWorth()` export hook

---

### Phase 3 — Page and layout

**T006** Create `src/pages/NetWorthPage.tsx`:

- Wrap in `NetWorthProvider` (or accept context from parent — follow whichever pattern App.tsx uses)
- Summary bar at top: `Total Assets | Total Liabilities | Net Worth`
  - Values from `sum(assets[*].value)` and `sum(liabilities[*].value)` — parsed from string via `parseFloat`
  - Net worth colour: `>= 0` → `var(--accent)`, `< 0` → `var(--red)`
- Two-column grid: `<AssetList />` left, `<LiabilityList />` right
- Loading skeletons while `isLoading` is true

**T007** Create `src/components/net-worth/AssetList.tsx`:

- Group assets by type using the `ASSET_TYPES` display order; skip empty groups
- Each row: name, type badge, NZD-formatted value, edit button, delete button (with confirmation)
- "Add asset" button at top of column opens `AssetModal`
- Empty state: prompt to add first asset

**T008** Create `src/components/net-worth/LiabilityList.tsx` — same pattern as T007 with `LIABILITY_TYPES`.

**T009** Create `src/components/net-worth/AssetModal.tsx`:

- Follows `AddAccountModal.tsx` pattern: backdrop `role="dialog"`, panel, label+input/select fields
- Fields: Name (text), Type (select), Value (number, min 0), Linked Account (select, optional — shows user's accounts from `AccountContext`)
- `isSubmitting` state disables Save button during inflight request
- On success: call `onClose()`; on error: `addToast(...)` and leave modal open
- Used for both add (no initial data) and edit (pre-fill with existing asset)

**T010** Create `src/components/net-worth/LiabilityModal.tsx` — same pattern as T009 with liability types.

**T011** Create `src/components/net-worth/NetWorthModal.css` and `src/components/net-worth/NetWorthPage.css`:

- Modal CSS: extend `AccountModal.css` patterns (backdrop, panel, form fields, buttons)
- Page CSS: two-column grid (`display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem`), stacks to single column below 768 px (`@media (max-width: 768px)`)

---

### Phase 4 — Routing and navigation

**T012** Update `src/App.tsx`:

```tsx
import { NetWorthProvider } from "./context/NetWorthContext";
import NetWorthPage from "./pages/NetWorthPage";

// Inside appShell Routes:
<Route
  path="/net-worth"
  element={
    <ProtectedRoute>
      <NetWorthProvider>
        <NetWorthPage />
      </NetWorthProvider>
    </ProtectedRoute>
  }
/>;
```

**T013** Update `src/components/Sidebar.tsx` — add to NAV array:

```typescript
{ path: "/net-worth", icon: "◈", label: "Net Worth" }
```

---

### Phase 5 — Verification

**T014** Manual smoke test:

- Navigate to `/net-worth` — page loads, empty state shown
- Add an asset — appears in correct type group, totals update
- Edit the asset — change reflects immediately
- Delete the asset — removed from list, totals update
- Repeat for liabilities
- Net worth summary shows correct arithmetic (positive = green, negative = red)
- Resize to 375 px width — columns stack, no horizontal scroll

**T015** Run existing test suite:

```bash
npm run typecheck
npm run lint
npm test
```

All must pass before opening PR.

## Complexity Tracking

No constitution violations. No complexity justification required.
