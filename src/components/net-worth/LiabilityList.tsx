import { useState } from "react";
import { useNetWorth } from "../../context/NetWorthContext";
import type { ApiLiability } from "../../types/api";
import { LiabilityModal } from "./LiabilityModal";

const LIABILITY_TYPES = [
  "mortgage",
  "personal_loan",
  "car_loan",
  "student_loan",
  "credit_card",
  "other",
] as const;

const NZD = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
});

function formatType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function LiabilityList() {
  const { liabilities, removeLiability } = useNetWorth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLiability, setEditingLiability] = useState<ApiLiability | null>(
    null,
  );

  const totalLiabilities = liabilities.reduce(
    (sum, l) => sum + parseFloat(l.value),
    0,
  );

  // Group by type in canonical order
  const grouped = LIABILITY_TYPES.map((type) => ({
    type,
    items: liabilities.filter((l) => l.type === type),
  })).filter((g) => g.items.length > 0);

  // Include any types not in LIABILITY_TYPES (future-proofing)
  const knownTypes = new Set(LIABILITY_TYPES as unknown as string[]);
  const unknownItems = liabilities.filter((l) => !knownTypes.has(l.type));
  if (unknownItems.length > 0) {
    grouped.push({ type: "other", items: unknownItems });
  }

  async function handleDelete(id: string) {
    await removeLiability(id);
  }

  return (
    <section className="nw-list" data-testid="liability-list">
      <div className="nw-list__header">
        <h2 className="nw-list__title">Liabilities</h2>
        <button
          className="nw-list__add-btn"
          onClick={() => setShowAddModal(true)}
          data-testid="add-liability-btn"
        >
          + Add
        </button>
      </div>

      {grouped.length === 0 ? (
        <p className="nw-list__empty">
          No liabilities yet. Add one to get started.
        </p>
      ) : (
        grouped.map((group) => {
          const groupTotal = group.items.reduce(
            (sum, l) => sum + parseFloat(l.value),
            0,
          );
          return (
            <div key={group.type} className="nw-list__group">
              <div className="nw-list__group-header">
                <span className="nw-list__group-label">
                  {formatType(group.type)}
                </span>
                <span className="nw-list__group-total">
                  {NZD.format(groupTotal)}
                </span>
              </div>
              {group.items.map((liability) => (
                <div
                  key={liability.id}
                  className="nw-list__row"
                  data-testid="liability-row"
                >
                  <span className="nw-list__row-name">{liability.name}</span>
                  <span className="nw-list__row-value">
                    {NZD.format(parseFloat(liability.value))}
                  </span>
                  <div className="nw-list__row-actions">
                    <button
                      className="nw-list__row-btn"
                      onClick={() => setEditingLiability(liability)}
                      aria-label={`Edit ${liability.name}`}
                      data-testid="edit-liability-btn"
                    >
                      ✎
                    </button>
                    <button
                      className="nw-list__row-btn nw-list__row-btn--danger"
                      onClick={() => void handleDelete(liability.id)}
                      aria-label={`Delete ${liability.name}`}
                      data-testid="delete-liability-btn"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })
      )}

      <div className="nw-list__total-row">
        <span className="nw-list__total-label">Total Liabilities</span>
        <span className="nw-list__total-value">
          {NZD.format(totalLiabilities)}
        </span>
      </div>

      {showAddModal && (
        <LiabilityModal onClose={() => setShowAddModal(false)} />
      )}
      {editingLiability && (
        <LiabilityModal
          liability={editingLiability}
          onClose={() => setEditingLiability(null)}
        />
      )}
    </section>
  );
}
