// FA-BUDG-002 — Budget vs Actual Spend Comparison View
// BudgetPage: displays budget list for selected month with CRUD, navigation, and defaults management.

import { useState } from "react";
import { useBudgets } from "../context/BudgetContext";
import { BudgetRow } from "../components/budgets/BudgetRow";
import { MonthNavigator } from "../components/budgets/MonthNavigator";
import { AddBudgetModal } from "../components/budgets/AddBudgetModal";
import { ManageDefaultsModal } from "../components/budgets/ManageDefaultsModal";
import "./BudgetPage.css";

const nzd = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
});

export default function BudgetPage() {
  const { budgets, selectedYear, selectedMonth, setSelectedMonth, loading } =
    useBudgets();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [defaultsModalOpen, setDefaultsModalOpen] = useState(false);

  // Compute prev/next month
  const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
  const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
  const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
  const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;

  // Summary totals
  const totalLimit = budgets.reduce((sum, b) => sum + b.limitAmount, 0);
  const totalSpend = budgets.reduce((sum, b) => sum + b.actualSpend, 0);

  return (
    <div className="budget-page">
      <h1 className="budget-page__title">Budget</h1>

      {/* Month navigation */}
      <MonthNavigator
        year={selectedYear}
        month={selectedMonth}
        onPrev={() => setSelectedMonth(prevYear, prevMonth)}
        onNext={() => setSelectedMonth(nextYear, nextMonth)}
      />

      {/* Summary row */}
      {budgets.length > 0 && (
        <div className="budget-page__summary">
          <span>
            <strong>Total limit:</strong> {nzd.format(totalLimit)}
          </span>
          <span>
            <strong>Total spend:</strong> {nzd.format(totalSpend)}
          </span>
        </div>
      )}

      {/* Budget list */}
      {loading ? (
        <div className="budget-page__loading">Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <p className="budget-page__empty">
          No budgets yet. Add your first budget to start tracking.
        </p>
      ) : (
        <div className="budget-page__list">
          {budgets.map((b) => (
            <BudgetRow key={b.id} budget={b} />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="budget-page__actions">
        <button
          type="button"
          className="goals-page__add-btn"
          onClick={() => setAddModalOpen(true)}
        >
          + Add Budget
        </button>
        <button
          type="button"
          className="budget-page__btn-secondary"
          onClick={() => setDefaultsModalOpen(true)}
        >
          Manage Defaults
        </button>
      </div>

      {/* Modals */}
      <AddBudgetModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />
      <ManageDefaultsModal
        isOpen={defaultsModalOpen}
        onClose={() => setDefaultsModalOpen(false)}
      />
    </div>
  );
}
