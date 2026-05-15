import { useState } from "react";
import { useNetWorth } from "../../context/NetWorthContext";
import { useAccount } from "../../context/AccountContext";
import type { ApiLiability } from "../../types/api";
import "./NetWorthModal.css";

const LIABILITY_TYPES = [
  "mortgage",
  "personal_loan",
  "car_loan",
  "student_loan",
  "credit_card",
  "other",
] as const;

interface LiabilityModalProps {
  liability?: ApiLiability;
  onClose: () => void;
}

export function LiabilityModal({ liability, onClose }: LiabilityModalProps) {
  const { addLiability, updateLiability } = useNetWorth();
  const { accounts } = useAccount();

  const isEditing = Boolean(liability);
  const [name, setName] = useState(liability?.name ?? "");
  const [type, setType] = useState<string>(liability?.type ?? "mortgage");
  const [value, setValue] = useState(
    liability ? parseFloat(liability.value).toString() : "",
  );
  const [linkedAccountId, setLinkedAccountId] = useState<string>(
    liability?.linkedAccountId ?? "",
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
    const num = parseFloat(v);
    if (!v.trim() || isNaN(num)) return "Enter a valid number.";
    if (num < 0) return "Value must be 0 or greater.";
    return "";
  }

  async function handleSave() {
    const nErr = validateName(name);
    const vErr = validateValue(value);
    if (nErr) setNameError(nErr);
    if (vErr) setValueError(vErr);
    if (nErr || vErr) return;

    setIsSubmitting(true);
    const data = {
      name: name.trim(),
      type,
      value: parseFloat(value),
      linkedAccountId: linkedAccountId || null,
    };

    const success = isEditing
      ? await updateLiability(liability!.id, data)
      : await addLiability(data);

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
      aria-labelledby="liability-modal-title"
    >
      <div className="nw-modal__panel">
        <h2 className="nw-modal__title" id="liability-modal-title">
          {isEditing ? "Edit Liability" : "Add Liability"}
        </h2>

        <div className="nw-modal__field">
          <label className="nw-modal__label" htmlFor="liability-name-input">
            Name
          </label>
          <input
            id="liability-name-input"
            type="text"
            className={`nw-modal__input${nameError ? " nw-modal__input--error" : ""}`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(validateName(e.target.value));
            }}
            maxLength={100}
            placeholder="e.g. Home Loan"
            autoFocus
          />
          {nameError && (
            <span className="nw-modal__error" role="alert">
              {nameError}
            </span>
          )}
        </div>

        <div className="nw-modal__field">
          <label className="nw-modal__label" htmlFor="liability-type-select">
            Type
          </label>
          <select
            id="liability-type-select"
            className="nw-modal__input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {LIABILITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t
                  .split("_")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ")}
              </option>
            ))}
          </select>
        </div>

        <div className="nw-modal__field">
          <label className="nw-modal__label" htmlFor="liability-value-input">
            Value (NZD)
          </label>
          <input
            id="liability-value-input"
            type="number"
            min="0"
            step="0.01"
            className={`nw-modal__input${valueError ? " nw-modal__input--error" : ""}`}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (valueError) setValueError(validateValue(e.target.value));
            }}
            placeholder="0.00"
          />
          {valueError && (
            <span className="nw-modal__error" role="alert">
              {valueError}
            </span>
          )}
        </div>

        <div className="nw-modal__field">
          <label
            className="nw-modal__label"
            htmlFor="liability-linked-account-select"
          >
            Linked Account (optional)
          </label>
          <select
            id="liability-linked-account-select"
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
