# Research: Bank Connection and Sync Interface

**Feature**: FA-BANK-003 | **Branch**: `773-bank-connection-ui` | **Date**: 2026-05-31

## Context Pattern

**Decision**: Follow `src/context/AccountContext.tsx` exactly.

Key conventions confirmed:

- `createContext` + `useContext` with a typed default value
- `useState`, `useCallback`, `useEffect` from React
- `const { apiFetch } = useApi()` — all API calls via `useApi`, never raw `fetch`
- `const { addToast } = useToast()` — notifications via toast system
- Provider function exported as `export function BankProvider`
- Hook exported as `export function useBankContext()`
- All async context methods return `Promise<boolean>` (success/failure) or `Promise<void>`
- Error state stored in `useState<string | null>(null)`

**404 handling**: On mount, `GET /api/bank/connection` returning 404 sets
`connection = null` — this is the not-connected state, not an error.

---

## Sidebar Navigation Pattern

**Decision**: Add entry to the `NAV` array in `src/components/Sidebar.tsx`.

Confirmed pattern (lines 22–30):

```ts
const NAV = [
  { path: "/dashboard", icon: "⬡", label: "Dashboard" },
  { path: "/transactions", icon: "≡", label: "Transactions" },
  // ...
  { path: "/settings", icon: "⚙", label: "Settings" },
];
```

New entry: `{ path: "/settings/bank", icon: "⬡", label: "Bank Connection" }`
(icon to be confirmed; any unused icon from the existing set is acceptable).

---

## Provider Tree Placement

**Decision**: Nest `BankProvider` inside `BudgetProvider` in `src/App.tsx`.

Confirmed current tree (App.tsx lines 42–74):

```tsx
<ToastProvider key={userKey}>
  <AccountProvider>
    <GoalsProvider>
      <BudgetProvider>
        {/* BankProvider goes here */}
        <div className="app-shell">...
```

`BankProvider` must be inside `AccountProvider` so that `AccountMappingRow`
can call `useAccount()` to populate the Finance Analyser account dropdown.

---

## Route Registration

**Decision**: Add `<Route path="/settings/bank" element={<BankConnectionPage />} />` inside
the `AppShell` `<Routes>` block alongside existing routes.

---

## API Types

**Decision**: Add three interfaces to `src/types/api.ts` matching the existing style.

Key detail: `lastBalance` is `string | null` (postgres-js returns `numeric` as
string). Balance display: `parseFloat(lastBalance ?? "0").toFixed(2)`. This
matches the existing `ApiAsset.value` pattern with the inline comment
`// postgres-js returns numeric columns as strings`.

`syncStatus` is typed as a discriminated union:
`"active" | "syncing" | "error" | "disconnected"` — consistent with the DB
constraint in FA-BANK-001.

`encryptedUserToken` is intentionally omitted from `ApiAkahuConnection` — it
is never sent by the backend.

---

## Component Colocation

**Decision**: All five sub-components (`ConnectionStatusCard`, `ConnectForm`,
`AccountMappingList`, `AccountMappingRow`, `SyncControls`) are defined in a
single file `src/pages/BankConnectionPage.tsx`.

**Rationale**: These components are tightly coupled to the bank connection page
and have no reuse candidates elsewhere in the app. Keeping them colocated in
one file minimises the number of PRs and reduces complexity. If the file
becomes too large in future, splitting is straightforward.

---

## Balance Formatting

**Decision**: `parseFloat(link.lastBalance ?? "0").toFixed(2)` — consistent
with the `ApiAsset.value` pattern used throughout the app.

---

## Disconnect Confirmation

**Decision**: Single confirmation via a `window.confirm()` dialog before
calling `disconnect()`.

**Rationale**: Consistent with the delete-account confirmation pattern already
used in the app. A modal is overkill for a settings page action.

---

## Sync Status Badge Colours

**Decision**: Use existing CSS classes / inline styles matching the colour
conventions already in use:

- `active` → green
- `syncing` → spinner (animated)
- `error` → red + error message text
- `disconnected` → grey

No new CSS variables needed; use existing colour tokens where available.
