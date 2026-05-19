// FA-BUDG-002 — Budget vs Actual Spend Comparison View
// Routes: GET /api/budget-defaults, POST /api/budget-defaults, DELETE /api/budget-defaults/:id

import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { budgetDefaults } from "../../db/schema.ts";
import {
  authenticateToken,
  type AuthLocals,
} from "../middleware/authenticateToken.ts";
import type { ApiBudgetDefault } from "../../types/api.ts";

export const budgetDefaultsRouter = Router();

budgetDefaultsRouter.use(authenticateToken);

// ── GET / ────────────────────────────────────────────────────────────────────

budgetDefaultsRouter.get("/", async (_req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;

    const rows = await db
      .select()
      .from(budgetDefaults)
      .where(eq(budgetDefaults.userId, userId));

    const result: ApiBudgetDefault[] = rows.map((r) => ({
      id: r.id,
      categoryName: r.categoryName,
      limitAmount: parseFloat(r.limitAmount),
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── POST / (upsert) ──────────────────────────────────────────────────────────

const upsertDefaultSchema = z.object({
  categoryName: z.string().min(1).max(100),
  limitAmount: z.number().min(0),
});

budgetDefaultsRouter.post("/", async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;

    const parsed = upsertDefaultSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const { categoryName, limitAmount } = parsed.data;

    const [upserted] = await db
      .insert(budgetDefaults)
      .values({ userId, categoryName, limitAmount: String(limitAmount) })
      .onConflictDoUpdate({
        target: [budgetDefaults.userId, budgetDefaults.categoryName],
        set: { limitAmount: String(limitAmount), updatedAt: new Date() },
      })
      .returning();

    const result: ApiBudgetDefault = {
      id: upserted.id,
      categoryName: upserted.categoryName,
      limitAmount: parseFloat(upserted.limitAmount),
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id ──────────────────────────────────────────────────────────────

budgetDefaultsRouter.delete("/:id", async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const { id } = req.params;

    const [deleted] = await db
      .delete(budgetDefaults)
      .where(and(eq(budgetDefaults.id, id), eq(budgetDefaults.userId, userId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Budget default not found" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
