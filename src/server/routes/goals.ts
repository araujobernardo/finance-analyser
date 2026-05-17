import { Router } from "express";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { goals } from "../../db/schema.ts";
import {
  authenticateToken,
  type AuthLocals,
} from "../middleware/authenticateToken.ts";

export const goalsRouter = Router();

const GOAL_TYPES = [
  "savings_target",
  "debt_payoff",
  "net_worth_milestone",
  "spending_limit",
] as const;

const GOAL_STATUSES = ["active", "achieved", "abandoned"] as const;

const createGoalSchema = z
  .object({
    name: z.string().min(1).max(100),
    type: z.enum(GOAL_TYPES),
    targetAmount: z.number().min(0),
    targetDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    linkedAccountId: z.string().uuid().nullable().optional(),
    categoryName: z.string().max(100).nullable().optional(),
  })
  .refine((d) => d.type !== "spending_limit" || d.categoryName != null, {
    message: "categoryName is required for spending_limit goals",
    path: ["categoryName"],
  })
  .refine((d) => d.type === "spending_limit" || d.categoryName == null, {
    message: "categoryName must be null for non-spending_limit goals",
    path: ["categoryName"],
  });

const updateGoalSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    type: z.enum(GOAL_TYPES).optional(),
    targetAmount: z.number().min(0).optional(),
    targetDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    linkedAccountId: z.string().uuid().nullable().optional(),
    categoryName: z.string().max(100).nullable().optional(),
    status: z.enum(GOAL_STATUSES).optional(),
    currentAmount: z.number().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field required",
  })
  .refine(
    (d) => !d.type || d.type !== "spending_limit" || d.categoryName != null,
    {
      message: "categoryName is required for spending_limit goals",
      path: ["categoryName"],
    },
  )
  .refine(
    (d) => !d.type || d.type === "spending_limit" || d.categoryName == null,
    {
      message: "categoryName must be null for non-spending_limit goals",
      path: ["categoryName"],
    },
  );

// GET /api/goals
goalsRouter.get("/", authenticateToken, async (_req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const rows = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(asc(goals.createdAt));
    res.json({ goals: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/goals
goalsRouter.post("/", authenticateToken, async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const parsed = createGoalSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const {
      name,
      type,
      targetAmount,
      targetDate,
      linkedAccountId,
      categoryName,
    } = parsed.data;
    const [goal] = await db
      .insert(goals)
      .values({
        userId,
        name,
        type,
        targetAmount: String(targetAmount),
        targetDate: targetDate ?? null,
        linkedAccountId: linkedAccountId ?? null,
        categoryName: categoryName ?? null,
      })
      .returning();
    res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/goals/:id
goalsRouter.patch("/:id", authenticateToken, async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const id = req.params["id"] as string;
    const parsed = updateGoalSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.type !== undefined) updates.type = parsed.data.type;
    if (parsed.data.targetAmount !== undefined)
      updates.targetAmount = String(parsed.data.targetAmount);
    if ("targetDate" in parsed.data)
      updates.targetDate = parsed.data.targetDate ?? null;
    if ("linkedAccountId" in parsed.data)
      updates.linkedAccountId = parsed.data.linkedAccountId ?? null;
    if ("categoryName" in parsed.data)
      updates.categoryName = parsed.data.categoryName ?? null;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if ("currentAmount" in parsed.data)
      updates.currentAmount =
        parsed.data.currentAmount != null
          ? String(parsed.data.currentAmount)
          : null;

    const [updated] = await db
      .update(goals)
      .set(updates)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/goals/:id
goalsRouter.delete("/:id", authenticateToken, async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const id = req.params["id"] as string;
    const [deleted] = await db
      .delete(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
