# Data Model: Manual Transfer Flagging

**Feature**: Manual Transfer Flagging
**Branch**: `003-manual-transfer-flagging`
**Date**: 2026-04-24

---

## Entity: PfaTxn (extended)

The existing `PfaTxn` interface in `src/types/pfa.ts` gains one optional field:

| Field             | Type                          | Existing? | Description                                        |
| ----------------- | ----------------------------- | --------- | -------------------------------------------------- |
| `id`              | `string`                      | ✅        | Unique transaction identifier                      |
| `date`            | `string`                      | ✅        | ISO date `YYYY-MM-DD`                              |
| `month`           | `string`                      | ✅        | ISO month `YYYY-MM`                                |
| `type`            | `string`                      | ✅        | Transaction type string                            |
| `payee`           | `string`                      | ✅        | Payee name                                         |
| `memo`            | `string`                      | ✅        | Memo/description                                   |
| `amount`          | `number`                      | ✅        | Raw amount (positive = credit, negative = debit)   |
| `isCredit`        | `boolean`                     | ✅        | True if amount > 0                                 |
| `account`         | `string`                      | ✅        | Display account name                               |
| `accountShort`    | `string`                      | ✅        | Short account key                                  |
| `category`        | `string \| null`              | ✅        | Current category name, or null                     |
| `isTransfer`      | `boolean`                     | ✅        | True when transaction is part of a transfer pair   |
| `preFlagCategory` | `string \| null \| undefined` | **NEW**   | Category held before flagging; restored on un-flag |

### `preFlagCategory` State Transitions

```
                     handleFlag()
category: "Groceries" ──────────────► category: "Savings & Transfers"
preFlagCategory: undefined            preFlagCategory: "Groceries"
isTransfer: false                     isTransfer: true

                     handleUnflag()
category: "Savings & Transfers" ────► category: "Groceries"
preFlagCategory: "Groceries"          preFlagCategory: undefined
isTransfer: true                      isTransfer: false

                     handleUnflag() [auto-detected, no preFlagCategory]
category: "Savings & Transfers" ────► category: null
preFlagCategory: undefined            preFlagCategory: undefined
isTransfer: true                      isTransfer: false
```

### Notes

- `preFlagCategory` is **optional** (`?`). Existing records in localStorage simply lack this field; TypeScript treats absent fields as `undefined`.
- No localStorage migration is needed.
- `detectTransfers()` in `App.tsx` is NOT modified. Auto-detected transfers will have `preFlagCategory: undefined`.
- The `pfa-v3-transactions` localStorage key is the only key affected.

---

## localStorage Schema

No new keys. The `pfa-v3-transactions` key stores `PfaTxn[]`; each element now may include the optional `preFlagCategory` field.

```json
[
  {
    "id": "Main::2026-03-15-250.00-3",
    "date": "2026-03-15",
    "month": "2026-03",
    "type": "",
    "payee": "ASB Visa",
    "memo": "",
    "amount": -250.0,
    "isCredit": false,
    "account": "Main Account",
    "accountShort": "Main",
    "category": "Savings & Transfers",
    "isTransfer": true,
    "preFlagCategory": "Utilities & Bills"
  }
]
```
