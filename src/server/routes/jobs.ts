// FA-BUDG-003 T010 — Job endpoint for cron-triggered budget alerts
// Protected by CRON_SECRET header — not user authentication.

import { Router } from "express";
import { db } from "../../db/index.ts";
import { runBudgetAlertJob } from "../jobs/budgetAlertJob.ts";

export const jobsRouter = Router();

// ── POST /budget-alerts ──────────────────────────────────────────────────────

jobsRouter.post("/budget-alerts", async (req, res, next) => {
  try {
    const secret = req.headers["x-cron-secret"];
    const cronSecret = process.env.CRON_SECRET;

    if (!secret || !cronSecret || secret !== cronSecret) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await runBudgetAlertJob(db);

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});
