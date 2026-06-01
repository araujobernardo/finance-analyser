import { useState } from "react";
import type { ApiGoal } from "../types/api";
import { useGoals } from "../context/GoalsContext";
import { useBankContext } from "../context/BankContext";
import { GoalCard } from "../components/goals/GoalCard";
import { GoalModal } from "../components/goals/GoalModal";
import "./GoalsPage.css";

// null = closed, "add" = add mode, ApiGoal instance = edit mode
type ModalState = ApiGoal | "add" | null;

export function GoalsPage() {
  const { goals, isLoading, updateGoal, removeGoal } = useGoals();
  const { accountLinks } = useBankContext();
  const [modalState, setModalState] = useState<ModalState>(null);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status !== "active");

  const editGoal =
    modalState !== null && modalState !== "add" ? modalState : undefined;

  /**
   * Returns true when the given Finance Analyser account ID has an Akahu link
   * with a non-null lastBalance. Used to distinguish "linked but no balance data"
   * from "linked with balance data" on savings_target GoalCards.
   */
  function accountHasAkahuBalance(financeAccountId: string | null): boolean {
    if (!financeAccountId) return false;
    return accountLinks.some(
      (link) =>
        link.financeAccountId === financeAccountId && link.lastBalance != null,
    );
  }

  function handleConfirmDelete() {
    if (pendingDeleteId) {
      void removeGoal(pendingDeleteId);
      setPendingDeleteId(null);
    }
  }

  return (
    <div className="goals-page" data-testid="goals-page">
      {/* Header */}
      <div className="goals-page__header">
        <h1 className="goals-page__title">Goals</h1>
        <button
          type="button"
          className="goals-page__add-btn"
          data-testid="goals-add-btn"
          onClick={() => setModalState("add")}
        >
          + Add Goal
        </button>
      </div>

      {/* Delete confirmation prompt */}
      {pendingDeleteId !== null && (
        <div
          className="goals-page__delete-confirm"
          data-testid="goals-delete-confirm"
          role="alert"
        >
          <p className="goals-page__delete-confirm-text">
            Delete this goal? This cannot be undone.
          </p>
          <div className="goals-page__delete-confirm-actions">
            <button
              type="button"
              className="goals-page__delete-confirm-btn goals-page__delete-confirm-btn--cancel"
              data-testid="goals-delete-cancel"
              onClick={() => setPendingDeleteId(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="goals-page__delete-confirm-btn goals-page__delete-confirm-btn--confirm"
              data-testid="goals-delete-confirm-btn"
              onClick={handleConfirmDelete}
            >
              Confirm
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="goals-page__loading" data-testid="goals-loading">
          Loading goals…
        </div>
      ) : (
        <>
          {/* Active goals section */}
          <section
            className="goals-page__section"
            data-testid="goals-active-section"
          >
            {active.length === 0 ? (
              <div className="goals-page__empty" data-testid="goals-empty">
                <p>No active goals yet — add one to get started.</p>
              </div>
            ) : (
              <ul className="goals-page__list" data-testid="goals-list">
                {active.map((goal) => (
                  <li key={goal.id}>
                    <GoalCard
                      goal={goal}
                      onEdit={(g) => setModalState(g)}
                      onStatusChange={(id, status) =>
                        void updateGoal(id, { status })
                      }
                      onDelete={(id) => setPendingDeleteId(id)}
                      hasAkahuBalance={accountHasAkahuBalance(
                        goal.linkedAccountId,
                      )}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Completed/Abandoned section */}
          {completed.length > 0 && (
            <section
              className="goals-page__section goals-page__section--completed"
              data-testid="goals-completed-section"
            >
              <button
                type="button"
                className="goals-page__completed-toggle"
                data-testid="goals-completed-toggle"
                onClick={() => setCompletedOpen((prev) => !prev)}
              >
                {completedOpen ? "Hide" : "Show"} {completed.length} completed
                goal{completed.length !== 1 ? "s" : ""}
                <span
                  className={`goals-page__toggle-icon${completedOpen ? " goals-page__toggle-icon--open" : ""}`}
                >
                  ▾
                </span>
              </button>

              {completedOpen && (
                <ul
                  className="goals-page__list goals-page__list--completed"
                  data-testid="goals-completed-list"
                >
                  {completed.map((goal) => (
                    <li key={goal.id}>
                      <GoalCard
                        goal={goal}
                        onEdit={(g) => setModalState(g)}
                        onDelete={(id) => setPendingDeleteId(id)}
                        hasAkahuBalance={accountHasAkahuBalance(
                          goal.linkedAccountId,
                        )}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}

      {/* Modal */}
      {modalState !== null && (
        <GoalModal onClose={() => setModalState(null)} goal={editGoal} />
      )}
    </div>
  );
}
