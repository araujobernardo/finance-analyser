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

---

## #885: Account Connections card in SettingsPage

**Chosen option:** Option C — compact table with column headers
**Date:** 2026-06-01
**Issue:** #885 Settings: Add account management card — Finance Analyser accounts with linked Akahu account

### Decision

Option C was selected by the product owner. It provides an at-a-glance read-only status overview without any editing affordances in this card (editing links remains in the Bank Connection card above).

### Layout & Structure

A new card inserted in `SettingsPage.tsx` between `<BankConnectionSection />` and `<DangerZoneSection />`. The card is only rendered when `useAccount().accounts.length > 0`.

**Card title:** "Account Connections"

**Card subtitle:** "Your Finance Analyser accounts and their linked bank accounts."

**Table columns (in order):**

| Column       | Content                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| Your account | Finance Analyser `account.nickname` + `account.accountType` in muted text below                                     |
| Bank account | Linked `akahuAccountName` if a link exists, or em-dash ("—")                                                        |
| Balance      | `lastBalance` formatted as `NZD X,XXX.XX`, or "—" if null                                                           |
| Status       | Pill badge: "Linked" (green tones) when `financeAccountId` matches, "Not linked" (muted/border) when no link exists |

**Summary row:** A single row spanning all columns at the bottom of the table body, rendered as a `<tfoot>` element:

> "X of Y accounts linked — link accounts in Bank Connection above"

Where X = count of Finance Analyser accounts that have at least one matching entry in `accountLinks` (i.e. `accountLinks.some(l => l.financeAccountId === account.id)`), and Y = total Finance Analyser accounts.

**Not-connected state:** When `useBankContext().connection === null` (no Akahu connection), all rows show "Not linked" with "—" for Bank account and Balance. The card still renders if the user has Finance Analyser accounts — it simply shows the not-linked state for all rows.

### Component Decisions

- Export as `AccountConnectionsSection` from `SettingsPage.tsx` — co-located with the other section components in that file
- Uses `useAccount()` for the Finance Analyser accounts list
- Uses `useBankContext()` for the `accountLinks` array (already available on this page)
- No new state required — purely derived from context data
- Condition to hide: `accounts.length === 0` (do not render the card)

### CSS

**No new CSS classes.** Use only the existing classes already defined in `SettingsPage.css`:

- Card wrapper: `card settings-section` (matches every other section card)
- Title: `settings-section-title`
- Subtitle: `settings-section-sub`
- Table: `settings-bank-mapping-table` (already defined — same `border-collapse`, `font-size: 12px` table used by `BankConnectionSection`)
- Table header: existing `th` styles in `.settings-bank-mapping-table th`
- Table row: existing `td` styles in `.settings-bank-mapping-row td`
- Table row class: `settings-bank-mapping-row`
- "Linked" badge: `settings-bank-badge settings-bank-badge--active` (green pill — already defined)
- "Not linked" badge: `settings-bank-badge settings-bank-badge--disconnected` (muted pill — already defined)
- Summary tfoot row: use `settings-section-sub` for the text inside a `<td>` spanning all columns (`colSpan={4}`)

### Interaction Model

- Read-only — no interactive controls in this card
- No `onClick`, no dropdowns, no editing affordances

### Copy

- Card title: `"Account Connections"`
- Card subtitle: `"Your Finance Analyser accounts and their linked bank accounts."`
- Linked badge label: `"Linked"`
- Not linked badge label: `"Not linked"`
- Summary: `"{X} of {Y} account{Y !== 1 ? "s" : ""} linked — link accounts in Bank Connection above"`
- Balance not available: `"—"`
- Bank account not linked: `"—"`

### Constraints

- Do not introduce new CSS classes or CSS custom properties — use only what is already in `SettingsPage.css` and the global stylesheet
- Do not use any hardcoded hex colours
- Card must match the visual style of the adjacent cards exactly (same `card settings-section` wrapper, same typography scale)
- `data-testid` attributes required on: the section wrapper, each account row, the linked badge, the not-linked badge, and the summary row
- `tsc --noEmit` must pass with zero errors after implementation
