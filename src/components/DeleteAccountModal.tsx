import { useAccount } from "../context/AccountContext";
import { getAccountMonths } from "../services/storage";
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
  const account = accounts.find((a) => a.id === accountId);
  const monthCount = getAccountMonths(accountId).length;
  const isLastAccount = accounts.length <= 1;

  if (!account) return null;

  function handleConfirm() {
    removeAccount(accountId);
    onClose();
  }

  return (
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
          You are about to delete <strong>{account.name}</strong>.
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
              onClick={handleConfirm}
              disabled={isLastAccount}
              aria-disabled={isLastAccount}
              aria-label={
                isLastAccount
                  ? "Delete account — disabled: cannot delete the last account"
                  : `Delete ${account.name}`
              }
            >
              Delete
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
