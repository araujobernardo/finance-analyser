# Data Model: UX/UI Overhaul — Realign to Prototype

**Branch**: `002-ux-ui-overhaul` | **Date**: 2026-04-23  
**Replaces**: previous data-model.md (Monarch Money Quality plan)

---

## Summary

This feature introduces **no new storage entities and no localStorage schema changes**. Per constitution Golden Rule 3: _"Never modify localStorage schema without flagging it to the user."_ All changes are in the UI layer only.

The key architectural change is **lifting `selectedMonths` from `string` to `string[]`** in App-level state — this is ephemeral (session state, not persisted).

---

## Existing Entities (structure unchanged)

### Transaction

Stored in localStorage. Shape identical to prototype:

```
id: string            // "<accountShort>::<uniqueId>"
date: string          // "YYYY-MM-DD"
month: string         // "YYYY-MM"
type: string          // transaction type from CSV
payee: string
memo: string
amount: number        // positive = credit, negative = debit
isCredit: boolean
account: string       // display name (renameable)
accountShort: string  // key derived from CSV (immutable)
category: string | null
isTransfer: boolean   // true when matched as inter-account transfer
```

### Account (derived, not stored separately)

Accounts are derived at runtime from transaction data — not stored as first-class entities. The `accountList` computed in App is:

```
short: string         // accountShort key
display: string       // current display name
```

Account aliases (renamed display names) are stored separately in localStorage under `pfa-v3-accounts` as `Record<short, display>`.

### Category

```
name: string          // max 20 chars, unique
color: string         // hex colour string (e.g. "#10b981")
```

Stored in localStorage under `pfa-v3-categories`.

### Budget

```
[categoryName: string]: number   // monthly budget amount in NZD
```

Stored in localStorage under `pfa-v3-budgets`.

### Merchant Map

```
[payeeLower: string]: string   // payee.toLowerCase() → category name
```

Stored in localStorage under `pfa-v3-merchants`. Used to auto-apply categories on re-upload.

---

## Session-Only State Changes (not persisted)

| State field      | Old type    | New type      | Location  | Reason                            |
| ---------------- | ----------- | ------------- | --------- | --------------------------------- |
| `selectedMonths` | `string`    | `string[]`    | `App.tsx` | Multi-month toggle requires array |
| `activeTab`      | route (URL) | `string`      | `App.tsx` | Tab-based nav replaces router     |
| `uploadStatus`   | local state | lifted to App | `App.tsx` | Sidebar needs to show status      |
| `chatMessages`   | local state | lifted to App | `App.tsx` | Survive tab switches              |

---

## Component Architecture Changes (UI only)

| Old                                | New                          | Notes                                        |
| ---------------------------------- | ---------------------------- | -------------------------------------------- |
| `App.tsx` (React Router shell)     | `App.tsx` (tab-based shell)  | Remove BrowserRouter, Routes, NavBar         |
| `NavBar.tsx`                       | _(deleted)_                  | Replaced by Sidebar                          |
| `ChatPanel.tsx` (floating overlay) | _(deleted)_                  | Replaced by ChatPage full-page               |
| `UploadPage.tsx`                   | _(deleted)_                  | Upload moves into Sidebar                    |
| `HistoryPage.tsx`                  | _(deleted)_                  | Trends chart moves into DashboardPage        |
| _(new)_ `Sidebar.tsx`              | `src/components/Sidebar.tsx` | 224px fixed sidebar, upload, nav, accounts   |
| `DashboardPage.tsx`                | Updated                      | Multi-month, donut, trends, budget-vs-actual |
| `TransactionsPage.tsx`             | Updated                      | Payee-match bulk update, show-transfers      |
| _(new)_ `ChatPage.tsx`             | `src/pages/ChatPage.tsx`     | Full-page chat (replaces floating panel)     |
| `SettingsPage.tsx`                 | Rewritten                    | Full categories CRUD, data stats, clear-all  |

---

## Transfer Detection Rule

The `isTransfer` flag — not the category name "Savings & Transfers" — is the sole driver for excluding transactions from dashboard totals, chart data, and budget tracking. This invariant is unchanged from the prototype and existing codebase.
