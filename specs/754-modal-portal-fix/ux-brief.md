# UX Brief — #754 Modal Portal Fix (Option B — Full Portal Audit)

## Decision

The user selected **Option B**: fix all modals in a single pass using `createPortal`.

Every modal in the app is wrapped with `createPortal(..., document.body)` so it mounts
directly on `document.body` rather than inside any positioned ancestor's DOM subtree.
This removes the stacking-context trap permanently and is consistent across the whole
codebase.

## Root Cause

`AddAccountModal` (and several other modals) are rendered inside DOM ancestors that
have `position: sticky`, `position: relative`, or other CSS properties that create a
new stacking context. A modal's `z-index` only applies within that local stacking
context, so it can never visually escape ancestors in the main content tree — no
matter how high the z-index value is set.

**Fix**: wrap each modal's return value with `createPortal(..., document.body)`.
The modal HTML is mounted as a direct child of `<body>`, outside every stacking
context. Existing CSS (`position: fixed; inset: 0`) already works correctly from
`<body>` — no CSS changes are required.

## Modals to Fix (all 8)

| File                                             | Backdrop class                  |
| ------------------------------------------------ | ------------------------------- |
| `src/components/AddAccountModal.tsx`             | `account-modal__backdrop`       |
| `src/components/DeleteAccountModal.tsx`          | `account-modal__backdrop`       |
| `src/components/DuplicateWarningModal.tsx`       | `dup-modal__backdrop`           |
| `src/components/goals/GoalModal.tsx`             | `goal-modal__backdrop`          |
| `src/components/net-worth/AssetModal.tsx`        | `nw-modal__backdrop`            |
| `src/components/net-worth/LiabilityModal.tsx`    | `nw-modal__backdrop`            |
| `src/components/budgets/AddBudgetModal.tsx`      | `goal-modal__backdrop` (reused) |
| `src/components/budgets/ManageDefaultsModal.tsx` | `goal-modal__backdrop` (reused) |

## Implementation Pattern

Apply identically to every modal:

```tsx
import { createPortal } from 'react-dom';

export function SomeModal({ onClose }: Props) {
  return createPortal(
    <div className="some-modal__backdrop" role="dialog" aria-modal="true" ...>
      <div className="some-modal__panel">
        {/* existing content unchanged */}
      </div>
    </div>,
    document.body
  );
}
```

No CSS changes are needed. The backdrop already uses `position: fixed; inset: 0`
which covers the full viewport regardless of where the element is mounted in the DOM.

## Keyboard / Focus Behaviour

- `autoFocus` on the first interactive element inside each modal is already present
  — it must be preserved after the portal move (React handles this correctly with portals)
- Escape-to-close is handled at the component level (where present) — no change required
- Tab-trapping is not currently implemented; this story does not add it (out of scope)

## Test Notes

- All existing modal unit tests use `render()` directly — they will continue to work
  because `createPortal` in a JSDOM environment (vitest/react-testing-library) renders
  the portal content into `document.body`, which `screen.getBy*` queries still find
- No test changes should be required for existing tests to pass
- Smoke-check: open each modal in the running app and confirm it renders on top of
  all page content

## Acceptance Criteria (from issue #754)

- [ ] The Add Account modal renders on top of all page content regardless of which
      page is visible in the background
- [ ] The backdrop covers the full viewport
- [ ] Keyboard focus and escape-to-close still work correctly after the portal move
- [ ] All other modals in the app (DeleteAccount, DuplicateWarning, Goal, Asset,
      Liability, AddBudget, ManageDefaults) are also wrapped with createPortal
- [ ] All existing tests pass

## Files to Change

- `src/components/AddAccountModal.tsx`
- `src/components/DeleteAccountModal.tsx`
- `src/components/DuplicateWarningModal.tsx`
- `src/components/goals/GoalModal.tsx`
- `src/components/net-worth/AssetModal.tsx`
- `src/components/net-worth/LiabilityModal.tsx`
- `src/components/budgets/AddBudgetModal.tsx`
- `src/components/budgets/ManageDefaultsModal.tsx`
