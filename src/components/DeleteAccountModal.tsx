import { useState } from "react";
import { createPortal } from "react-dom";
import { useAccount } from "../context/AccountContext";
import "./AccountModal.css";

interface DeleteAccountModalProps {
  accountId: string;
  onClose: () => void;
}

export function DeleteAccountModal({
  accountId,
  onClose,
}: DeleteAccountModalProps) {
  const { accounts, removeAccount } = useAccount();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const account = accounts.find((a) => a.id === accountId);
  // Transactions are API-backed; localStorage month count is always 0.
  // Transaction counts are handled server-side on DELETE /api/accounts/:id.
  const monthCount = 0;
  const isLastAccount = accounts.length <= 1;

  if (!account) return null;

  async function handleConfirm() {
    setIsSubmitting(true);
    const success = await removeAccount(accountId);
    if (success) {
      onClose();
    } else {
      setIsSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="account-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-modal-title"
    >
      <div className="account-modal__panel">
        <h2 className="account-modal__title" id="delete-account-modal-title">
          Delete Account
        </h2>

        <p className="account-modal__body">
          You are about to delete <strong>{account.nickname}</strong>.
        </p>

        <div className="account-modal__warning" role="note">
          This will permanently delete{" "}
          {monthCount === 0
            ? "this account (no transaction data stored)."
            : `${monthCount} month${monthCount === 1 ? "" : "s"} of transaction data. This cannot be undone.`}
        </div>

        <div className="account-modal__actions">
          <button
            type="button"
            className="account-modal__btn account-modal__btn--cancel"
            onClick={onClose}
            autoFocus
          >
            Cancel
          </button>
          <span
            title={isLastAccount ? "Cannot delete the last account" : undefined}
            style={{ display: "inline-block" }}
          >
            <button
              type="button"
              className="account-modal__btn account-modal__btn--danger"
              onClick={() => void handleConfirm()}
              disabled={isLastAccount || isSubmitting}
              aria-disabled={isLastAccount || isSubmitting}
              aria-label={
                isLastAccount
                  ? "Delete account — disabled: cannot delete the last account"
                  : `Delete ${account.nickname}`
              }
            >
              Delete
            </button>
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
