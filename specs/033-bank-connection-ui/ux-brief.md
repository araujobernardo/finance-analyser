# UX Brief — FA-BANK-003 T002: Add Bank Connection nav item to Sidebar

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
