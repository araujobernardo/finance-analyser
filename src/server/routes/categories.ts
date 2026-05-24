// #769 — Settings page: category management CRUD and bulk transaction delete
// Routes: GET/POST /api/categories, PATCH/DELETE /api/categories/:id

import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { categories, transactions } from "../../db/schema.ts";
import {
  authenticateToken,
  type AuthLocals,
} from "../middleware/authenticateToken.ts";

export const categoriesRouter = Router();

categoriesRouter.use(authenticateToken);

// ── GET / ─────────────────────────────────────────────────────────────────────

categoriesRouter.get("/", async (_req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const rows = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.createdAt);
    res.json({ categories: rows });
  } catch (err) {
    next(err);
  }
});

// ── POST / ────────────────────────────────────────────────────────────────────

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  colour: z
    .string()
    .regex(
      /^#[0-9A-Fa-f]{6}$/,
      "colour must be a 6-digit hex colour e.g. #aabbcc",
    ),
});

categoriesRouter.post("/", async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;

    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      });
      return;
    }

    const [row] = await db
      .insert(categories)
      .values({ userId, name: parsed.data.name, colour: parsed.data.colour })
      .returning();

    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /:id ────────────────────────────────────────────────────────────────

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  colour: z
    .string()
    .regex(
      /^#[0-9A-Fa-f]{6}$/,
      "colour must be a 6-digit hex colour e.g. #aabbcc",
    )
    .optional(),
});

categoriesRouter.patch("/:id", async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const id = req.params["id"] as string;

    const parsed = updateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      });
      return;
    }

    const updates: Partial<{ name: string; colour: string }> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.colour !== undefined) updates.colour = parsed.data.colour;

    const [updated] = await db
      .update(categories)
      .set(updates)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
// Nullifies the category label on all affected transactions, then deletes the
// category row. Does not delete transactions.

categoriesRouter.delete("/:id", async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const id = req.params["id"] as string;

    const [cat] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)));

    if (!cat) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    // Nullify the category field on all transactions that used this category
    await db
      .update(transactions)
      .set({ category: null })
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.category, cat.name),
        ),
      );

    await db
      .delete(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)));

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
