# Data Model: Account Number-Based Categorisation

## Affected Entities

### PfaTxn (unchanged shape)

No new fields are added to `PfaTxn`. The existing fields serve the new semantics:

| Field          | Current meaning         | New semantics after fix                                            |
| -------------- | ----------------------- | ------------------------------------------------------------------ |
| `accountShort` | Account key (was: name) | Account number (e.g. `0549256-53`), or name if no number available |
| `account`      | Display label           | `"Name (number)"` when number present, `"Name"` otherwise          |

### PfaAccountAliases (unchanged shape)

`Record<string, string>` — keyed by `accountShort`. After the fix, keys will be account numbers
(e.g. `"0549256-53"`) for newly imported files. Keys for existing data remain as before.

No schema change required.

---

## Changed Logic

### `parseAccountName` in `src/App.tsx`

**Before**:

```ts
const short = nick ?? num ?? line.slice(0, 20);
const baseDisplay =
  nick && num
    ? `${nick} ···${num.slice(-6)}`
    : (nick ?? num ?? line.slice(0, 30));
```

**After**:

```ts
const short = num ?? nick ?? line.slice(0, 20);
const baseDisplay =
  nick && num ? `${nick} (${num})` : (nick ?? num ?? line.slice(0, 30));
```

One-line change to priority (`num ?? nick`), one-line change to display format (full number, not
truncated).

---

## State Transitions

No state machine changes. The `accountList` derived from `txns` continues to work without
modification — it groups by `accountShort`, which will now be account numbers.

---

## Backward Compatibility

- Existing `pfa-v3-transactions` data is not modified.
- Existing `pfa-v3-accounts` alias keys (which may be names) are not modified.
- New imports after the fix use account numbers as keys.
- A user who previously imported "Savings On Call" as a merged account and then re-imports after
  the fix will see a new separate entry keyed by number. This is the correct and desired behaviour.
