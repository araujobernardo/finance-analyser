# UX Brief — #769: Settings Page Categories & Danger Zone

## Decision

**Option A — Inline Sections** (chosen by user, 2026-05-24)

The Settings page uses a single-column card layout. Each card is a self-contained section. No tabs, no sidebar navigation.

## Layout (top to bottom)

> The top info card ("Finance Analyser / Manage your budget categories…") is **REMOVED** entirely. The user confirmed it is not needed.

1. **Alert Preferences** — already exists, no changes
2. **Categories** — new card (see below)
3. **Danger Zone** — new card, red-bordered (see below)

## Categories Card

- Title: "Categories"
- Lists all user categories fetched from `GET /api/categories`
- Each row: colour swatch + category name + Rename button + Delete button
- "Add category" form inline at the bottom of the list: text input for name + colour picker + Save button
- Deleting a category sets `category = null` on affected transactions (server handles this); no confirmation dialog needed for individual category delete
- Empty state: "No categories yet. Add one below."

## Danger Zone Card

- Red border (`border: 1px solid var(--color-danger)` or equivalent red CSS variable)
- Title: "Danger Zone" in red
- Single action: "Delete all transactions" button (destructive red styling)
- Clicking opens a confirmation dialog:
  - Prompt: "Type DELETE to confirm"
  - Text input — user must type the word DELETE exactly
  - Confirm button disabled until input matches
  - On confirm: calls `DELETE /api/transactions` scoped to the current user
  - Does NOT delete accounts — only transaction rows

## Visual Reference

Match the card style already used by the Alert Preferences section (white background, subtle border, padding, section heading). The Danger Zone card uses the same structure but with a red border and red heading text.

## API Endpoints Required (server work)

| Method | Path                | Purpose                               |
| ------ | ------------------- | ------------------------------------- |
| GET    | /api/categories     | List user categories                  |
| POST   | /api/categories     | Create category `{ name, colour }`    |
| PATCH  | /api/categories/:id | Rename / recolour                     |
| DELETE | /api/categories/:id | Remove (nullify on transactions)      |
| DELETE | /api/transactions   | Bulk-delete all transactions for user |

## Files to Touch

- `src/server/routes/categories.ts` — new file
- `src/server/index.ts` — register categoriesRouter and DELETE /api/transactions
- `src/pages/SettingsPage.tsx` — add Categories and Danger Zone sections; remove the top info card if it is present
- `src/pages/SettingsPage.css` — styling for new sections and danger zone border
