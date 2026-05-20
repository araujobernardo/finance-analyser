import type { WeekBucket, WeeklyCategoryBucket } from "../types/weeklyData";

// Minimal transaction shape required by weekly aggregation utilities.
interface TxnForAggregation {
  date: string;
  amount: number;
  isCredit: boolean;
  isTransfer: boolean;
  account: string;
  category: string | null;
}

/**
 * Returns a new Date set to the Monday of the ISO week containing `date`,
 * at midnight local time. The ISO week starts on Monday.
 */
export function isoWeekStart(date: Date): Date {
  const d = new Date(date);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the x-axis label for a week, formatted as abbreviated month + day
 * with no leading zero, e.g. "Jan 27" or "Feb 3". Locale: en-NZ.
 */
export function formatWeekLabel(weekStart: Date): string {
  return weekStart.toLocaleDateString("en-NZ", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Aggregates transactions into weekly spend totals.
 * Only expense transactions (non-transfer, non-credit) are included.
 * Returns the last 12 weeks that contain at least one transaction,
 * ordered oldest → newest.
 */
export function buildWeeklyTotals(
  transactions: TxnForAggregation[],
  activeAccountId: string,
): WeekBucket[] {
  const expenses = transactions.filter(
    (t) =>
      !t.isTransfer &&
      !t.isCredit &&
      (activeAccountId === "all" || t.account === activeAccountId),
  );

  const weekMap = new Map<string, { totalSpend: number; weekStart: Date }>();

  for (const t of expenses) {
    // Parse date string as local time by appending T00:00:00 (avoids UTC midnight shifting)
    const date = new Date(`${t.date}T00:00:00`);
    const monday = isoWeekStart(date);
    // Build key from local year/month/date to avoid UTC offset shifting
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, "0");
    const d = String(monday.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${d}`;
    const existing = weekMap.get(key);
    if (existing) {
      existing.totalSpend += Math.abs(t.amount);
    } else {
      weekMap.set(key, { totalSpend: Math.abs(t.amount), weekStart: monday });
    }
  }

  const sorted = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([weekStart, { totalSpend, weekStart: date }]) => ({
      weekStart,
      label: formatWeekLabel(date),
      totalSpend,
    }));

  return sorted;
}

/**
 * Aggregates transactions into weekly spend totals broken down by category.
 * Only expense transactions (non-transfer, non-credit) are included.
 * Returns the last 12 weeks that contain at least one transaction,
 * ordered oldest → newest. Missing categories for a given week default to 0
 * (no gaps — all categories seen in any week are present in every bucket).
 */
export function buildWeeklyCategoryTotals(
  transactions: TxnForAggregation[],
  activeAccountId: string,
): WeeklyCategoryBucket[] {
  const expenses = transactions.filter(
    (t) =>
      !t.isTransfer &&
      !t.isCredit &&
      (activeAccountId === "all" || t.account === activeAccountId),
  );

  // Map: weekKey → { weekStart Date, byCategory accumulator }
  const weekMap = new Map<
    string,
    { weekStart: Date; byCategory: Record<string, number> }
  >();

  // Track all categories seen across all weeks
  const allCategories = new Set<string>();

  for (const t of expenses) {
    const date = new Date(`${t.date}T00:00:00`);
    const monday = isoWeekStart(date);
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, "0");
    const d = String(monday.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${d}`;

    const cat = t.category ?? "Uncategorised";
    allCategories.add(cat);

    const existing = weekMap.get(key);
    if (existing) {
      existing.byCategory[cat] =
        (existing.byCategory[cat] ?? 0) + Math.abs(t.amount);
    } else {
      weekMap.set(key, {
        weekStart: monday,
        byCategory: { [cat]: Math.abs(t.amount) },
      });
    }
  }

  // Keep only the last 12 weeks (sorted oldest → newest)
  const sorted = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12);

  // Fill in 0 for any category missing from a particular week
  return sorted.map(([weekStart, { weekStart: date, byCategory }]) => {
    const filled: Record<string, number> = {};
    for (const cat of allCategories) {
      filled[cat] = byCategory[cat] ?? 0;
    }
    return {
      weekStart,
      label: formatWeekLabel(date),
      byCategory: filled,
    };
  });
}
