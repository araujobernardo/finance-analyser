# Research: Goals Creation and Management UI and API (FA-GOAL-002)

## Decision 1: Route file pattern

**Decision**: Create `src/server/routes/goals.ts` exporting `goalsRouter`, following the `assetsRouter` pattern exactly — `Router()`, `authenticateToken` middleware on every handler, `eq`/`and`/`asc` from `drizzle-orm`, Zod `safeParse`, `next(err)` for caught errors.

**Rationale**: Exact consistency with the existing assets/liabilities route files. Same import paths, same error response shape (`{ error: string }`), same `updatedAt: new Date()` in PATCH, same `returning()` to get the persisted row back.

**Alternatives considered**: A shared base router or middleware factory — rejected; the project does not use one and the four handlers are simple enough to repeat the pattern directly.

---

## Decision 2: Zod categoryName cross-field validation

**Decision**: Use `.refine()` twice on the PATCH/POST schemas:

1. If `type` is present and equals `spending_limit`, `categoryName` must not be null/undefined.
2. If `type` is present and does not equal `spending_limit`, `categoryName` must be null or absent.

For PATCH, both refines only fire when `type` appears in the payload — a PATCH sending only `{ status: 'achieved' }` must not fail the categoryName check.

**Rationale**: The spec explicitly requires enforcement at the Zod layer. The conditional guard (`!data.type || ...`) makes the PATCH schema safe for partial updates.

**Alternatives considered**: Enforce only in a separate DB-level CHECK constraint — rejected; the project enforces type-level rules at the app layer (matching existing `status`/`type` pattern from FA-GOAL-001 research).

---

## Decision 3: GoalsContext — optimistic update strategy

**Decision**: Follow `NetWorthContext` exactly:

- **add**: generate `tempId = "optimistic-" + crypto.randomUUID()`, optimistically insert, on success replace with server row, on failure filter out.
- **update**: snapshot previous item, optimistically apply numeric string conversion (`String(value)`), on success replace with server row, on failure restore snapshot.
- **remove**: snapshot item + index, optimistically filter out, on failure splice back at original index.

**Rationale**: NetWorthContext is the established pattern in the codebase. GoalsContext deviates only in the shape of the goal object (more fields). The cancellation token pattern (`let cancelled = false`) in `useEffect` is also carried over.

**Alternatives considered**: Server-first updates (no optimistic) — rejected; the existing pattern is optimistic throughout and the UX expectation is immediate response.

---

## Decision 4: Progress bar when currentAmount is null

**Decision**: Render a 0% bar with the note "Progress will update automatically" (per the user input spec). `percent = currentAmount != null ? Math.min(100, parseFloat(currentAmount) / parseFloat(targetAmount) * 100) : 0`. Cap at 100% to handle over-target cases gracefully; show a visual "over target" label if `percent === 100` but raw value exceeds target.

**Rationale**: The user input spec prescribes this exact copy. Over-target is spec-allowed (SC allows currentAmount > targetAmount).

**Alternatives considered**: Hide the progress bar when null — rejected; the spec requires a progress indicator on every goal card.

---

## Decision 5: Page routing and provider wrapping

**Decision**: Add `GoalsProvider` wrapping only in the `/goals` route in `App.tsx`, identical to how `NetWorthProvider` wraps `NetWorthPage`. Add the entry to the `NAV` constant in `Sidebar.tsx`.

**Rationale**: Route-scoped providers avoid loading goal data until the user navigates to the Goals page, consistent with the NetWorth pattern. Sidebar NAV is a simple constant array — adding an entry is the established extension point.

**Alternatives considered**: Global provider at app root — rejected; goals data is only needed on the Goals page; loading it globally wastes a network call on every page.

---

## Decision 6: Shared modal CSS

**Decision**: Create `src/components/goals/GoalModal.css` as a new file; do not reuse `NetWorthModal.css` by class name. The goals modal has an extra Category field that conditionally shows/hides, which may need unique selectors.

**Rationale**: Avoids coupling the goals modal to net-worth modal CSS. If the designs diverge the change is isolated.

**Alternatives considered**: Import and extend `NetWorthModal.css` — acceptable, but creates an implicit coupling that the developer can decide at implementation time.
