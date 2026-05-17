import { useState } from "react";
import { useNetWorth } from "../../context/NetWorthContext";
import { useAccount } from "../../context/AccountContext";
import type { ApiAsset } from "../../types/api";
import "./NetWorthModal.css";

const ASSET_TYPES = [
  "property",
  "investments",
  "kiwisaver",
  "savings",
  "vehicle",
  "other",
] as const;

interface AssetModalProps {
  asset?: ApiAsset;
  onClose: () => void;
}

export function AssetModal({ asset, onClose }: AssetModalProps) {
  const { addAsset, updateAsset } = useNetWorth();
  const { accounts } = useAccount();

  const isEditing = Boolean(asset);

  // FA-NW-004: derived auto-sync state — read-only when linked account + autoSync=true
  const isAutoSynced = Boolean(asset?.linkedAccountId && asset?.autoSync);

  const [name, setName] = useState(asset?.name ?? "");
  const [type, setType] = useState<string>(asset?.type ?? "property");
  const [value, setValue] = useState(
    asset ? parseFloat(asset.value).toString() : "",
  );
  const [linkedAccountId, setLinkedAccountId] = useState<string>(
    asset?.linkedAccountId ?? "",
  );
  const [nameError, setNameError] = useState("");
  const [valueError, setValueError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateName(v: string): string {
    if (!v.trim()) return "Name is required.";
    if (v.trim().length > 100) return "Name must be 100 characters or fewer.";
    return "";
  }

  function validateValue(v: string): string {
    if (isAutoSynced) return ""; // read-only; skip validation
    const num = parseFloat(v);
    if (!v.trim() || isNaN(num)) return "Enter a valid number.";
    if (num < 0) return "Value must be 0 or greater.";
    return "";
  }

  async function handleSave() {
    const nErr = validateName(name);
    const vErr = isAutoSynced ? "" : validateValue(value);
    if (nErr) setNameError(nErr);
    if (vErr) setValueError(vErr);
    if (nErr || vErr) return;

    setIsSubmitting(true);

    // When auto-synced, omit value from payload so the server keeps the synced value
    const data = isAutoSynced
      ? {
          name: name.trim(),
          type,
          linkedAccountId: linkedAccountId || null,
        }
      : {
          name: name.trim(),
          type,
          value: parseFloat(value),
          linkedAccountId: linkedAccountId || null,
        };

    const success = isEditing
      ? await updateAsset(asset!.id, data)
      : await addAsset({
          ...data,
          value: isAutoSynced ? 0 : parseFloat(value),
        });

    if (success) {
      onClose();
    } else {
      setIsSubmitting(false);
    }
  }

  async function handleReEnableAutoSync() {
    if (!asset) return;
    setIsSubmitting(true);
    const success = await updateAsset(asset.id, { autoSync: true });
    if (success) {
      onClose();
    } else {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="nw-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-modal-title"
    >
      <div className="nw-modal__panel">
        <h2 className="nw-modal__title" id="asset-modal-title">
          {isEditing ? "Edit Asset" : "Add Asset"}
        </h2>

        <div className="nw-modal__field">
          <label className="nw-modal__label" htmlFor="asset-name-input">
            Name
          </label>
          <input
            id="asset-name-input"
            type="text"
            className={`nw-modal__input${nameError ? " nw-modal__input--error" : ""}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(validateName(e.target.value));
            }}
            maxLength={100}
            placeholder="e.g. Home"
            autoFocus
          />
          {nameError && (
            <span className="nw-modal__error" role="alert">
              {nameError}
            </span>
          )}
        </div>

        <div className="nw-modal__field">
          <label className="nw-modal__label" htmlFor="asset-type-select">
            Type
          </label>
          <select
            id="asset-type-select"
            className="nw-modal__input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="nw-modal__field">
          <div className="nw-modal__label-row">
            <label className="nw-modal__label" htmlFor="asset-value-input">
              Value (NZD)
            </label>
            {isAutoSynced && (
              <span
                className="nw-modal__auto-badge"
                data-testid="auto-synced-badge"
              >
                Auto-synced
              </span>
            )}
          </div>
          {isAutoSynced && asset?.balanceClamped && (
            <p
              className="nw-modal__clamp-warning"
              data-testid="balance-clamped-warning"
              role="alert"
            >
              ⚠ Account balance is negative — value clamped to $0.00
            </p>
          )}
          <input
            id="asset-value-input"
            type="number"
            min="0"
            step="0.01"
            className={`nw-modal__input${valueError ? " nw-modal__input--error" : ""}${isAutoSynced ? " nw-modal__input--readonly" : ""}`}
            value={value}
            readOnly={isAutoSynced}
            onChange={
              isAutoSynced
                ? undefined
                : (e) => {
                    setValue(e.target.value);
                    if (valueError)
                      setValueError(validateValue(e.target.value));
                  }
            }
            placeholder="0.00"
          />
          {valueError && (
            <span className="nw-modal__error" role="alert">
              {valueError}
            </span>
          )}
          {isEditing && isAutoSynced === false && asset?.linkedAccountId && (
            <button
              type="button"
              className="nw-modal__re-enable-btn"
              data-testid="re-enable-auto-sync-btn"
              onClick={() => void handleReEnableAutoSync()}
              disabled={isSubmitting}
            >
              Re-enable auto-sync
            </button>
          )}
        </div>

        <div className="nw-modal__field">
          <label
            className="nw-modal__label"
            htmlFor="asset-linked-account-select"
          >
            Linked Account (optional)
          </label>
          <select
            id="asset-linked-account-select"
            className="nw-modal__input"
            value={linkedAccountId}
            onChange={(e) => setLinkedAccountId(e.target.value)}
          >
            <option value="">— None —</option>
            {accounts.map((acct) => (
              <option key={acct.id} value={acct.id}>
                {acct.nickname}
              </option>
            ))}
          </select>
        </div>

        <div className="nw-modal__actions">
          <button
            type="button"
            className="nw-modal__btn nw-modal__btn--cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="nw-modal__btn nw-modal__btn--save"
            onClick={() => void handleSave()}
            disabled={isSubmitting}
          >
            {isEditing ? "Save" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}
