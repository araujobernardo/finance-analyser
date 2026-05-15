# Research: Asset and Liability Management

## Summary

All decisions were resolved from the user's explicit technical input and by reading the existing codebase. No external research was required.

---

## Decision 1: DB Schema

**Decision**: Reuse the `assets` and `liabilities` tables already defined in `src/db/schema.ts` (FA-NW-001). No schema additions needed.

**Fields confirmed**:

- `id` uuid PK, `userId` uuid FK, `name` varchar(100), `type` varchar(50), `value` numeric(15,2), `linkedAccountId` uuid FK nullable, `createdAt` timestamp, `updatedAt` timestamp

**`updatedAt` policy**: App sets `updatedAt: new Date()` manually in every PATCH handler — there is no DB trigger (FA-NW-001 decision). This must be in every `db.update(...).set({ ..., updatedAt: new Date() })` call.

**Rationale**: Schema is already migration-ready; re-defining it would create drift.

**Action required before implementation**: Confirm migration for assets/liabilities tables has been run against Supabase (`npm run db:migrate`). If not, run it.

---

## Decision 2: Route Structure and Auth Pattern

**Decision**: Follow `src/server/routes/accounts.ts` exactly.

- `authenticateToken` middleware on every handler
- `(res.locals as AuthLocals).user.userId` to scope queries
- Zod `.safeParse()` on POST and PATCH bodies; return `400` with first issue message on failure
- `and(eq(table.id, id), eq(table.userId, userId))` in WHERE for ownership — missing/cross-user records both return `404` (do not distinguish)
- Hard delete with `.returning()` and `404` if empty

**Rationale**: Consistent with all existing routes; satisfies the constitution's data-isolation requirement.

---

## Decision 3: Type Enums

**Asset types** (as stored in DB — lowercase with underscores):
`property | investments | kiwisaver | savings | vehicle | other`

**Liability types**:
`mortgage | personal_loan | car_loan | student_loan | credit_card | other`

**Display labels** (frontend):
| Value | Label |
|---|---|
| property | Property |
| investments | Investments |
| kiwisaver | KiwiSaver |
| savings | Savings |
| vehicle | Vehicle |
| other | Other |
| mortgage | Mortgage |
| personal_loan | Personal Loan |
| car_loan | Car Loan |
| student_loan | Student Loan |
| credit_card | Credit Card |
| other | Other |

---

## Decision 4: Frontend State Management

**Decision**: New `NetWorthContext` following the `AccountContext` pattern.

- `useState` for `assets` and `liabilities` arrays
- `useEffect` on mount to fetch both lists in parallel via `Promise.all`
- Optimistic updates: update local state immediately, rollback on API error + show toast
- `isLoading` boolean gates the skeleton display
- `useApi()` hook for all fetches (handles auth header and 401 logout)

**Rationale**: Consistent with the existing data layer; no new state management libraries needed.

---

## Decision 5: Currency Formatting

**Decision**: Use `Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' })` matching the existing pattern in the codebase.

**Rationale**: Consistent with the existing NZD display; sidebar footer already shows "ASB Bank · NZD".

---

## Decision 6: Routing and Navigation

**Decision**:

- New route `/net-worth` added to the `appShell` routes in `App.tsx` as a `<ProtectedRoute>` (same pattern as `/dashboard`, `/transactions`, etc.)
- `NetWorthPage` wrapped by `NetWorthProvider` directly inside the route element
- Sidebar NAV array gets a new entry: `{ path: "/net-worth", icon: "◈", label: "Net Worth" }` (icon TBD by implementor — existing icons show the style)

**Rationale**: Follows established App.tsx routing pattern; no new router or layout needed.

---

## Decision 7: Modal and Form Pattern

**Decision**: Follow `AddAccountModal.tsx` / `AccountModal.css` pattern.

- Backdrop div with `role="dialog"` and `aria-modal="true"`
- Panel div with title, fields (label + input/select), error span, action buttons
- `isSubmitting` boolean to disable Save during inflight request
- On success: call `onClose()` (parent controls modal visibility via `useState`)
- On error: show toast (via `useToast`) and leave modal open

**Rationale**: Consistent UI; existing CSS classes reusable with a new `NetWorthModal.css`.

---

## Decision 8: Net Worth Summary Bar

**Decision**: Summary bar rendered at the top of `NetWorthPage`, outside the two-column layout. Derived entirely from context state — no extra API call.

```
Total Assets: $X,XXX  |  Total Liabilities: $X,XXX  |  Net Worth: $X,XXX
```

- Net worth positive → green (`var(--accent)` or existing success colour)
- Net worth negative → red (`var(--red)` or existing error colour)
- Computed client-side: `sum(assets[*].value) - sum(liabilities[*].value)`

**Rationale**: Data is already in context; server-side aggregation would be an extra round-trip for no benefit.
