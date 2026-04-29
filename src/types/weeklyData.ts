export interface WeekBucket {
  /** ISO date string of the Monday that starts this week, e.g. "2026-01-27" */
  weekStart: string;
  /** Display label shown on the x-axis, e.g. "Jan 27" */
  label: string;
  /** Total absolute spend across all (non-transfer, non-credit) transactions */
  totalSpend: number;
}

export interface WeeklyCategoryBucket {
  /** ISO date string of the Monday that starts this week */
  weekStart: string;
  /** Display label shown on the x-axis, e.g. "Jan 27" */
  label: string;
  /** Map of category name → total absolute spend for that week. Missing categories default to 0. */
  byCategory: Record<string, number>;
}
