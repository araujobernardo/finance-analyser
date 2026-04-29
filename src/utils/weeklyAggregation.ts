import type { PfaTxn } from "../types/pfa";
import type { WeekBucket } from "../types/weeklyData";

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
  transactions: PfaTxn[],
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
    const date = new Date(t.date);
    const monday = isoWeekStart(date);
    const key = monday.toISOString().slice(0, 10);
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
