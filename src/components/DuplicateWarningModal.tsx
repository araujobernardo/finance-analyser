import "./DuplicateWarningModal.css";

interface DuplicateWarningModalProps {
  monthName: string;
  onReplace: () => void;
  onCancel: () => void;
}

export function DuplicateWarningModal({ monthName, onReplace, onCancel }: DuplicateWarningModalProps) {
  return (
    <div className="dup-modal__backdrop" role="dialog" aria-modal="true" aria-labelledby="dup-modal-title">
      <div className="dup-modal__panel">
        <h2 className="dup-modal__title" id="dup-modal-title">Duplicate month detected</h2>
        <p className="dup-modal__body">
          You already have data for <strong>{monthName}</strong>. What would you like to do?
        </p>
        <div className="dup-modal__actions">
          <button className="dup-modal__btn dup-modal__btn--cancel" onClick={onCancel} autoFocus>
            Cancel
          </button>
          <button className="dup-modal__btn dup-modal__btn--replace" onClick={onReplace}>
            Replace
          </button>
        </div>
      </div>
    </div>
  );
}
