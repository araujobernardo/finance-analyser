// FA-BUDG-002 — Budget vs Actual Spend Comparison View
// Routes: GET /api/budgets, POST /api/budgets, PATCH /api/budgets/:id, DELETE /api/budgets/:id

import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { budgets, budgetDefaults, userPreferences } from "../../db/schema.ts";
import {
  authenticateToken,
  type AuthLocals,
} from "../middleware/authenticateToken.ts";
import { calculateBudgetSpend } from "../utils/calculateBudgetSpend.ts";
import { checkBudgetAlerts } from "../utils/checkBudgetAlerts.ts";
import type { ApiBudget, AlertedCategory } from "../../types/api.ts";

export const budgetsRouter = Router();

budgetsRouter.use(authenticateToken);

// ── Helper: compute derived fields for a single budget row ───────────────────

async function buildApiBudget(
  row: {
    id: string;
    categoryName: string;
    year: number;
    month: number;
    limitAmount: string;
  },
  userId: string,
  monthStartDay: number,
): Promise<ApiBudget> {
  const limitAmount = parseFloat(row.limitAmount);
  const actualSpend = await calculateBudgetSpend(
    userId,
    row.categoryName,
    row.year,
    row.month,
    monthStartDay,
    db,
  );
  const remaining = limitAmount - actualSpend;
  let percentageUsed: number;
  if (limitAmount > 0) {
    percentageUsed = (actualSpend / limitAmount) * 100;
  } else if (actualSpend > 0) {
    percentageUsed = 100;
  } else {
    percentageUsed = 0;
  }
  return {
    id: row.id,
    categoryName: row.categoryName,
    year: row.year,
    month: row.month,
    limitAmount,
    actualSpend,
    remaining,
    percentageUsed,
  };
}

// ── GET / ────────────────────────────────────────────────────────────────────

const getQuerySchema = z.object({
  year: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 2000 && n <= 2100, "Invalid year"),
  month: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 12, "Invalid month"),
});

budgetsRouter.get("/", async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;

    const parsed = getQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: "year and month query params are required (integers)" });
      return;
    }
    const { year, month } = parsed.data;

    // 1. Fetch user's monthStartDay preference (default 1 if no row)
    const [prefRow] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    const monthStartDay = prefRow?.monthStartDay ?? 1;

    // 2. Fetch existing budgets for (userId, year, month)
    let rows = await db
      .select()
      .from(budgets)
      .where(
        and(
          eq(budgets.userId, userId),
          eq(budgets.year, year),
          eq(budgets.month, month),
        ),
      );

    // 3. Auto-populate from defaults if no budgets exist for this month
    if (rows.length === 0) {
      const defaults = await db
        .select()
        .from(budgetDefaults)
        .where(eq(budgetDefaults.userId, userId));

      if (defaults.length > 0) {
        await db
          .insert(budgets)
          .values(
            defaults.map((d) => ({
              userId,
              categoryName: d.categoryName,
              year,
              month,
              limitAmount: d.limitAmount,
            })),
          )
          .onConflictDoNothing();

        // Re-fetch after auto-populate
        rows = await db
          .select()
          .from(budgets)
          .where(
            and(
              eq(budgets.userId, userId),
              eq(budgets.year, year),
              eq(budgets.month, month),
            ),
          );
      }
    }

    // 4. Build ApiBudget[] with actual spend computed for each row
    const result: ApiBudget[] = await Promise.all(
      rows.map((row) =>
        buildApiBudget(
          { ...row, limitAmount: row.limitAmount },
          userId,
          monthStartDay,
        ),
      ),
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── POST / ───────────────────────────────────────────────────────────────────

const createBudgetSchema = z.object({
  categoryName: z.string().min(1).max(100),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  limitAmount: z.number().min(0),
});

budgetsRouter.post("/", async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;

    const parsed = createBudgetSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const { categoryName, year, month, limitAmount } = parsed.data;

    let newRow: typeof budgets.$inferSelect | undefined;
    try {
      const [inserted] = await db
        .insert(budgets)
        .values({
          userId,
          categoryName,
          year,
          month,
          limitAmount: String(limitAmount),
        })
        .returning();
      newRow = inserted;
    } catch (err: unknown) {
      // Postgres unique constraint violation code is '23505'
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "23505"
      ) {
        res
          .status(409)
          .json({ error: "Budget already exists for this category and month" });
        return;
      }
      throw err;
    }

    if (!newRow) {
      res.status(500).json({ error: "Failed to create budget" });
      return;
    }

    // Fetch preferences for monthStartDay
    const [prefRow] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    const monthStartDay = prefRow?.monthStartDay ?? 1;

    const apiBudget = await buildApiBudget(
      { ...newRow, limitAmount: newRow.limitAmount },
      userId,
      monthStartDay,
    );
    res.status(201).json(apiBudget);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /:id ───────────────────────────────────────────────────────────────

const updateBudgetSchema = z.object({
  limitAmount: z.number().min(0),
});

budgetsRouter.patch("/:id", async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const { id } = req.params;

    const parsed = updateBudgetSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const { limitAmount } = parsed.data;

    const [updated] = await db
      .update(budgets)
      .set({ limitAmount: String(limitAmount), updatedAt: new Date() })
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Budget not found" });
      return;
    }

    const [prefRow] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    const monthStartDay = prefRow?.monthStartDay ?? 1;

    const apiBudget = await buildApiBudget(
      { ...updated, limitAmount: updated.limitAmount },
      userId,
      monthStartDay,
    );
    res.json(apiBudget);
  } catch (err) {
    next(err);
  }
});

// ── GET /alerts ──────────────────────────────────────────────────────────────
// FA-BUDG-003 T005: return budget categories that exceed the user's alert threshold

budgetsRouter.get("/alerts", async (_req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const alerted: AlertedCategory[] = await checkBudgetAlerts(userId, db);
    res.json(alerted);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id ──────────────────────────────────────────────────────────────

budgetsRouter.delete("/:id", async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const { id } = req.params;

    const [deleted] = await db
      .delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Budget not found" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
