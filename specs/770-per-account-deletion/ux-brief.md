# UX Brief — #770: Per-Account Transaction Deletion

**Feature**: Per-account data deletion in Settings — clear transactions for one account  
**Option chosen**: A — Account Selector + Single Action Button in the Danger Zone  
**Date**: 2026-05-24

---

## Layout — Danger Zone Card

The existing `DangerZoneSection` in `src/pages/SettingsPage.tsx` is extended (not replaced).

```
Danger Zone card
├── [Existing] "Delete all transactions" button (global delete from #769)
├── ─── divider ───
├── Label: "Clear one account's transactions:"
├── Row: [Dropdown: select account ▾]  [Clear account data] button
│          (disabled until account is selected)
```

### Account Dropdown

- Fetches accounts from `GET /api/accounts` on component mount
- Placeholder text: "Select an account…"
- Shows account `nickname` in each option
- `data-testid="account-select-dropdown"`

### Clear Account Data Button

- Disabled until a valid account is selected
- Label: "Clear account data"
- Style: `btn-danger` (matches global delete button)
- `data-testid="account-clear-btn"`

---

## Confirmation Dialog

When the user clicks "Clear account data" (with an account selected), a confirmation dialog appears **inline** (same pattern as the global delete dialog — no modal portal needed):

```
Dialog content:
  "Delete all transactions for [Account Name]? Type DELETE to confirm."
  [input: DELETE]  [Confirm delete] [Cancel]
```

- The account name is interpolated into the prompt text
- Confirm button enabled only when input equals `DELETE` exactly
- `data-testid` attributes:
  - Dialog wrapper: `account-clear-dialog`
  - Input: `account-clear-confirm-input`
  - Confirm button: `account-clear-confirm-btn`
  - Cancel button: `account-clear-cancel-btn`

---

## API Call

On confirm:

```
DELETE /api/accounts/:id/transactions
```

- Path param `:id` is the selected account's UUID
- Response: `{ deletedCount: number }` — the number of transactions deleted
- The account itself is NOT deleted

---

## Success Toast

After a successful delete:

- The dialog closes
- A success message appears (same pattern as global delete): `"X transactions deleted from [Account Name]."`
- Auto-dismisses after 4 seconds
- `data-testid="account-clear-success"`

---

## Error Handling

- If the API returns an error: show error message inline below the dialog buttons
- `data-testid="account-clear-error"`

---

## Server-Side

A new route must be added to `src/server/routes/accounts.ts`:

```
DELETE /api/accounts/:id/transactions
```

- Authenticated (uses `authenticateToken` middleware)
- Scope: only deletes transactions belonging to the authenticated user AND the specified account
- Returns `{ deletedCount: number }` with status 200
- Returns 404 if the account doesn't exist or doesn't belong to the user

---

## Component Structure

All new UI lives inside the existing `DangerZoneSection` component in `src/pages/SettingsPage.tsx`. No new top-level component file is needed. The per-account UI is a new sub-section below the existing global delete.

---

## data-testid Reference

| Element                     | data-testid                   |
| --------------------------- | ----------------------------- |
| Account dropdown            | `account-select-dropdown`     |
| Clear account data button   | `account-clear-btn`           |
| Confirmation dialog wrapper | `account-clear-dialog`        |
| DELETE input                | `account-clear-confirm-input` |
| Confirm button              | `account-clear-confirm-btn`   |
| Cancel button               | `account-clear-cancel-btn`    |
| Success message             | `account-clear-success`       |
| Error message               | `account-clear-error`         |
