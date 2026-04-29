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
