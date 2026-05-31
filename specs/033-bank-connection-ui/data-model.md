# Data Model: Bank Connection and Sync Interface

**Feature**: FA-BANK-003 | **Branch**: `773-bank-connection-ui` | **Date**: 2026-05-31

## API Types (add to `src/types/api.ts`)

Three new interfaces added to `src/types/api.ts`, matching the file's existing
style. All numeric DB columns are `string` (postgres-js behaviour), matching the
`ApiAsset.value` pattern.

### ApiAkahuConnection

```ts
export interface ApiAkahuConnection {
  id: string;
  userId: string;
  akahuUserId: string;
  connectedAt: string;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // encryptedUserToken is never sent to the frontend
}
```

### ApiAkahuAccountLink

```ts
export interface ApiAkahuAccountLink {
  id: string;
  userId: string;
  akahuAccountId: string;
  financeAccountId: string;
  akahuAccountName: string;
  akahuAccountType: string | null;
  lastBalance: string | null; // postgres-js returns numeric as string; call parseFloat() before arithmetic
  lastTransactionSyncedAt: string | null;
  syncStatus: "active" | "syncing" | "error" | "disconnected";
  syncError: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### SyncResult

```ts
export interface SyncResult {
  accountsSynced: number;
  transactionsAdded: number;
  errors: { accountId: string; error: string }[];
}
```

---

## BankContext Interface (`src/context/BankContext.tsx`)

```ts
export interface BankContextValue {
  connection: ApiAkahuConnection | null; // null = not connected
  accountLinks: ApiAkahuAccountLink[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  error: string | null;
  connect: (akahuUserId: string, userToken: string) => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  linkAccount: (
    akahuAccountId: string,
    financeAccountId: string,
    akahuAccountName: string,
  ) => Promise<boolean>;
  unlinkAccount: (akahuAccountId: string) => Promise<boolean>;
  syncNow: () => Promise<void>;
  refetch: () => Promise<void>;
}
```

**State transitions**:

```
not-connected (connection = null)
  │
  │  connect() → POST /api/bank/connect
  ▼
connected (connection set, accountLinks loaded)
  │
  │  disconnect() → DELETE /api/bank/connection
  ▼
not-connected

connected
  │
  │  syncNow() → POST /api/bank/sync
  │  isSyncing = true while in-flight
  ▼
lastSyncResult set; isSyncing = false; refetch() called
```

**On mount**: `GET /api/bank/connection`

- 200 → set `connection` and `accountLinks`
- 404 → set `connection = null`, `accountLinks = []` (not an error)
- other error → set `error`

---

## Component Tree (`src/pages/BankConnectionPage.tsx`)

All components defined in one file. `BankConnectionPage` is the default export.

```
BankConnectionPage
  ├── reads: useBankContext()
  │
  ├── ConnectionStatusCard
  │     Shows: connection.connectedAt, connection.lastSyncedAt
  │     Shows: Disconnect button (calls disconnect() with window.confirm)
  │     Hidden when: connection === null
  │
  ├── ConnectForm
  │     Inputs: akahuUserId (text), userToken (text)
  │     Help text: "Get these from my.akahu.nz/developers"
  │     Privacy note: "Your bank credentials are never stored..."
  │     Submit: calls connect(akahuUserId, userToken)
  │     Hidden when: connection !== null
  │
  ├── AccountMappingList
  │     Shown when: connection !== null
  │     Maps over: accountLinks
  │     └── AccountMappingRow (one per Akahu account)
  │           Reads: useAccount() for Finance Analyser account dropdown options
  │           Shows: akahuAccountName, akahuAccountType, formatted balance
  │           Dropdown: link → calls linkAccount(); "Not linked" → calls unlinkAccount()
  │           Badge: syncStatus coloured indicator (active/syncing/error/disconnected)
  │           Shows: syncError message when syncStatus === "error"
  │
  └── SyncControls
        Shown when: connection !== null && accountLinks.length > 0
        Button: "Sync now" — disabled when isSyncing
        Shows: spinner while isSyncing
        Shows: lastSyncResult summary after sync
        Security note: full privacy/security paragraph
```

---

## Files Changed

| File                               | Change                             |
| ---------------------------------- | ---------------------------------- |
| `src/types/api.ts`                 | Add 3 interfaces                   |
| `src/context/BankContext.tsx`      | New file — provider + hook         |
| `src/pages/BankConnectionPage.tsx` | New file — page + 5 sub-components |
| `src/components/Sidebar.tsx`       | Add 1 entry to NAV array           |
| `src/App.tsx`                      | Add BankProvider + 1 route         |
