import { useState } from "react";
import { ACCOUNT_COLOURS } from "../services/storage";
import { useAccount } from "../context/AccountContext";
import "./AccountModal.css";

interface AddAccountModalProps {
  onClose: () => void;
}

export function AddAccountModal({ onClose }: AddAccountModalProps) {
  const { accounts, addAccount } = useAccount();
  const [name, setName] = useState("");
  const [colour, setColour] = useState(ACCOUNT_COLOURS[0]);
  const [nameError, setNameError] = useState("");

  function validate(value: string): string {
    if (!value.trim()) return "Account name is required.";
    if (value.trim().length > 40)
      return "Account name must be 40 characters or fewer.";
    if (
      accounts.some((a) => a.name.toLowerCase() === value.trim().toLowerCase())
    ) {
      return "An account with this name already exists.";
    }
    return "";
  }

  function handleSave() {
    const error = validate(name);
    if (error) {
      setNameError(error);
      return;
    }
    addAccount({
      id: crypto.randomUUID(),
      name: name.trim(),
      colour,
      createdAt: new Date().toISOString(),
    });
    onClose();
  }

  function handleNameChange(value: string) {
    setName(value);
    if (nameError) setNameError(validate(value));
  }

  return (
    <div
      className="account-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-account-modal-title"
    >
      <div className="account-modal__panel">
        <h2 className="account-modal__title" id="add-account-modal-title">
          Add Account
        </h2>

        <div className="account-modal__field">
          <label className="account-modal__label" htmlFor="account-name-input">
            Account Name
          </label>
          <input
            id="account-name-input"
            type="text"
            className={`account-modal__input${nameError ? " account-modal__input--error" : ""}`}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            maxLength={40}
            placeholder="e.g. Savings"
            aria-describedby={nameError ? "account-name-error" : undefined}
            autoFocus
          />
          {nameError && (
            <span
              id="account-name-error"
              className="account-modal__error"
              role="alert"
            >
              {nameError}
            </span>
          )}
        </div>

        <div className="account-modal__field">
          <span className="account-modal__label" id="colour-picker-label">
            Colour
          </span>
          <div
            className="account-modal__swatches"
            role="radiogroup"
            aria-labelledby="colour-picker-label"
          >
            {ACCOUNT_COLOURS.map((c) => (
              <button
                key={c}
                type="button"
                className={`account-modal__swatch${colour === c ? " account-modal__swatch--selected" : ""}`}
                style={{ backgroundColor: c }}
                aria-label={`Colour ${c}`}
                aria-checked={colour === c}
                role="radio"
                onClick={() => setColour(c)}
              />
            ))}
          </div>
        </div>

        <div className="account-modal__actions">
          <button
            type="button"
            className="account-modal__btn account-modal__btn--cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="account-modal__btn account-modal__btn--save"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
