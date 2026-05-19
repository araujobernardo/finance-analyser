// FA-GOAL-004 T002 — Pure utility: derive goal status from an ApiGoal + today's date
// Server-safe: no React imports.

import type { ApiGoal } from "../types/api";

export type GoalStatus = "on_track" | "at_risk" | "behind";

/**
 * Returns the status of a goal relative to today, or null when status cannot
 * be determined (missing targetDate, zero targetAmount, null currentAmount, or
 * the goal was created on the same day as its targetDate).
 *
 * Spending-limit goals compare current spend to the target cap:
 *   ratio < 0.80  → on_track
 *   ratio < 1.00  → at_risk
 *   ratio >= 1.00 → behind
 *
 * All other goal types use time-based progress:
 *   gap = expectedProgress − actualProgress
 *   gap <= 0.10 → on_track
 *   gap <= 0.25 → at_risk
 *   gap >  0.25 → behind
 */
export function getGoalStatus(goal: ApiGoal, today: Date): GoalStatus | null {
  if (!goal.targetDate) return null;

  const targetAmount = parseFloat(goal.targetAmount);
  if (targetAmount === 0) return null;

  if (goal.currentAmount === null) return null;
  const currentAmount = parseFloat(goal.currentAmount);

  const createdAt = new Date(goal.createdAt);
  const targetDate = new Date(goal.targetDate);

  // Treat dates as day-level (strip time component for comparison)
  const createdDay = Date.UTC(
    createdAt.getFullYear(),
    createdAt.getMonth(),
    createdAt.getDate(),
  );
  const targetDay = Date.UTC(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  );
  const todayDay = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  if (createdDay === targetDay) return null;

  if (goal.type === "spending_limit") {
    const ratio = currentAmount / targetAmount;
    if (ratio < 0.8) return "on_track";
    if (ratio < 1.0) return "at_risk";
    return "behind";
  }

  // Time-based goals
  const totalDays = (targetDay - createdDay) / 86_400_000;
  const daysElapsed = (todayDay - createdDay) / 86_400_000;
  const expectedProgress = Math.min(1, Math.max(0, daysElapsed / totalDays));
  const actualProgress = Math.min(1, currentAmount / targetAmount);

  const gap = expectedProgress - actualProgress;
  if (gap <= 0.1) return "on_track";
  if (gap <= 0.25) return "at_risk";
  return "behind";
}
