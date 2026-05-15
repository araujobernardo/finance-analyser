import { Router } from "express";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { liabilities } from "../../db/schema.ts";
import {
  authenticateToken,
  type AuthLocals,
} from "../middleware/authenticateToken.ts";

export const liabilitiesRouter = Router();

const LIABILITY_TYPES = [
  "mortgage",
  "personal_loan",
  "car_loan",
  "student_loan",
  "credit_card",
  "other",
] as const;

const createLiabilitySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(LIABILITY_TYPES),
  value: z.number().min(0),
  linkedAccountId: z.string().uuid().nullable().optional(),
});

const updateLiabilitySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    type: z.enum(LIABILITY_TYPES).optional(),
    value: z.number().min(0).optional(),
    linkedAccountId: z.string().uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field required",
  });

// GET /api/liabilities
liabilitiesRouter.get("/", authenticateToken, async (_req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const rows = await db
      .select()
      .from(liabilities)
      .where(eq(liabilities.userId, userId))
      .orderBy(asc(liabilities.createdAt));
    res.json({ liabilities: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/liabilities
liabilitiesRouter.post("/", authenticateToken, async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const parsed = createLiabilitySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const { name, type, value, linkedAccountId } = parsed.data;
    const [liability] = await db
      .insert(liabilities)
      .values({
        userId,
        name,
        type,
        value: String(value),
        linkedAccountId: linkedAccountId ?? null,
      })
      .returning();
    res.status(201).json(liability);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/liabilities/:id
liabilitiesRouter.patch("/:id", authenticateToken, async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const id = req.params["id"] as string;
    const parsed = updateLiabilitySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.type !== undefined) updates.type = parsed.data.type;
    if (parsed.data.value !== undefined)
      updates.value = String(parsed.data.value);
    if ("linkedAccountId" in parsed.data)
      updates.linkedAccountId = parsed.data.linkedAccountId ?? null;

    const [updated] = await db
      .update(liabilities)
      .set(updates)
      .where(and(eq(liabilities.id, id), eq(liabilities.userId, userId)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Liability not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/liabilities/:id
liabilitiesRouter.delete("/:id", authenticateToken, async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const id = req.params["id"] as string;
    const [deleted] = await db
      .delete(liabilities)
      .where(and(eq(liabilities.id, id), eq(liabilities.userId, userId)))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Liability not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
