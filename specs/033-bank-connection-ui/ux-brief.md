# UX Brief — FA-BANK-003: Bank Connection UI

---

## T002: Add Bank Connection nav item to Sidebar

**Chosen option:** Inline Nav Entry (spec-constrained)
**Date:** 2026-06-01
**Design decision:** Minimal — spec provides exact implementation. Icon adjusted from `◈` (already used by Net Worth) to `⊕` (unused, conveys connection/addition).

## Layout & Structure

Add one entry to the existing `NAV` array in `src/components/Sidebar.tsx`, positioned after the Settings entry. The Sidebar layout is unchanged — no new sections, no grouping, no visual separators.

## Component Decisions

- Use the same `{ path, icon, label }` shape as all other NAV entries
- Icon: `⊕` — unused in the current NAV array; the `◈` in the issue body conflicts with Net Worth
- Label: `"Bank Connection"` — matches issue specification exactly
- Path: `"/settings/bank"` — matches route registered in T005

## Interaction Model

- NavLink active state is inherited from existing Sidebar CSS (`.sidebar-nav-link--active` class)
- Hover and focus states are identical to all other nav items — no new CSS needed
- No new state, no new hooks — purely a data change in the NAV constant

## Copy

- Label: `Bank Connection`

## Constraints

- Do not add any new CSS — the existing nav item styles cover this completely
- Do not use `◈` — it is already used by the Net Worth nav entry
- `data-testid` attribute on the new nav link is required by DoD for interactive elements

## Impeccable Commands for Developer

After implementation, run:

- `npx impeccable detect src/components/Sidebar.tsx --format summary` — verify no new design regressions

---

## T004: Create BankConnectionPage with connect/disconnect UI

**Chosen option:** Single-page split (spec-constrained)
**Date:** 2026-06-01
**Design decision:** Spec provides exact component structure. Visual styling uses existing app design tokens.

### Layout & Structure

Two mutually exclusive states in a single page (`src/pages/BankConnectionPage.tsx`):

**When disconnected** — show `ConnectForm`:

- Page title: "Bank Connection"
- Two controlled text inputs: "Akahu User ID" and "User Token"
- Help text below inputs: "Get these from my.akahu.nz/developers"
- Privacy note (always visible): "Your bank credentials are never stored. Only your Akahu tokens are saved, and you can revoke access at any time from my.akahu.nz."
- Submit button (disabled while `isLoading`)

**When connected** — show `ConnectionStatusCard`:

- Display `connection.connectedAt` as a readable date
- Display `connection.lastSyncedAt` or "Never synced"
- Disconnect button (triggers `window.confirm` before calling `disconnect()`)
- Loading state while `isLoading`

### Component Decisions

- Use `var(--card)` background and `var(--shadow-sm)` for card containers (matches existing Settings pattern)
- Use existing button classes: `btn btn-primary` for submit, `btn btn-danger` for Disconnect
- Text inputs: use existing `.input` class from the app's design system
- Error display: inline error message above the form using `var(--red)` text color

### Interaction Model

- `error` from `useBankContext()` shown at the top of the page if set
- `ConnectForm` inputs are controlled (local state); `onSubmit` calls `connect(akahuUserId, userToken)`
- Disconnect button: `window.confirm(...)` guard before calling `disconnect()`
- Loading state: submit button disabled + cursor-not-allowed when `isLoading`

### Copy

- Page title: "Bank Connection"
- Help text: "Get these from my.akahu.nz/developers"
- Privacy note: "Your bank credentials are never stored. Only your Akahu tokens are saved, and you can revoke access at any time from my.akahu.nz."
- Disconnect confirm: "Disconnect your Akahu account? This will remove all account links."

### Constraints

- Do not use any hardcoded hex values — use CSS custom properties exclusively
- Privacy note must be visible without scrolling on a standard viewport
- No CSS file needed — use existing utility classes from the app

### Impeccable Commands for Developer

After implementation, run:

- `npx impeccable detect src/pages/BankConnectionPage.tsx --format summary` — verify no design regressions
