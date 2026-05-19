// FA-BUDG-002 — Budget vs Actual Spend Comparison View
// Routes: GET /api/preferences, PATCH /api/preferences

import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { userPreferences } from "../../db/schema.ts";
import {
  authenticateToken,
  type AuthLocals,
} from "../middleware/authenticateToken.ts";
import type { ApiUserPreferences } from "../../types/api.ts";

export const userPreferencesRouter = Router();

userPreferencesRouter.use(authenticateToken);

// ── GET / ────────────────────────────────────────────────────────────────────

userPreferencesRouter.get("/", async (_req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;

    let [row] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));

    // Create default row if none exists
    if (!row) {
      const [inserted] = await db
        .insert(userPreferences)
        .values({ userId, monthStartDay: 1 })
        .returning();
      row = inserted;
    }

    const result: ApiUserPreferences = {
      id: row.id,
      monthStartDay: row.monthStartDay,
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── PATCH / ──────────────────────────────────────────────────────────────────

const updatePreferencesSchema = z.object({
  monthStartDay: z.number().int().min(1).max(28),
});

userPreferencesRouter.patch("/", async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;

    const parsed = updatePreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          error:
            parsed.error.issues[0]?.message ??
            "monthStartDay must be an integer between 1 and 28",
        });
      return;
    }
    const { monthStartDay } = parsed.data;

    const [upserted] = await db
      .insert(userPreferences)
      .values({ userId, monthStartDay })
      .onConflictDoUpdate({
        target: [userPreferences.userId],
        set: { monthStartDay, updatedAt: new Date() },
      })
      .returning();

    const result: ApiUserPreferences = {
      id: upserted.id,
      monthStartDay: upserted.monthStartDay,
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});
