# UX Brief — #748 Sidebar Account Selection (Option A)

## Decision

The user selected **Option A**: teal-tinted highlighted row for the active account.

## Visual Design

### Active account row

- Background: `color-mix(in srgb, var(--accent) 12%, transparent)` — a subtle teal wash
- Left border: `2px solid var(--accent)` on the left edge of the row (or border-left on the row container)
- Account name: `font-weight: 700` (bold/full weight), color `var(--text)` (full contrast)
- Dot: same colour dot as usual, no change needed
- Row padding: add `padding: 4px 6px; border-radius: 6px; margin-left: -6px;` so the background fills edge-to-edge within the sidebar gutter

### Inactive account rows

- No change from current styling (muted name, no background)
- Cursor: `pointer` so all rows feel clickable

### Row interactivity

- Every account row gets `onClick={() => setActiveAccountId(acct.short)}`
- The rename ✎ button click must **not** also trigger `setActiveAccountId` — stop propagation or keep the edit button outside the row click target
- `role="button"` and `tabIndex={0}` on each row for keyboard accessibility
- `onKeyDown` handler: `Enter` or `Space` selects the account

### "Upload to" label

- Rendered **above** the Upload CSV button inside `.sidebar-upload`
- Text: `Upload to: <account display name>` — shows the active account's `display` name
- When `activeAccountId === "all"` or no account is selected: show `Upload to: (select an account)` in muted/warning style and the Upload CSV button remains **disabled** (existing guard)
- Font: 10px, `var(--muted)` colour for label prefix, account name in `var(--accent)` colour and `font-weight: 600`
- `data-testid="upload-to-label"`

## Implementation Checklist

1. Destructure `setActiveAccountId` from `useAccount()` in `Sidebar.tsx`
2. Add `onClick`, `role="button"`, `tabIndex={0}`, `onKeyDown` to each `.sidebar-account-row`
3. Apply CSS modifier class `sidebar-account-row--active` when `acct.short === activeAccountId`
4. Add CSS rules for `.sidebar-account-row--active` and `.sidebar-account-row` hover/cursor in `Sidebar.css`
5. Add `data-testid="account-item-active"` (or `aria-selected="true"`) to the active row
6. Render `<div className="sidebar-upload-to" data-testid="upload-to-label">…</div>` above the upload button
7. Disable Upload CSV button when `activeAccountId === "all"` (already done by existing guard via `uploadError`)

## Acceptance Criteria (from issue #748)

- Clicking an account row selects it as the active account
- The active account row has a teal-tinted background and bold account name, visually distinct from inactive rows
- A "Upload to: [Account Name]" label appears above the Upload CSV button
- Uploading a CSV imports into the selected account (existing logic — just needs `setActiveAccountId` wired up)
- Selection persists across page navigation (already handled by AccountContext + localStorage)
- All existing tests pass; new unit/integration tests cover the click-to-select behaviour and the label text

## Files to Change

- `src/components/Sidebar.tsx`
- `src/components/Sidebar.css`
- `src/components/__tests__/Sidebar.test.tsx` (or equivalent test file)
