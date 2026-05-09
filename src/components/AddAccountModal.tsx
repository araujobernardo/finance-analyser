import { useState } from "react";
import { useAccount } from "../context/AccountContext";
import type { ApiAccount } from "../types/api";
import "./AccountModal.css";

const ACCOUNT_TYPES: ApiAccount["accountType"][] = [
  "Checking",
  "Savings",
  "Credit Card",
  "Investment",
  "Cash",
];

interface AddAccountModalProps {
  onClose: () => void;
}

export function AddAccountModal({ onClose }: AddAccountModalProps) {
  const { accounts, addAccount } = useAccount();
  const [nickname, setNickname] = useState("");
  const [accountType, setAccountType] =
    useState<ApiAccount["accountType"]>("Checking");
  const [nicknameError, setNicknameError] = useState("");

  function validate(value: string): string {
    if (!value.trim()) return "Account name is required.";
    if (value.trim().length > 100)
      return "Account name must be 100 characters or fewer.";
    if (
      accounts.some(
        (a) => a.nickname.toLowerCase() === value.trim().toLowerCase(),
      )
    ) {
      return "An account with this name already exists.";
    }
    return "";
  }

  function handleSave() {
    const error = validate(nickname);
    if (error) {
      setNicknameError(error);
      return;
    }
    void addAccount(nickname.trim(), accountType);
    onClose();
  }

  function handleNicknameChange(value: string) {
    setNickname(value);
    if (nicknameError) setNicknameError(validate(value));
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
            className={`account-modal__input${nicknameError ? " account-modal__input--error" : ""}`}
            value={nickname}
            onChange={(e) => handleNicknameChange(e.target.value)}
            maxLength={100}
            placeholder="e.g. Savings"
            aria-describedby={nicknameError ? "account-name-error" : undefined}
            autoFocus
          />
          {nicknameError && (
            <span
              id="account-name-error"
              className="account-modal__error"
              role="alert"
            >
              {nicknameError}
            </span>
          )}
        </div>

        <div className="account-modal__field">
          <label className="account-modal__label" htmlFor="account-type-select">
            Account Type
          </label>
          <select
            id="account-type-select"
            className="account-modal__input"
            value={accountType}
            onChange={(e) =>
              setAccountType(e.target.value as ApiAccount["accountType"])
            }
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
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
