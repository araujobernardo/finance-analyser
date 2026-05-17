import { useState } from "react";
import { useGoals } from "../context/GoalsContext";
import { GoalModal } from "../components/goals/GoalModal";
import "./GoalsPage.css";

export function GoalsPage() {
  const { goals, isLoading } = useGoals();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="goals-page" data-testid="goals-page">
      {/* Header */}
      <div className="goals-page__header">
        <h1 className="goals-page__title">Goals</h1>
        <button
          type="button"
          className="goals-page__add-btn"
          data-testid="goals-add-btn"
          onClick={() => setModalOpen(true)}
        >
          + Add Goal
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="goals-page__loading" data-testid="goals-loading">
          Loading goals…
        </div>
      ) : goals.length === 0 ? (
        <div className="goals-page__empty" data-testid="goals-empty">
          <p>No goals yet — add one to get started.</p>
        </div>
      ) : (
        <ul className="goals-page__list" data-testid="goals-list">
          {goals.map((goal) => (
            <li
              key={goal.id}
              className="goals-page__item"
              data-testid={`goals-item-${goal.id}`}
            >
              <span className="goals-page__item-name">{goal.name}</span>
              <span className="goals-page__item-type">{goal.type}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Modal */}
      {modalOpen && <GoalModal onClose={() => setModalOpen(false)} />}
    </div>
  );
}
