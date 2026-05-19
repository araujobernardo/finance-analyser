// FA-GOAL-003 — Batch orchestrator for goal progress recalculation
// Server-side only — do not import from React components or Vite browser code.

import { and, eq } from "drizzle-orm";
import type { db as DbInstance } from "../../db/index.ts";
import { goals } from "../../db/schema.ts";
import { calculateGoalProgress } from "./calculateGoalProgress.ts";

type Db = typeof DbInstance;

/**
 * Recalculates progress for all active goals belonging to the given user.
 * Goals with status 'achieved' or 'abandoned' are excluded at the query level.
 * Each goal is processed sequentially to avoid DB contention on a single-user app.
 */
export async function recalculateUserGoals(
  userId: string,
  db: Db,
): Promise<void> {
  const activeGoals = await db
    .select()
    .from(goals)
    .where(and(eq(goals.userId, userId), eq(goals.status, "active")));

  for (const goal of activeGoals) {
    await calculateGoalProgress(goal, db, userId);
  }
}
