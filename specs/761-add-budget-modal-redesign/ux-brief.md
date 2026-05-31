# UX Brief — #761: Add Budget Modal Redesign (Option A — Direct Match)

## Chosen Option

**Option A — Direct Match**: Faithful port of GoalModal style. Apply `goal-modal__*` classes consistently throughout `AddBudgetModal.tsx`. No new CSS file needed — `GoalModal.css` already contains every required class.

## Mockup Reference

`specs/761-add-budget-modal-redesign/mockups/option-a.html`

---

## Layout & Structure

The modal keeps the existing `createPortal` + `goal-modal__backdrop` + `goal-modal__panel` shell. Internal structure follows GoalModal exactly:

```
goal-modal__backdrop        ← already present, keep as-is
  goal-modal__panel         ← already present, keep as-is
    goal-modal__header      ← title "Add Budget" + close button
    <form>
      goal-modal__body      ← flex column, gap 20px
        goal-modal__context-hint  ← NEW teal banner (see copy below)
        goal-modal__field   ← Category
        goal-modal__field   ← Monthly Limit (with NZD prefix)
        goal-modal__field   ← Month (single <input type="month">)
      goal-modal__footer    ← Cancel + Add Budget buttons
```

---

## Context Hint (new)

Add a `goal-modal__context-hint` banner as the first child of `goal-modal__body`:

> "Set a monthly spending limit for a category. Your actual spending will be tracked against it each month."

No icon — plain text only, matching the GoalModal pattern.

---

## Fields

### Category

- `<label className="goal-modal__label" htmlFor="budget-category">Category</label>`
- `<input className="goal-modal__input" id="budget-category" type="text" maxLength={100} placeholder="e.g. Groceries" />`
- Inline validation: if empty on submit, show `<span className="goal-modal__error" role="alert">Category is required.</span>` below the input and add `goal-modal__input--error` to the input element.

### Monthly Limit

- `<label className="goal-modal__label" htmlFor="budget-limit">Monthly Limit</label>`
- Wrap input in `<div className="goal-modal__prefix-wrap">` with `<span className="goal-modal__prefix">NZD</span>` inside.
- `<input className="goal-modal__input" id="budget-limit" type="number" min="0" step="0.01" placeholder="0.00" />`
- Inline validation: if empty or negative on submit, show `<span className="goal-modal__error" role="alert">Please enter a valid limit (0 or greater).</span>` and add `goal-modal__input--error`.

### Month (combined — replaces two bare number inputs)

- `<label className="goal-modal__label" htmlFor="budget-month">Month <span className="goal-modal__label-badge">(defaults to current)</span></label>`
- `<input className="goal-modal__input" id="budget-month" type="month" style={{ colorScheme: 'dark' }} />`
- `<span className="goal-modal__hint">Budgets apply to a single calendar month.</span>`
- Default value: format `selectedYear` and `selectedMonth` from `useBudgets()` as `"YYYY-MM"` (e.g. `"2026-05"`).
- On submit, parse the `YYYY-MM` string back to `year: number` and `month: number` before calling `addBudget(...)`.
- No validation error needed beyond browser-native `required` enforcement.

---

## Footer Buttons

- Cancel: `<button type="button" className="goal-modal__btn goal-modal__btn--cancel" onClick={onClose}>Cancel</button>`
- Submit: `<button type="submit" className="goal-modal__btn goal-modal__btn--save" disabled={submitting}>{submitting ? "Adding..." : "Add Budget"}</button>`

Note: the current code uses `goal-modal__btn--secondary` / `goal-modal__btn--primary` — replace both with the correct GoalModal class names (`goal-modal__btn--cancel` / `goal-modal__btn--save`).

---

## What Does NOT Change

- `createPortal(…, document.body)` — keep as-is.
- `role="dialog"`, `aria-modal="true"`, `aria-label="Add Budget"` — keep as-is.
- The `useBudgets()` context hook and the `addBudget(...)` call signature — keep as-is.
- No step indicator — budget has fewer fields and doesn't need one.
- No new CSS file — all required classes already exist in `GoalModal.css`.

---

## Inline Validation Behaviour

- Validation runs on submit (not on blur).
- Each field independently shows its error below the input.
- Error clears as soon as the user corrects the field (controlled via React state).
- Use a `errors: { category?: string; limit?: string }` state object to track field-level errors.

---

## Acceptance Criteria Mapping

| AC                                  | Implementation                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| Visually matches GoalModal          | All `goal-modal__*` classes applied consistently                                    |
| Uses correct CSS classes            | `goal-modal__label`, `goal-modal__input`, `goal-modal__field`, `goal-modal__footer` |
| Single month picker                 | `<input type="month">` replaces separate year + month number inputs                 |
| Inline validation matches GoalModal | `goal-modal__input--error` + `goal-modal__error` span                               |
| Correct footer buttons              | `goal-modal__btn--cancel` / `goal-modal__btn--save`                                 |
| No step indicator                   | Omitted                                                                             |
| Existing functionality preserved    | `createPortal`, `addBudget`, category/year/month/limit all preserved                |
