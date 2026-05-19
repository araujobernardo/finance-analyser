// FA-BUDG-002 T006 / T014 — Budget row component with inline edit and delete

import { useState, useRef } from "react";
import type { ApiBudget } from "../../types/api";
import { useBudgets } from "../../context/BudgetContext";
import "./BudgetRow.css";

const nzd = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
});

function formatNzd(value: number): string {
  return nzd.format(value);
}

function getBarClass(percentageUsed: number): string {
  if (percentageUsed >= 100) return "bar-fill bar-red";
  if (percentageUsed >= 80) return "bar-fill bar-amber";
  return "bar-fill bar-green";
}

interface BudgetRowProps {
  budget: ApiBudget;
}

export function BudgetRow({ budget }: BudgetRowProps) {
  const { updateBudget, deleteBudget } = useBudgets();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(budget.limitAmount));
  const inputRef = useRef<HTMLInputElement>(null);

  const barClass = getBarClass(budget.percentageUsed);
  const isOver = budget.remaining < 0;

  const handleEditStart = () => {
    setEditValue(String(budget.limitAmount));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleEditSubmit = async () => {
    const newLimit = parseFloat(editValue);
    if (!isNaN(newLimit) && newLimit >= 0) {
      await updateBudget(budget.id, newLimit);
    }
    setEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void handleEditSubmit();
    } else if (e.key === "Escape") {
      setEditing(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Delete budget for "${budget.categoryName}"?`)) {
      void deleteBudget(budget.id);
    }
  };

  return (
    <div className="budget-row" data-testid={`budget-row-${budget.id}`}>
      <div className="budget-row__meta">
        <span className="budget-row__category">{budget.categoryName}</span>
        <span className="budget-row__percent">
          {Math.round(budget.percentageUsed)}%
        </span>
      </div>

      <div
        className="bar-track"
        role="progressbar"
        aria-valuenow={Math.round(budget.percentageUsed)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={barClass}
          style={{ width: `${Math.min(budget.percentageUsed, 100)}%` }}
        />
      </div>

      <div className="budget-row__amounts">
        <span>Spent: {formatNzd(budget.actualSpend)}</span>
        <span>/</span>
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            min="0"
            step="0.01"
            className="budget-row__inline-input"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => void handleEditSubmit()}
            onKeyDown={handleEditKeyDown}
            aria-label="Edit limit amount"
          />
        ) : (
          <span>Limit: {formatNzd(budget.limitAmount)}</span>
        )}
        <span className={isOver ? "budget-row__over" : ""}>
          {isOver
            ? `–${formatNzd(Math.abs(budget.remaining))} over`
            : `${formatNzd(budget.remaining)} remaining`}
        </span>
      </div>

      <div className="budget-row__actions">
        {editing ? (
          <button
            type="button"
            className="budget-row__btn"
            onClick={() => void handleEditSubmit()}
          >
            Save
          </button>
        ) : (
          <button
            type="button"
            className="budget-row__btn"
            onClick={handleEditStart}
            aria-label={`Edit limit for ${budget.categoryName}`}
          >
            Edit
          </button>
        )}
        <button
          type="button"
          className="budget-row__btn budget-row__btn--danger"
          onClick={handleDelete}
          aria-label={`Delete budget for ${budget.categoryName}`}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
