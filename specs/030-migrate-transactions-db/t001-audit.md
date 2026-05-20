# T001 Audit: pfa-v3-\* localStorage Write Points

## pfa-v3-\* localStorage Read/Write Points in App.tsx

Storage keys are defined at the top of `src/App.tsx` in a `SK` constant (lines 47-53):

| Key constant  | localStorage key      |
| ------------- | --------------------- |
| SK.txns       | `pfa-v3-transactions` |
| SK.mm         | `pfa-v3-merchants`    |
| SK.budgets    | `pfa-v3-budgets`      |
| SK.accounts   | `pfa-v3-accounts`     |
| SK.categories | `pfa-v3-categories`   |

### Reads (via `lsGet`)

All reads happen inside `useState` initialisers in `AppShell` (lines 140-164):

| Line | Key           | State variable                          |
| ---- | ------------- | --------------------------------------- |
| 141  | SK.txns       | txns                                    |
| 150  | SK.mm         | mm                                      |
| 153  | SK.budgets    | budgets                                 |
| 156  | SK.categories | categories                              |
| 162  | SK.accounts   | accountAliases                          |
| 166  | SK.txns       | selectedMonths (derived from txns read) |

### Writes (via `lsSet`)

All writes happen inside persisted setter functions (lines 188-207):

| Line | Key           | Setter function   |
| ---- | ------------- | ----------------- |
| 190  | SK.txns       | setTxns           |
| 193  | SK.mm         | setMm             |
| 196  | SK.budgets    | setBudgets        |
| 201  | SK.categories | setCategories     |
| 205  | SK.accounts   | setAccountAliases |

### handleUpload

`handleUpload` is **defined** at line 237 in `AppShell` and **called** from `Sidebar`
via the `onUpload` prop (App.tsx line 378, Sidebar.tsx line 148).

No other callers exist.

## useFileUpload Callers

`useFileUpload` (src/hooks/useFileUpload.ts) has **zero UI callers** in src/.
It is only referenced in its own test file:

- `src/hooks/useFileUpload.test.ts` — test-only usage, not a UI caller.

No component or page imports or calls `useFileUpload`.

## AccountContext needsMigration Export

`AccountContext` **does** export `needsMigration` as part of `AccountContextValue`
(src/context/AccountContext.tsx, line 39). It is included in the context provider
value at line 352 and is consumed by `MigrationGuard` in App.tsx (line 121).
