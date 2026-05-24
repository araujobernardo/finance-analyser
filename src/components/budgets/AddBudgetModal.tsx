// FA-BUDG-002 T013 — Add Budget Modal

import { useState } from "react";
import { createPortal } from "react-dom";
import { useBudgets } from "../../context/BudgetContext";

interface AddBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function toMonthValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function AddBudgetModal({ isOpen, onClose }: AddBudgetModalProps) {
  const { addBudget, selectedYear, selectedMonth } = useBudgets();
  const [categoryName, setCategoryName] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [monthValue, setMonthValue] = useState(
    toMonthValue(selectedYear, selectedMonth),
  );
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ category?: string; limit?: string }>(
    {},
  );

  if (!isOpen) return null;

  function validate(): { category?: string; limit?: string } {
    const next: { category?: string; limit?: string } = {};
    if (!categoryName.trim()) {
      next.category = "Category is required.";
    }
    const limit = parseFloat(limitAmount);
    if (limitAmount.trim() === "" || isNaN(limit) || limit < 0) {
      next.limit = "Please enter a valid limit (0 or greater).";
    }
    return next;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next = validate();
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    const limit = parseFloat(limitAmount);
    const [yr, mo] = monthValue.split("-").map(Number);
    setSubmitting(true);
    await addBudget({
      categoryName: categoryName.trim(),
      year: yr,
      month: mo,
      limitAmount: limit,
    });
    setSubmitting(false);
    setCategoryName("");
    setLimitAmount("");
    setMonthValue(toMonthValue(selectedYear, selectedMonth));
    onClose();
  };

  return createPortal(
    <div
      className="goal-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Add Budget"
    >
      <div className="goal-modal__panel">
        <div className="goal-modal__header">
          <h2 className="goal-modal__title">Add Budget</h2>
          <button
            type="button"
            className="goal-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <form
          className="goal-modal__body"
          onSubmit={(e) => void handleSubmit(e)}
        >
          <p className="goal-modal__context-hint">
            Set a monthly spending limit for a category. Your actual spending
            will be tracked against it each month.
          </p>

          {/* Category */}
          <div className="goal-modal__field">
            <label className="goal-modal__label" htmlFor="budget-category">
              Category
            </label>
            <input
              id="budget-category"
              data-testid="budget-modal-category-input"
              type="text"
              className={`goal-modal__input${errors.category ? " goal-modal__input--error" : ""}`}
              maxLength={100}
              placeholder="e.g. Groceries"
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                if (errors.category && e.target.value.trim()) {
                  setErrors((prev) => ({ ...prev, category: undefined }));
                }
              }}
            />
            {errors.category && (
              <span className="goal-modal__error" role="alert">
                {errors.category}
              </span>
            )}
          </div>

          {/* Monthly Limit */}
          <div className="goal-modal__field">
            <label className="goal-modal__label" htmlFor="budget-limit">
              Monthly Limit
            </label>
            <div className="goal-modal__prefix-wrap">
              <span className="goal-modal__prefix">NZD</span>
              <input
                id="budget-limit"
                data-testid="budget-modal-limit-input"
                type="number"
                min="0"
                step="0.01"
                className={`goal-modal__input${errors.limit ? " goal-modal__input--error" : ""}`}
                placeholder="0.00"
                value={limitAmount}
                onChange={(e) => {
                  setLimitAmount(e.target.value);
                  const val = parseFloat(e.target.value);
                  if (errors.limit && !isNaN(val) && val >= 0) {
                    setErrors((prev) => ({ ...prev, limit: undefined }));
                  }
                }}
              />
            </div>
            {errors.limit && (
              <span className="goal-modal__error" role="alert">
                {errors.limit}
              </span>
            )}
          </div>

          {/* Month */}
          <div className="goal-modal__field">
            <label className="goal-modal__label" htmlFor="budget-month">
              Month{" "}
              <span className="goal-modal__label-badge">
                (defaults to current)
              </span>
            </label>
            <input
              id="budget-month"
              data-testid="budget-modal-month-input"
              type="month"
              className="goal-modal__input"
              style={{ colorScheme: "dark" }}
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              required
            />
            <span className="goal-modal__hint">
              Budgets apply to a single calendar month.
            </span>
          </div>

          <div className="goal-modal__footer">
            <button
              type="button"
              className="goal-modal__btn goal-modal__btn--cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="budget-modal-submit-btn"
              className="goal-modal__btn goal-modal__btn--save"
              disabled={submitting}
            >
              {submitting ? "Adding..." : "Add Budget"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
