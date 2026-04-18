import type { Transaction } from "./csvParser";

export interface CategoryRow {
  category: string;
  total: number;
  percentage: number;
}

export function buildCategoryRows(transactions: Transaction[]): CategoryRow[] {
  const expenses = transactions.filter((t) => t.amount < 0);
  if (expenses.length === 0) return [];

  const totals: Record<string, number> = {};
  for (const t of expenses) {
    const cat = (t.categoryOverride ?? t.category) || "Uncategorised";
    totals[cat] = (totals[cat] ?? 0) + Math.abs(t.amount);
  }

  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);

  const rows: CategoryRow[] = Object.entries(totals)
    .filter(([, total]) => total > 0)
    .map(([category, total]) => ({
      category,
      total,
      percentage: (total / grandTotal) * 100,
    }));

  // Sort by amount descending, Uncategorised always last
  rows.sort((a, b) => {
    if (a.category === "Uncategorised") return 1;
    if (b.category === "Uncategorised") return -1;
    return b.total - a.total;
  });

  return rows;
}
