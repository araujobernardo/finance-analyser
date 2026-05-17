import { Router } from "express";
import { eq, and, asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { liabilities } from "../../db/schema.ts";
import {
  authenticateToken,
  type AuthLocals,
} from "../middleware/authenticateToken.ts";
import { syncLinkedAssets } from "../utils/syncLinkedAssets.ts";

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
    autoSync: z.boolean().optional(),
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
    const [inserted] = await db
      .insert(liabilities)
      .values({
        userId,
        name,
        type,
        value: String(value),
        linkedAccountId: linkedAccountId ?? null,
      })
      .returning();

    // FA-NW-004: if a linked account was provided, sync the value immediately
    if (inserted.linkedAccountId) {
      await syncLinkedAssets(inserted.linkedAccountId, userId, db);
      const [synced] = await db
        .select()
        .from(liabilities)
        .where(
          and(eq(liabilities.id, inserted.id), eq(liabilities.userId, userId)),
        );
      res.status(201).json(synced ?? inserted);
      return;
    }

    res.status(201).json(inserted);
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

    if (parsed.data.value !== undefined) {
      // Branch (a): explicit value → disable auto-sync
      updates.value = String(parsed.data.value);
      updates.autoSync = false;
      updates.balanceClamped = false;
    } else if (parsed.data.autoSync === true) {
      // Branch (b): re-enable auto-sync → will sync after update
      updates.autoSync = true;
    } else if (parsed.data.autoSync === false) {
      updates.autoSync = false;
    }

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

    // FA-NW-004: sync after re-enabling or after linkedAccountId change with autoSync=true
    const shouldSync =
      updated.linkedAccountId !== null &&
      (parsed.data.autoSync === true ||
        ("linkedAccountId" in parsed.data && updated.autoSync));

    if (shouldSync && updated.linkedAccountId) {
      await syncLinkedAssets(updated.linkedAccountId, userId, db);
      const [synced] = await db
        .select()
        .from(liabilities)
        .where(and(eq(liabilities.id, id), eq(liabilities.userId, userId)));
      res.json(synced ?? updated);
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
