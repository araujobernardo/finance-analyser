# Data Model: Filter Uncategorised Transactions

**Feature**: 004-filter-uncategorised-transactions
**Date**: 2026-04-24

---

## No schema changes

This feature introduces no new entities, no new fields, and no modifications to the `localStorage` schema.

---

## Relevant existing entities (reference only)

### PfaTxn

The `category` field is the only field relevant to this feature:

| Field      | Type                          | Meaning                                                                       |
| ---------- | ----------------------------- | ----------------------------------------------------------------------------- |
| `category` | `string \| null \| undefined` | The assigned category name. `null`, `undefined`, or `""` means uncategorised. |

No changes to `PfaTxn`. The "uncategorised" condition is: `!category` (falsy check).

### PfaCategory

Unchanged. The filter dropdown reads `categories` (an array of `PfaCategory`) to render named category options — same as today.

---

## UI state (ephemeral, not persisted)

| State variable | Type     | New value added       | Meaning                                 |
| -------------- | -------- | --------------------- | --------------------------------------- |
| `filterCat`    | `string` | `"__uncategorised__"` | Show only transactions with no category |

This value is held in React component state only and is never written to `localStorage`.
