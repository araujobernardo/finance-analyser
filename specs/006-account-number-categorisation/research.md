# Research: Account Number-Based Categorisation

## Root Cause Analysis

### Decision: Bug is in `parseAccountName` in `src/App.tsx`

**Rationale**: The function at lines 63–80 of `App.tsx` extracts two pieces of information from
the CSV metadata (line 2 of the file):

- `nick` — the account nickname in parentheses, e.g. `"Savings On Call"`
- `num` — the account number after the word "Account", e.g. `"0549256-53"`

The account identifier used as the storage key (`short`) is currently assigned as:

```
const short = nick ?? num ?? line.slice(0, 20);
```

This means the nickname (name) is preferred over the number. Two accounts with the same name but
different numbers (e.g. `0549256-53` and `0549256-50`, both named "Savings On Call") produce the
same `short = "Savings On Call"`, so they are treated as one account.

**Fix**: Swap the preference so the number is always the primary key:

```
const short = num ?? nick ?? line.slice(0, 20);
```

The `display` label (what the user sees) should still show the friendly name. A clear display
format is `"Savings On Call (0549256-53)"` — name first, number in parentheses, so names that are
unique need no disambiguation, while duplicate names immediately show the number.

**Alternatives considered**:

- Storing both `num` and `nick` as separate fields on the transaction — rejected; the existing
  `accountShort` / `account` pair already covers this (short = key, account = display label),
  no new fields are needed.
- A migration step to rekey existing data — not required. Existing transactions are stored by
  whatever `short` they had at import time. The fix is forward-only; old data is untouched.
  Users who previously imported same-named accounts under a single key will continue to see them
  merged until they re-import the affected files.

---

## Backward Compatibility

### Decision: Forward-only fix; no migration of existing localStorage data

**Rationale**: The `pfa-v3-transactions` localStorage key stores `accountShort` on every
transaction. Rekeying old transactions would require knowing which old `short` values (names)
correspond to which account numbers — information that is no longer available without the
original CSV files. A silent migration would risk corrupting data. The safest approach is to
leave existing data unchanged and fix new imports only.

**How to apply**: Developer must NOT write a migration routine. The fix only changes
`parseAccountName`; existing data is read-only.

---

## Display Disambiguation

### Decision: Show `"Name (number)"` format when a number is present; show `"Name"` alone when no number is available

**Rationale**: This format is already partially in use — the current `baseDisplay` is
`"${nick} ···${num.slice(-6)}"` (name + truncated number). We will update it to show the full
number for clarity, matching the format the user sees on their bank statements:
`"Savings On Call (0549256-53)"`.

**Alternatives considered**:

- Only show number — rejected; names are friendlier for most accounts.
- Show number only when a collision exists — rejected; adds runtime complexity and the number is
  always useful context for the user.

---

## CSV Metadata Format

### Decision: Account number is on line 2 (index 1) of the ASB/NZ bank CSV, in the pattern `Account <number>`

**Rationale**: The existing `parseAccountName` function already reads `lines[1]` and extracts
`num` via `/Account\s+([\w-]+)/`. Account numbers follow the format `\d{7}-\d{2}` (e.g.
`0549256-53`). The regex already handles this — no change to the extraction logic is needed,
only the priority assignment.

**Fallback**: When the CSV has no metadata line 2, or the line does not contain "Account" and
"Branch", the function returns `{ short: "Main", display: "Main Account" }`. This fallback
remains unchanged.
