// #769 — Settings page: category management CRUD and bulk transaction delete
// Routes: GET/POST /api/categories, PATCH/DELETE /api/categories/:id

import { Router } from "express";
import { eq, and, isNotNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { categories, transactions } from "../../db/schema.ts";
import {
  authenticateToken,
  type AuthLocals,
} from "../middleware/authenticateToken.ts";

// Deterministic default colour from name hash — used when auto-migrating
// transaction categories that have no category row yet.
const DEFAULT_COLOUR_PALETTE = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];
function defaultColour(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return DEFAULT_COLOUR_PALETTE[
    Math.abs(hash) % DEFAULT_COLOUR_PALETTE.length
  ]!;
}

export const categoriesRouter = Router();

categoriesRouter.use(authenticateToken);

// "Transfer" is a behavioral flag (isTransfer), not a category.
// It must never appear in the categories list or be auto-migrated from transactions.
const RESERVED_CATEGORY = "Transfer";

// ── GET / ─────────────────────────────────────────────────────────────────────
// Returns all categories for the user. On first call after the #774 fix,
// any transaction category that has no categories-table row is auto-migrated
// with a deterministic default colour so PATCH/DELETE always find a real row.
// "Transfer" is excluded from both auto-migration and the response.

categoriesRouter.get("/", async (_req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;

    // Clean up legacy data: any transaction carrying "Transfer" as a category
    // string — whether or not isTransfer is set — since "Transfer" is reserved
    // and must never appear as a user-visible category label.
    await db
      .update(transactions)
      .set({ category: null })
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.category, RESERVED_CATEGORY),
        ),
      );

    const existingRows = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          ne(categories.name, RESERVED_CATEGORY),
        ),
      )
      .orderBy(categories.createdAt);

    const existingNames = new Set(existingRows.map((r) => r.name));

    // Find distinct category names used in transactions but not yet in the table.
    // Exclude "Transfer" — it is never a real category.
    const txnCatRows = await db
      .selectDistinct({ category: transactions.category })
      .from(transactions)
      .where(
        and(eq(transactions.userId, userId), isNotNull(transactions.category)),
      );

    const missing = txnCatRows
      .map((r) => r.category as string)
      .filter((name) => name !== RESERVED_CATEGORY && !existingNames.has(name));

    if (missing.length > 0) {
      await db.insert(categories).values(
        missing.map((name) => ({
          userId,
          name,
          colour: defaultColour(name),
        })),
      );

      const allRows = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.userId, userId),
            ne(categories.name, RESERVED_CATEGORY),
          ),
        )
        .orderBy(categories.createdAt);
      res.json({ categories: allRows });
      return;
    }

    res.json({ categories: existingRows });
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

    // Fetch the existing row first so we know the old name for cascade
    const [existing] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)));

    if (!existing) {
      res.status(404).json({ error: "Category not found" });
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

    // Cascade name change to all transactions that used the old category name
    if (parsed.data.name !== undefined && parsed.data.name !== existing.name) {
      await db
        .update(transactions)
        .set({ category: parsed.data.name })
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.category, existing.name),
          ),
        );
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
