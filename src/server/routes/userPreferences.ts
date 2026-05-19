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
      alertThreshold: row.alertThreshold,
      emailAlertsEnabled: row.emailAlertsEnabled,
      lastAlertEmailSentAt: row.lastAlertEmailSentAt,
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── PATCH / ──────────────────────────────────────────────────────────────────
// FA-BUDG-003 T013: extend Zod schema with alertThreshold and emailAlertsEnabled

const updatePreferencesSchema = z.object({
  monthStartDay: z.number().int().min(1).max(28).optional(),
  alertThreshold: z.number().int().min(50).max(100).optional(),
  emailAlertsEnabled: z.boolean().optional(),
});

userPreferencesRouter.patch("/", async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;

    const parsed = updatePreferencesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? "Invalid preferences",
      });
      return;
    }
    const { monthStartDay, alertThreshold, emailAlertsEnabled } = parsed.data;

    const setFields: Record<string, unknown> = { updatedAt: new Date() };
    if (monthStartDay !== undefined) setFields.monthStartDay = monthStartDay;
    if (alertThreshold !== undefined) setFields.alertThreshold = alertThreshold;
    if (emailAlertsEnabled !== undefined)
      setFields.emailAlertsEnabled = emailAlertsEnabled;

    const insertValues = {
      userId,
      monthStartDay: monthStartDay ?? 1,
      alertThreshold: alertThreshold ?? 80,
      emailAlertsEnabled: emailAlertsEnabled ?? true,
    };

    const [upserted] = await db
      .insert(userPreferences)
      .values(insertValues)
      .onConflictDoUpdate({
        target: [userPreferences.userId],
        set: setFields,
      })
      .returning();

    const result: ApiUserPreferences = {
      id: upserted.id,
      monthStartDay: upserted.monthStartDay,
      alertThreshold: upserted.alertThreshold,
      emailAlertsEnabled: upserted.emailAlertsEnabled,
      lastAlertEmailSentAt: upserted.lastAlertEmailSentAt,
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});
