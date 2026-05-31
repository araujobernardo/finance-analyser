# UX Brief — #755 Remove Dashboard Filter Tabs (Option C)

## Decision

The user selected **Option C**: "All Accounts" doubles as the clickable section label. Individual account rows are indented beneath it. The sidebar becomes the single global account selector; dashboard filter tabs are removed entirely.

## Visual Design

### Section header — "All Accounts" row

The static "ACCOUNTS" section label is replaced by a clickable "All Accounts" row that acts as both label and selector.

- Layout: `display: flex; align-items: center; gap: 6px;`
- Padding: `5px 6px` with `margin-left: -6px` so the background reaches the sidebar gutter edge
- Border radius: `6px`
- Left border: `2px solid transparent` normally; `2px solid var(--accent)` when active
- Cursor: `pointer`

**Active state** (`activeAccountId === "all"`):

- Background: `color-mix(in srgb, var(--accent) 12%, transparent)`
- Border-left: `var(--accent)`
- Label colour: `var(--accent)`

**Inactive / hover state:**

- Hover background: `color-mix(in srgb, var(--accent) 6%, transparent)`
- Label colour: `var(--muted)` at rest

**Multi-colour dot** (left of label):

- `width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0`
- Background: `conic-gradient(#6C8EBF 0deg 120deg, #82B366 120deg 240deg, #D79B00 240deg 360deg)`
- Border: `1px solid var(--border)`
- Conveys "all accounts combined"

**Label text:**

- `"All Accounts"` (not all-caps like the old section label, but keep `font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase`)

**"+" add-account button** stays at the far right of this row (`flex-shrink: 0`); its `onClick` must `stopPropagation` so clicking "+" does not also trigger "All Accounts" selection.

### Individual account rows

- Left indent: `padding-left: 18px` (vs the 6px of the "All Accounts" header) to create visual hierarchy
- Same `margin-left: -6px` trick so the teal highlight fills the sidebar gutter edge
- Same active/hover colours as today (`sidebar-account-row--active`)
- Active account row: bold name (`font-weight: 700`), `color: var(--text)`, teal left border + tinted background
- Inactive rows: `color: var(--subtle)`, no background

### Upload to label

No change to the existing "Upload to: [Account Name]" label behaviour:

- When `activeAccountId === "all"`: show `Upload to: (select an account)` in muted/italic style and Upload CSV button remains **disabled** (existing guard)
- When a specific account is active: show `Upload to: [Account display name]` in teal

## Dashboard Changes

### Remove filter pills

In `DashboardPage.tsx`:

- Remove the `{/* Account filter pills */}` block (the `accounts.length > 1` conditional rendering `.dash-acct-pills`)
- Remove `acctFilter` local state and the `handleAcctFilterChange` function
- Remove `setAcctFilter` / `useState` import if no longer needed
- Replace all usages of `acctFilter` with `activeAccountId` from `useAccount()` — the dashboard reads the global sidebar selection directly

In `DashboardPage.css`:

- Remove `.dash-acct-pills`, `.pill`, and `.pill-active` style rules (or any account-pill-specific rules) that exist only to support the removed tabs

### Weekly trend / category chart `acctFilter` references

`buildWeeklyTotals(adapted, acctFilter)` and `buildWeeklyCategoryTotals(adapted, acctFilter)` — swap `acctFilter` for `activeAccountId` (the semantics are identical: `"all"` means no filter, otherwise filter by account nickname or ID as appropriate).

## Implementation Checklist

1. **Sidebar.tsx** — Replace the static `sidebar-section-header` / `sidebar-section-label` + `sidebar-add-account-btn` structure with a new `sidebar-all-accounts-row` component:
   - `onClick={() => setActiveAccountId("all")}` on the row container
   - `onClick={(e) => { e.stopPropagation(); setShowAddAccountModal(true); }}` on the "+" button
   - `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space selects "all")
   - `data-testid="account-all-accounts"` on the row
   - `aria-pressed={activeAccountId === "all"}`

2. **Sidebar.tsx** — Add `padding-left: 18px` (or a CSS class `sidebar-account-row--indented`) to the individual `.sidebar-account-row` items so they appear subordinate.

3. **Sidebar.css** — Add `.sidebar-all-accounts-row` and `.sidebar-all-accounts-row--active` rules (mirroring the active/hover logic of `.sidebar-account-row--active`). Add `.sidebar-all-accounts-dot` for the conic-gradient multi-colour dot. Update `.sidebar-account-row` to include `padding-left: 18px` for the indent.

4. **DashboardPage.tsx** — Remove `acctFilter` state, `handleAcctFilterChange`, and the pill rendering block. Import `useAccount` (if not already) and read `activeAccountId` directly. Pass `activeAccountId` wherever `acctFilter` was used.

5. **DashboardPage.css** — Remove `.dash-acct-pills` and pill-related rules.

6. **Tests** — Update `Sidebar.test.tsx`:
   - Test that clicking the "All Accounts" row calls `setActiveAccountId("all")`
   - Test that the "All Accounts" row gets `aria-pressed="true"` when `activeAccountId === "all"`
   - Test that individual account rows have the indented padding class
   - Test that clicking "+" does not also trigger "All Accounts" selection
   - Update/remove any test that asserts the old section label text "ACCOUNTS"

7. **Tests** — Update `DashboardPage.test.tsx` (or equivalent):
   - Assert that `.dash-acct-pills` no longer renders
   - Assert that `acctFilter` state is gone (no stale filter behaviour)
   - Existing "All Accounts" scenario now driven by AccountContext mock

## Acceptance Criteria (from issue #755)

- The dashboard has no account filter tabs/pills
- The sidebar has an "All Accounts" row at the top of the accounts list that selects the combined view and is visually distinct (multi-colour dot, acts as clickable label)
- Individual account rows are indented beneath "All Accounts" to show their subordinate relationship
- Clicking any account in the sidebar immediately updates the dashboard to show only that account's data
- Clicking "All Accounts" in the sidebar shows combined data from all accounts
- The "Upload to:" label correctly reflects the active selection ("All Accounts" → prompts user to select a specific account before uploading)
- No duplicate or conflicting account selectors exist anywhere in the app
- All existing tests pass; new tests cover the "All Accounts" row click and aria-pressed state

## Files to Change

- `src/components/Sidebar.tsx`
- `src/components/Sidebar.css`
- `src/pages/DashboardPage.tsx`
- `src/pages/DashboardPage.css`
- `src/components/__tests__/Sidebar.test.tsx` (or equivalent)
- `src/pages/__tests__/DashboardPage.test.tsx` (or equivalent)
