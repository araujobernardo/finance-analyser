import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.ts";
import { financialSummaries } from "../../db/schema.ts";
import {
  authenticateToken,
  type AuthLocals,
} from "../middleware/authenticateToken.ts";
import type { ApiFinancialSummary } from "../../types/api.ts";

export const financialSummariesRouter = Router();

financialSummariesRouter.use(authenticateToken);

function toApiSummary(
  row: typeof financialSummaries.$inferSelect,
): ApiFinancialSummary {
  return {
    id: row.id,
    generatedAt: row.generatedAt.toISOString(),
    content: row.content,
    previousSummaryId: row.previousSummaryId ?? null,
  };
}

// GET /api/summaries/latest
financialSummariesRouter.get("/latest", async (_req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const [row] = await db
      .select()
      .from(financialSummaries)
      .where(eq(financialSummaries.userId, userId))
      .orderBy(desc(financialSummaries.generatedAt))
      .limit(1);
    res.json({ summary: row ? toApiSummary(row) : null });
  } catch (err) {
    next(err);
  }
});

// GET /api/summaries
financialSummariesRouter.get("/", async (_req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const rows = await db
      .select()
      .from(financialSummaries)
      .where(eq(financialSummaries.userId, userId))
      .orderBy(desc(financialSummaries.generatedAt));
    res.json({ summaries: rows.map(toApiSummary) });
  } catch (err) {
    next(err);
  }
});

const createSummarySchema = z.object({
  content: z.string().min(1),
  previousSummaryId: z.string().uuid().nullable().optional(),
});

// POST /api/summaries
financialSummariesRouter.post("/", async (req, res, next) => {
  try {
    const userId = (res.locals as AuthLocals).user.userId;
    const parsed = createSummarySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
      return;
    }
    const { content, previousSummaryId } = parsed.data;
    const [row] = await db
      .insert(financialSummaries)
      .values({
        userId,
        content,
        previousSummaryId: previousSummaryId ?? null,
      })
      .returning();
    res.status(201).json(toApiSummary(row));
  } catch (err) {
    next(err);
  }
});
