# UX Brief: GoalModal — Option C (Type-First Adaptive Form)

**Feature**: FA-GOAL-002 — Goals Creation and Management UI and API
**Covers**: Issues #502 (GoalModal.css) and #503 (GoalModal.tsx)
**Decision**: Option C selected by the user — Type-First Adaptive Form
**Mockup reference**: `specs/024-goals-management/mockups/option-c.html`
**Date**: 2026-05-17

---

## 1. Design Rationale

Option C eliminates the disorienting context switch of a wizard (Option A) and avoids the cluttered always-visible form of Option B. The form teaches goal types through tile descriptions before the user commits, then reveals fields only once the type is known. Every revealed field is meaningful for the chosen type — no dead fields, no conditional hiding after the fact.

---

## 2. Layout & Structure

### Modal container

- Max-width: `540px` (wider than the existing 460px NetWorthModal to accommodate the 2×2 tile grid)
- Width: `90%` of viewport — same fluid behaviour as existing modals
- Background: `var(--surface)` (`#0c1526`)
- Border: `1px solid var(--border)` (`#1a2d4a`)
- Border-radius: `0.75rem` (12px) — consistent with existing modals
- Box-shadow: `0 24px 64px rgba(0, 0, 0, 0.5)`
- Three sections stacked vertically: **Header | Body | Footer**

### Modal header

- Height: auto, padding `20px 24px 18px`
- Left: title text "Add Goal" (1rem / 600 weight / `var(--text)`)
- Right: close button — 32×32px, `border-radius: 8px`, border `1px solid var(--border)`, background transparent, icon `✕`
- Separator: `1px solid var(--border)` at the bottom

### Modal body

- Padding: `24px`
- Flex column, gap `20px` between top-level sections
- Contains in order:
  1. Step indicator strip
  2. Goal Name field
  3. Goal Type tile grid
  4. Adaptive fields container (collapsed until type chosen)

### Modal footer

- Padding: `16px 24px 20px`
- Flex row, `justify-content: flex-end`, gap `10px`
- Separator: `1px solid var(--border)` at the top
- Buttons: Cancel (ghost) + Save Goal (primary)

---

## 3. Component Decisions

All tokens are from `src/index.css` unless noted. The modal-specific semantic tokens (`--modal-bg`, `--modal-overlay`, etc.) used in existing modals are carried forward.

### Step indicator

- Two dots + label text, displayed as a flex row with `gap: 8px`
- Dot size: `7×7px`, `border-radius: 50%`
- States:
  - Inactive: `var(--border)` fill
  - Active (current step): `var(--accent)` fill
  - Complete (past step): `var(--accent-dim)` fill
- Label text: `0.72rem`, `var(--muted)`, changes dynamically:
  - Before type chosen: "Step 1 of 2 — What kind of goal?"
  - After type chosen: "Step 2 of 2 — Fill in the details"

### Goal Name field

- Standard label (`0.75rem / 600 / var(--subtle)` / `UPPERCASE` / `letter-spacing: 0.04em`)
- Text input: padding `10px 14px`, background `var(--card)`, border `1px solid var(--border)`, `border-radius: 8px`, font-size `0.9rem`
- Focus ring: `border-color: var(--accent)`, `box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15)`
- Placeholder: "e.g. Emergency Fund", colour `var(--muted)`
- Error state border: `var(--color-danger)` — use same token as existing modals
- Error text: `0.8rem`, `var(--color-danger)`, appears below the input

### Goal Type tile grid

- Label: same style as field labels above, text "GOAL TYPE"
- Grid: `display: grid; grid-template-columns: 1fr 1fr; gap: 10px`
- Four tiles: Savings Target, Debt Payoff, Net Worth Milestone, Spending Limit

**Type tile anatomy**:

- Padding: `12px 14px`, flex column, `gap: 4px`
- Background: `var(--card)`, border `2px solid var(--border)`, `border-radius: 10px`
- Icon: emoji at `1.1rem` line-height `1`
- Name: `0.82rem / 600 / var(--text)`
- Description: `0.70rem / var(--muted) / line-height: 1.35`
- Cursor: `pointer`
- Transition: `border-color 0.15s, background 0.15s, transform 0.1s`

**Tile states**:

- Default: as above
- Hover: `border-color: var(--subtle)`, background `#152234` (one step lighter than `var(--card)`)
- Active press: `transform: scale(0.97)`
- **Selected**: `border-color: var(--accent)`, background `rgba(16, 185, 129, 0.08)`, tile name text colour changes to `var(--accent)`
- **Locked (name empty)**: `opacity: 0.45`, `cursor: default`, pointer-events none — tiles are interactive only after a name is entered

**Tile content by type**:

| Type value            | Icon | Name                | Description                |
| --------------------- | ---- | ------------------- | -------------------------- |
| `savings_target`      | 💰   | Savings Target      | Build up a sum by a date   |
| `debt_payoff`         | 📋   | Debt Payoff         | Pay down what you owe      |
| `net_worth_milestone` | 📈   | Net Worth Milestone | Reach a total net worth    |
| `spending_limit`      | 🚫   | Spending Limit      | Cap spending in a category |

### Adaptive fields container

- Overflow: `hidden`, initial `max-height: 0`, `opacity: 0`
- Transition: `max-height 0.35s ease, opacity 0.3s ease`
- Expanded state: `max-height: 600px`, `opacity: 1`
- Triggered by: selecting any tile
- After expansion, scroll the container smoothly into view (`scrollIntoView({ behavior: 'smooth', block: 'nearest' })`) with a 50ms delay to let the animation start first
- Internal gap: `16px` between fields

**Context hint banner** (first child of adaptive fields):

- Background: `rgba(16, 185, 129, 0.07)`, border `1px solid rgba(16, 185, 129, 0.2)`, `border-radius: 8px`
- Padding: `10px 14px`, font-size `0.75rem`, colour `var(--subtle)`, `line-height: 1.5`
- Text is type-specific (see copy section below)
- Always visible when adaptive fields are expanded

### Amount field (inside adaptive fields)

- Label text adapts per type (see interaction model below)
- Uses a prefix-wrap pattern: relative-positioned container, input padded `padding-left: 44px`, prefix `"NZD"` absolutely positioned left `0 / top 0 / bottom 0 / width 38px`, centred, `0.8rem / 600 / var(--muted)`, separated by `border-right: 1px solid var(--border)`
- Input type `number`, `min="0.01"`, `step="0.01"`, placeholder `"0.00"`
- Required; error if blank or ≤ 0 on submit

### Spending Category field (conditional — spending_limit only)

- Shown: only when `type === "spending_limit"`; hidden and state cleared when type changes away
- Label: "SPENDING CATEGORY"
- Input type `text`, placeholder "e.g. Dining, Subscriptions"
- Hint text below: "Matches the category label on your transactions." — `0.72rem / var(--muted) / line-height: 1.4`
- Optional (per spec edge-case: category-less spending_limit applies to total spending)

### Target Date field

- Label: "TARGET DATE" with an `(optional)` badge — `0.68rem / var(--muted) / font-weight: 400 / normal case / no letter-spacing`
- Input type `date`
- Dates in the past are allowed; no error shown

### Linked Account field

- Label: "LINKED ACCOUNT" with `(optional)` badge
- `<select>` element using the same input styles, wrapped in a custom select wrapper
- Custom dropdown arrow: pseudo-element `▾`, absolutely positioned right `14px`, `var(--muted)` colour, pointer-events none; select gets `padding-right: 36px`
- First option: `<option value="">None</option>`
- Remaining options: populated from `useAccount().accounts`
- Format: `{institutionName} — {accountType} (**{last4digits})`
- Hint text for savings_target only: "Progress will reflect this account's balance."

---

## 4. Interaction Model

### Two-stage flow

**Stage 1 — Name + Type selection** (initial state):

1. Modal opens showing: step indicator (step 1), Goal Name input (empty), 2×2 tile grid (all tiles at 45% opacity, non-interactive), "Continue" button disabled
2. User types a name → tiles become fully opaque and interactive; "Continue" button remains disabled until a tile is also selected
3. User selects a tile → adaptive fields animate in (max-height + opacity transition), step indicator advances to step 2, "Continue" button label changes to "Save Goal" and becomes enabled

Note: the footer button is "Save Goal" — there is no separate "Continue" step that navigates away. The label change and the field reveal happen simultaneously. This is a single-modal experience, not a wizard.

**Stage 2 — Details** (after type chosen):

4. Context hint banner appears as the first element inside the adaptive section
5. Amount field (with adaptive label) appears
6. Category field appears immediately below amount — only for `spending_limit`
7. Target Date field appears (optional)
8. Linked Account field appears (optional)
9. User fills in amount (required), optionally fills remaining fields
10. User clicks "Save Goal" — validation runs, `addGoal()` is called, modal closes on success

### Tile unlock gate

- Condition: `name.trim().length > 0`
- When false: tiles are `opacity: 0.45`, `pointer-events: none`, `cursor: default`
- When true: tiles are fully interactive — transition via CSS `opacity` so the change is smooth
- Implementation: drive via a CSS class on the tile grid container (e.g. `goal-modal__tiles--locked` removed when name is non-empty), not inline styles

### Adaptive amount label

The label above the amount input changes based on the selected type:

| `type` value          | Label text        |
| --------------------- | ----------------- |
| `savings_target`      | Target Amount     |
| `debt_payoff`         | Total Debt Amount |
| `net_worth_milestone` | Target Net Worth  |
| `spending_limit`      | Monthly Limit     |

The label is a React state value, not a hardcoded string. Update it in the same handler that updates `type`.

### Category field — conditional display

- React state: `categoryName: string` (default `""`)
- Show condition: `type === "spending_limit"`
- On type change away from `spending_limit`: clear `categoryName` to `""` and hide the field in the same `setState` call
- CSS: use `display: flex` / `display: none` controlled by a class (not `visibility: hidden`) so it removes from flow entirely

### Switching tiles after fields are revealed

- If the user selects a different tile after adaptive fields are already visible: fields remain open (no re-collapse), labels and context hint update instantly, category field shows/hides based on new type, `categoryName` clears if new type is not `spending_limit`

### Validation

- Validate on submit only (not on blur) for a lighter touch — this is a short form
- Required: `name` (min 1, max 100 chars), `targetAmount` (> 0)
- Optional: `targetDate`, `linkedAccountId`, `categoryName`
- On validation failure: show inline error below the offending field, do not close modal, re-enable Save button
- On submit success: call `onClose()` from props

### Submitting state

- Both "Cancel" and "Save Goal" are disabled while `isSubmitting` is true
- Save button text changes to "Saving…" during submission (optional cosmetic enhancement — match AssetModal pattern if it does this)
- On failure: `setIsSubmitting(false)`, keep modal open, show toast (handled by existing `useToast()` hook)

---

## 5. Copy

### Context hint text (per type)

| Type                  | Hint                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `savings_target`      | Track progress towards a specific savings amount. Link an account and your balance will update automatically.       |
| `debt_payoff`         | Track a debt you're paying down. Enter the total owed as the target and update your progress manually.              |
| `net_worth_milestone` | Set a total net worth milestone. Progress is calculated from your accounts automatically.                           |
| `spending_limit`      | Set a monthly cap on spending in a specific transaction category. Your spending will be tracked against this limit. |

### Step indicator labels

| State                      | Text                              |
| -------------------------- | --------------------------------- |
| Stage 1 (no type selected) | Step 1 of 2 — What kind of goal?  |
| Stage 2 (type selected)    | Step 2 of 2 — Fill in the details |

### Field labels

| Field          | Label                | Badge    |
| -------------- | -------------------- | -------- |
| Name           | GOAL NAME            | —        |
| Type grid      | GOAL TYPE            | —        |
| Amount         | Adaptive (see above) | —        |
| Category       | SPENDING CATEGORY    | —        |
| Target Date    | TARGET DATE          | optional |
| Linked Account | LINKED ACCOUNT       | optional |

### Button labels

| Button    | Default   | While submitting  |
| --------- | --------- | ----------------- |
| Primary   | Save Goal | Saving…           |
| Secondary | Cancel    | Cancel (disabled) |

### Placeholder text

| Field             | Placeholder                |
| ----------------- | -------------------------- |
| Goal Name         | e.g. Emergency Fund        |
| Amount            | 0.00                       |
| Spending Category | e.g. Dining, Subscriptions |

### Hints

- Spending Category hint: "Matches the category label on your transactions."
- Linked Account hint (savings_target only): "Progress will reflect this account's balance."

---

## 6. CSS Class Naming

Follow the existing BEM-style pattern used by `NetWorthModal.css` and `AccountModal.css`. Prefix: `goal-modal`.

Key classes:

```
goal-modal__backdrop
goal-modal__panel
goal-modal__header
goal-modal__title
goal-modal__close
goal-modal__body
goal-modal__footer
goal-modal__step-indicator
goal-modal__step-dot          (--active, --complete modifiers)
goal-modal__step-text
goal-modal__field
goal-modal__label
goal-modal__label-badge       (for "optional" text)
goal-modal__input
goal-modal__input--error
goal-modal__error
goal-modal__tiles             (the 2x2 grid)
goal-modal__tiles--locked     (when name is empty)
goal-modal__tile              (--selected modifier)
goal-modal__tile-icon
goal-modal__tile-name
goal-modal__tile-desc
goal-modal__adaptive          (the animated container)
goal-modal__adaptive--visible
goal-modal__context-hint
goal-modal__prefix-wrap
goal-modal__prefix
goal-modal__select-wrap
goal-modal__category          (conditional field wrapper)
goal-modal__category--visible
goal-modal__hint
goal-modal__actions
goal-modal__btn               (--cancel, --save modifiers)
```

---

## 7. Responsive Constraints

- Mobile breakpoint: 375px
- `goal-modal__panel`: `width: 90%` at all sizes; padding reduces to `16px` on mobile
- `goal-modal__tiles`: remains `1fr 1fr` at all sizes (two columns always — tiles are narrow enough at 375px)
- All inputs: `width: 100%`, never overflow parent
- Adaptive fields: no horizontal overflow; `max-width: 100%` on all children
- Footer buttons: maintain `flex-end` row at all sizes (both buttons always visible)
- No horizontal scrollbar at 375px

---

## 8. Edit Mode (T012 — future)

This brief covers add mode only (T006). When T012 extends GoalModal for edit mode:

- Add `goal?: ApiGoal` prop; when provided, pre-populate all fields on mount
- Show `currentAmount` number input (label "Current Progress (NZD)") in edit mode only
- Adaptive fields must be visible immediately on open (no stage 1 gate — type is already known)
- Modal title changes from "Add Goal" to "Edit Goal"
- Submit calls `updateGoal(goal.id, { ... })` instead of `addGoal()`
- The `categoryName` / type relationship and tile interaction model are identical to add mode

---

## 9. Constraints & Non-Goals

- No animation library; all transitions use CSS `transition` and `max-height` technique only
- No third-party form library; state is managed with plain `useState` hooks
- Currency is always NZD — no currency selector
- The "NZD" prefix is a visual affordance only — the value stored and sent to the API is a plain number
- Tile icons use Unicode emoji only — no external icon library
- No progress bar or visual completion indicator inside the modal — those belong on GoalCard
- The `categoryName` field for `spending_limit` is optional per spec edge case; no required marker is shown, but the API will accept an empty string as no category
- Do not add a "type cannot be changed after creation" restriction — the spec allows editing type
