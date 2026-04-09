const BUDGETS_KEY = "finance_analyser_budgets";

/** Returns all stored category→budget amount mappings. */
export function loadBudgets(): Record<string, number> {
  try {
    const raw = localStorage.getItem(BUDGETS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

/** Saves a monthly budget for a category. Ignores empty category names or zero/negative amounts. */
export function saveBudget(category: string, amount: number): void {
  if (!category.trim() || amount <= 0) return;
  const budgets = loadBudgets();
  budgets[category] = amount;
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
}

/** Removes the budget for a category. */
export function deleteBudget(category: string): void {
  const budgets = loadBudgets();
  delete budgets[category];
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets));
}
