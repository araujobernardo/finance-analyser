import { useState } from "react";
import { useNetWorth } from "../../context/NetWorthContext";
import type { ApiAsset } from "../../types/api";
import { AssetModal } from "./AssetModal";

const ASSET_TYPES = [
  "property",
  "investments",
  "kiwisaver",
  "savings",
  "vehicle",
  "other",
] as const;

const NZD = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
});

function formatType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function AssetList() {
  const { assets, removeAsset } = useNetWorth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<ApiAsset | null>(null);

  const totalAssets = assets.reduce((sum, a) => sum + parseFloat(a.value), 0);

  // Group by type in canonical order, then "other"
  const grouped = ASSET_TYPES.map((type) => ({
    type,
    items: assets.filter((a) => a.type === type),
  })).filter((g) => g.items.length > 0);

  // Include any types not in ASSET_TYPES (future-proofing)
  const knownTypes = new Set(ASSET_TYPES as unknown as string[]);
  const unknownItems = assets.filter((a) => !knownTypes.has(a.type));
  if (unknownItems.length > 0) {
    grouped.push({ type: "other", items: unknownItems });
  }

  async function handleDelete(id: string) {
    await removeAsset(id);
  }

  return (
    <section className="nw-list" data-testid="asset-list">
      <div className="nw-list__header">
        <h2 className="nw-list__title">Assets</h2>
        <button
          className="nw-list__add-btn"
          onClick={() => setShowAddModal(true)}
          data-testid="add-asset-btn"
        >
          + Add
        </button>
      </div>

      {grouped.length === 0 ? (
        <p className="nw-list__empty">No assets yet. Add one to get started.</p>
      ) : (
        grouped.map((group) => {
          const groupTotal = group.items.reduce(
            (sum, a) => sum + parseFloat(a.value),
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
              {group.items.map((asset) => (
                <div
                  key={asset.id}
                  className="nw-list__row"
                  data-testid="asset-row"
                >
                  <span className="nw-list__row-name">{asset.name}</span>
                  <span className="nw-list__row-value">
                    {NZD.format(parseFloat(asset.value))}
                  </span>
                  <div className="nw-list__row-actions">
                    <button
                      className="nw-list__row-btn"
                      onClick={() => setEditingAsset(asset)}
                      aria-label={`Edit ${asset.name}`}
                      data-testid="edit-asset-btn"
                    >
                      ✎
                    </button>
                    <button
                      className="nw-list__row-btn nw-list__row-btn--danger"
                      onClick={() => void handleDelete(asset.id)}
                      aria-label={`Delete ${asset.name}`}
                      data-testid="delete-asset-btn"
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
        <span className="nw-list__total-label">Total Assets</span>
        <span className="nw-list__total-value">{NZD.format(totalAssets)}</span>
      </div>

      {showAddModal && <AssetModal onClose={() => setShowAddModal(false)} />}
      {editingAsset && (
        <AssetModal
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
        />
      )}
    </section>
  );
}
