import { useRef, useState } from "react";
import { useGoals } from "../../context/GoalsContext";
import { useAccount } from "../../context/AccountContext";
import type { ApiGoal } from "../../types/api";
import "./GoalModal.css";

type GoalType =
  | "savings_target"
  | "debt_payoff"
  | "net_worth_milestone"
  | "spending_limit";

interface GoalModalProps {
  onClose: () => void;
  /** When provided the modal opens in edit mode, pre-populated with this goal's data. */
  goal?: ApiGoal;
}

const GOAL_TILES: {
  type: GoalType;
  icon: string;
  name: string;
  desc: string;
}[] = [
  {
    type: "savings_target",
    icon: "💰",
    name: "Savings Target",
    desc: "Build up a sum by a date",
  },
  {
    type: "debt_payoff",
    icon: "📋",
    name: "Debt Payoff",
    desc: "Pay down what you owe",
  },
  {
    type: "net_worth_milestone",
    icon: "📈",
    name: "Net Worth Milestone",
    desc: "Reach a total net worth",
  },
  {
    type: "spending_limit",
    icon: "🚫",
    name: "Spending Limit",
    desc: "Cap spending in a category",
  },
];

const AMOUNT_LABELS: Record<GoalType, string> = {
  savings_target: "Target Amount",
  debt_payoff: "Total Debt Amount",
  net_worth_milestone: "Target Net Worth",
  spending_limit: "Monthly Limit",
};

const CONTEXT_HINTS: Record<GoalType, string> = {
  savings_target:
    "Track progress towards a specific savings amount. Link an account and your balance will update automatically.",
  debt_payoff:
    "Track a debt you're paying down. Enter the total owed as the target and update your progress manually.",
  net_worth_milestone:
    "Set a total net worth milestone. Progress is calculated from your accounts automatically.",
  spending_limit:
    "Set a monthly cap on spending in a specific transaction category. Your spending will be tracked against this limit.",
};

export function GoalModal({ onClose, goal }: GoalModalProps) {
  const { addGoal, updateGoal } = useGoals();
  const { accounts } = useAccount();

  const isEditMode = goal !== undefined;

  const [name, setName] = useState(goal?.name ?? "");
  const [type, setType] = useState<GoalType | null>(
    (goal?.type as GoalType) ?? null,
  );
  const [targetAmount, setTargetAmount] = useState(
    goal?.targetAmount ? String(parseFloat(goal.targetAmount)) : "",
  );
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const [linkedAccountId, setLinkedAccountId] = useState(
    goal?.linkedAccountId ?? "",
  );
  const [categoryName, setCategoryName] = useState(goal?.categoryName ?? "");
  const [currentAmount, setCurrentAmount] = useState(
    goal?.currentAmount ? String(parseFloat(goal.currentAmount)) : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [nameError, setNameError] = useState("");
  const [amountError, setAmountError] = useState("");

  const adaptiveRef = useRef<HTMLDivElement>(null);

  // In add mode: tiles are locked until a name is entered; type must be chosen.
  // In edit mode: both gates are bypassed — fields are pre-populated.
  const tilesLocked = !isEditMode && name.trim().length === 0;
  const typeSelected = type !== null;

  function validateName(v: string): string {
    if (!v.trim()) return "Goal name is required.";
    if (v.trim().length > 100) return "Name must be 100 characters or fewer.";
    return "";
  }

  function validateAmount(v: string): string {
    const num = parseFloat(v);
    if (!v.trim() || isNaN(num) || num <= 0)
      return "Enter an amount greater than 0.";
    return "";
  }

  function handleTileSelect(selected: GoalType) {
    if (tilesLocked) return;

    if (selected !== "spending_limit") {
      setCategoryName("");
    }
    setType(selected);

    // Scroll adaptive fields into view after animation begins
    setTimeout(() => {
      adaptiveRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }, 50);
  }

  async function handleSave() {
    const nErr = validateName(name);
    const aErr = typeSelected ? validateAmount(targetAmount) : "";

    if (nErr) setNameError(nErr);
    if (aErr) setAmountError(aErr);
    if (nErr || aErr || !typeSelected) return;

    setIsSubmitting(true);

    let success: boolean;

    if (isEditMode && goal) {
      // Edit mode: PATCH the existing goal.
      const parsedCurrentAmount =
        currentAmount.trim() !== "" ? parseFloat(currentAmount) : null;

      success = await updateGoal(goal.id, {
        name: name.trim(),
        type,
        targetAmount: parseFloat(targetAmount),
        targetDate: targetDate || null,
        linkedAccountId: linkedAccountId || null,
        categoryName: type === "spending_limit" ? categoryName || null : null,
        currentAmount: parsedCurrentAmount,
      });
    } else {
      // Add mode: POST a new goal.
      success = await addGoal({
        name: name.trim(),
        type,
        targetAmount: parseFloat(targetAmount),
        targetDate: targetDate || null,
        linkedAccountId: linkedAccountId || null,
        categoryName: type === "spending_limit" ? categoryName || null : null,
      });
    }

    if (success) {
      onClose();
    } else {
      setIsSubmitting(false);
    }
  }

  // Step indicator is only shown in add mode.
  const stepOneDot = typeSelected ? "complete" : "active";
  const stepTwoDot = typeSelected ? "active" : "";
  const stepText = typeSelected
    ? "Step 2 of 2 — Fill in the details"
    : "Step 1 of 2 — What kind of goal?";

  return (
    <div
      className="goal-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-modal-title"
    >
      <div className="goal-modal__panel">
        {/* Header */}
        <div className="goal-modal__header">
          <h2 className="goal-modal__title" id="goal-modal-title">
            {isEditMode ? "Edit Goal" : "Add Goal"}
          </h2>
          <button
            type="button"
            className="goal-modal__close"
            onClick={onClose}
            aria-label="Close"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="goal-modal__body">
          {/* Step indicator (add mode only) / Edit subtitle */}
          {isEditMode ? (
            <p className="goal-modal__edit-subtitle" aria-hidden="true">
              Editing: {goal?.name}
            </p>
          ) : (
            <div className="goal-modal__step-indicator" aria-hidden="true">
              <div
                className={`goal-modal__step-dot${stepOneDot ? ` goal-modal__step-dot--${stepOneDot}` : ""}`}
              />
              <div
                className={`goal-modal__step-dot${stepTwoDot ? ` goal-modal__step-dot--${stepTwoDot}` : ""}`}
              />
              <span className="goal-modal__step-text">{stepText}</span>
            </div>
          )}

          {/* Goal Name */}
          <div className="goal-modal__field">
            <label className="goal-modal__label" htmlFor="goal-name-input">
              Goal Name
            </label>
            <input
              id="goal-name-input"
              data-testid="goal-modal-name-input"
              type="text"
              className={`goal-modal__input${nameError ? " goal-modal__input--error" : ""}`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(validateName(e.target.value));
              }}
              maxLength={100}
              placeholder="e.g. Emergency Fund"
              autoFocus
            />
            {nameError && (
              <span className="goal-modal__error" role="alert">
                {nameError}
              </span>
            )}
          </div>

          {/* Goal Type tiles */}
          <div className="goal-modal__field">
            <span className="goal-modal__label">Goal Type</span>
            <div
              data-testid="goal-modal-tiles"
              className={`goal-modal__tiles${tilesLocked ? " goal-modal__tiles--locked" : ""}`}
            >
              {GOAL_TILES.map((tile) => (
                <button
                  key={tile.type}
                  type="button"
                  data-testid={`goal-tile-${tile.type}`}
                  className={`goal-modal__tile${type === tile.type ? " goal-modal__tile--selected" : ""}`}
                  onClick={() => handleTileSelect(tile.type)}
                  tabIndex={tilesLocked ? -1 : 0}
                  aria-pressed={type === tile.type}
                >
                  <span className="goal-modal__tile-icon">{tile.icon}</span>
                  <span className="goal-modal__tile-name">{tile.name}</span>
                  <span className="goal-modal__tile-desc">{tile.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Adaptive fields — always visible in edit mode */}
          <div
            ref={adaptiveRef}
            data-testid="goal-modal-adaptive"
            className={`goal-modal__adaptive${typeSelected || isEditMode ? " goal-modal__adaptive--visible" : ""}`}
            aria-hidden={!typeSelected && !isEditMode}
          >
            {/* Context hint */}
            {type && (
              <p
                data-testid="goal-modal-context-hint"
                className="goal-modal__context-hint"
              >
                {CONTEXT_HINTS[type]}
              </p>
            )}

            {/* Amount */}
            <div className="goal-modal__field">
              <label className="goal-modal__label" htmlFor="goal-amount-input">
                {type ? AMOUNT_LABELS[type] : "Target Amount"}
              </label>
              <div className="goal-modal__prefix-wrap">
                <span className="goal-modal__prefix">NZD</span>
                <input
                  id="goal-amount-input"
                  data-testid="goal-modal-amount-input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  className={`goal-modal__input${amountError ? " goal-modal__input--error" : ""}`}
                  value={targetAmount}
                  onChange={(e) => {
                    setTargetAmount(e.target.value);
                    if (amountError)
                      setAmountError(validateAmount(e.target.value));
                  }}
                  placeholder="0.00"
                />
              </div>
              {amountError && (
                <span className="goal-modal__error" role="alert">
                  {amountError}
                </span>
              )}
            </div>

            {/* Current Amount — shown in edit mode only */}
            {isEditMode && (
              <div
                className="goal-modal__field"
                data-testid="goal-modal-current-amount-field"
              >
                <label
                  className="goal-modal__label"
                  htmlFor="goal-current-amount-input"
                >
                  Current progress (NZD)
                  <span className="goal-modal__label-badge">(optional)</span>
                </label>
                <div className="goal-modal__prefix-wrap">
                  <span className="goal-modal__prefix">NZD</span>
                  <input
                    id="goal-current-amount-input"
                    data-testid="goal-modal-current-amount-input"
                    type="number"
                    min="0"
                    step="0.01"
                    className="goal-modal__input"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <span className="goal-modal__hint">
                  Leave blank to keep the existing progress unchanged.
                </span>
              </div>
            )}

            {/* Spending Category — only for spending_limit */}
            <div
              data-testid="goal-modal-category-field"
              className={`goal-modal__category${type === "spending_limit" ? " goal-modal__category--visible" : ""}`}
            >
              <label
                className="goal-modal__label"
                htmlFor="goal-category-input"
              >
                Spending Category
              </label>
              <input
                id="goal-category-input"
                data-testid="goal-modal-category-input"
                type="text"
                className="goal-modal__input"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="e.g. Dining, Subscriptions"
              />
              <span className="goal-modal__hint">
                Matches the category label on your transactions.
              </span>
            </div>

            {/* Target Date */}
            <div className="goal-modal__field">
              <label className="goal-modal__label" htmlFor="goal-date-input">
                Target Date
                <span className="goal-modal__label-badge">(optional)</span>
              </label>
              <input
                id="goal-date-input"
                type="date"
                className="goal-modal__input"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>

            {/* Linked Account */}
            <div className="goal-modal__field">
              <label
                className="goal-modal__label"
                htmlFor="goal-account-select"
              >
                Linked Account
                <span className="goal-modal__label-badge">(optional)</span>
              </label>
              <div className="goal-modal__select-wrap">
                <select
                  id="goal-account-select"
                  className="goal-modal__input"
                  value={linkedAccountId}
                  onChange={(e) => setLinkedAccountId(e.target.value)}
                >
                  <option value="">None</option>
                  {accounts.map((acct) => (
                    <option key={acct.id} value={acct.id}>
                      {acct.nickname} — {acct.accountType}
                    </option>
                  ))}
                </select>
              </div>
              {type === "savings_target" && (
                <span className="goal-modal__hint">
                  Progress will reflect this account&apos;s balance.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="goal-modal__footer">
          <button
            type="button"
            className="goal-modal__btn goal-modal__btn--cancel"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="goal-modal-save-btn"
            className="goal-modal__btn goal-modal__btn--save"
            onClick={() => void handleSave()}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving…"
              : isEditMode
                ? "Save Changes"
                : "Save Goal"}
          </button>
        </div>
      </div>
    </div>
  );
}
