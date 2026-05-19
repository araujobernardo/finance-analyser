// FA-BUDG-002 T020 / T025 — Manage Budget Defaults Modal (includes monthStartDay preference)

import { useState } from "react";
import { useBudgets } from "../../context/BudgetContext";

const nzd = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
});

interface ManageDefaultsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageDefaultsModal({
  isOpen,
  onClose,
}: ManageDefaultsModalProps) {
  const {
    budgetDefaults,
    preferences,
    upsertDefault,
    deleteDefault,
    updatePreferences,
  } = useBudgets();

  const [newCategory, setNewCategory] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [monthStartDayValue, setMonthStartDayValue] = useState(
    String(preferences?.monthStartDay ?? 1),
  );
  const [monthStartDayError, setMonthStartDayError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddDefault = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(newLimit);
    if (!newCategory.trim() || isNaN(limit) || limit < 0) return;
    setSubmitting(true);
    await upsertDefault({
      categoryName: newCategory.trim(),
      limitAmount: limit,
    });
    setSubmitting(false);
    setNewCategory("");
    setNewLimit("");
  };

  const handleMonthStartDayChange = async (value: string) => {
    setMonthStartDayValue(value);
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 28) {
      setMonthStartDayError("Must be between 1 and 28");
      return;
    }
    setMonthStartDayError("");
    await updatePreferences(parsed);
  };

  return (
    <div
      className="goal-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Manage Budget Defaults"
    >
      <div className="goal-modal__panel">
        <div className="goal-modal__header">
          <h2 className="goal-modal__title">Manage Budget Defaults</h2>
          <button
            type="button"
            className="goal-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="goal-modal__body">
          {/* Existing defaults */}
          {budgetDefaults.length > 0 ? (
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
              {budgetDefaults.map((d) => (
                <DefaultRow
                  key={d.id}
                  id={d.id}
                  categoryName={d.categoryName}
                  limitAmount={d.limitAmount}
                  onUpsert={upsertDefault}
                  onDelete={deleteDefault}
                />
              ))}
            </ul>
          ) : (
            <p
              style={{ color: "var(--text-muted, #6b7280)", marginBottom: 16 }}
            >
              No defaults set yet.
            </p>
          )}

          {/* Add new default */}
          <form
            onSubmit={(e) => void handleAddDefault(e)}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <strong>Add new default</strong>
            <div className="goal-modal__field">
              <label htmlFor="default-category">Category</label>
              <input
                id="default-category"
                type="text"
                maxLength={100}
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Groceries"
                required
              />
            </div>
            <div className="goal-modal__field">
              <label htmlFor="default-limit">Default Limit (NZD)</label>
              <input
                id="default-limit"
                type="number"
                min="0"
                step="0.01"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <button
              type="submit"
              className="goal-modal__btn goal-modal__btn--primary"
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save Default"}
            </button>
          </form>

          {/* Preferences — monthStartDay */}
          <div
            style={{
              marginTop: 24,
              borderTop: "1px solid var(--border, #e5e7eb)",
              paddingTop: 16,
            }}
          >
            <strong>Preferences</strong>
            <div className="goal-modal__field" style={{ marginTop: 8 }}>
              <label htmlFor="month-start-day">Month start day (1–28)</label>
              <input
                id="month-start-day"
                type="number"
                min="1"
                max="28"
                value={monthStartDayValue}
                onChange={(e) => void handleMonthStartDayChange(e.target.value)}
              />
              {monthStartDayError && (
                <span
                  style={{
                    color: "var(--colour-danger, #ef4444)",
                    fontSize: "0.8rem",
                  }}
                >
                  {monthStartDayError}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Inline row for an existing default ───────────────────────────────────────

interface DefaultRowProps {
  id: string;
  categoryName: string;
  limitAmount: number;
  onUpsert: (data: {
    categoryName: string;
    limitAmount: number;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function DefaultRow({
  id,
  categoryName,
  limitAmount,
  onUpsert,
  onDelete,
}: DefaultRowProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(limitAmount));

  const handleSave = async () => {
    const val = parseFloat(editValue);
    if (!isNaN(val) && val >= 0) {
      await onUpsert({ categoryName, limitAmount: val });
    }
    setEditing(false);
  };

  return (
    <li
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "6px 0",
        borderBottom: "1px solid var(--border, #e5e7eb)",
        gap: 8,
      }}
    >
      <span style={{ flexGrow: 1 }}>{categoryName}</span>
      {editing ? (
        <>
          <input
            type="number"
            min="0"
            step="0.01"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            style={{ width: 90, padding: "2px 6px", fontSize: "0.875rem" }}
            autoFocus
          />
          <button
            type="button"
            className="budget-row__btn"
            onClick={() => void handleSave()}
          >
            Save
          </button>
          <button
            type="button"
            className="budget-row__btn"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <span>{nzd.format(limitAmount)}</span>
          <button
            type="button"
            className="budget-row__btn"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
          <button
            type="button"
            className="budget-row__btn budget-row__btn--danger"
            onClick={() => void onDelete(id)}
          >
            Delete
          </button>
        </>
      )}
    </li>
  );
}
