// FA-BUDG-002 T013 — Add Budget Modal

import { useState } from "react";
import { useBudgets } from "../../context/BudgetContext";

interface AddBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddBudgetModal({ isOpen, onClose }: AddBudgetModalProps) {
  const { addBudget, selectedYear, selectedMonth } = useBudgets();
  const [categoryName, setCategoryName] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [year, setYear] = useState(String(selectedYear));
  const [month, setMonth] = useState(String(selectedMonth));
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(limitAmount);
    const yr = parseInt(year, 10);
    const mo = parseInt(month, 10);
    if (
      !categoryName.trim() ||
      isNaN(limit) ||
      limit < 0 ||
      isNaN(yr) ||
      isNaN(mo)
    ) {
      return;
    }
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
    onClose();
  };

  return (
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
            ×
          </button>
        </div>
        <form
          className="goal-modal__body"
          onSubmit={(e) => void handleSubmit(e)}
        >
          <div className="goal-modal__field">
            <label htmlFor="budget-category">Category</label>
            <input
              id="budget-category"
              type="text"
              maxLength={100}
              required
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Groceries"
            />
          </div>
          <div className="goal-modal__field">
            <label htmlFor="budget-limit">Monthly Limit (NZD)</label>
            <input
              id="budget-limit"
              type="number"
              min="0"
              step="0.01"
              required
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="goal-modal__field">
            <label htmlFor="budget-month">Month (1–12)</label>
            <input
              id="budget-month"
              type="number"
              min="1"
              max="12"
              required
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div className="goal-modal__field">
            <label htmlFor="budget-year">Year</label>
            <input
              id="budget-year"
              type="number"
              min="2000"
              max="2100"
              required
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
          <div className="goal-modal__footer">
            <button
              type="button"
              className="goal-modal__btn goal-modal__btn--secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="goal-modal__btn goal-modal__btn--primary"
              disabled={submitting}
            >
              {submitting ? "Adding..." : "Add Budget"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
