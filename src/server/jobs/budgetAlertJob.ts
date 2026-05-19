// FA-BUDG-003 T009 — Daily budget alert job
// Processes all users with emailAlertsEnabled=true who have not yet received an
// alert email today, and sends them a budget alert email if any categories exceed
// their alert threshold.
// Server-side only.

import { and, eq, isNull, lt, ne, or } from "drizzle-orm";
import type { db as DbInstance } from "../../db/index.ts";
import { users, userPreferences } from "../../db/schema.ts";
import { checkBudgetAlerts } from "../utils/checkBudgetAlerts.ts";
import { sendBudgetAlertEmail } from "../utils/sendBudgetAlertEmail.ts";

type Db = typeof DbInstance;

/**
 * Runs the daily budget alert job.
 *
 * For each user with emailAlertsEnabled=true who has not received an alert
 * today:
 *   1. Checks which budget categories exceed their alert threshold
 *   2. If any categories are alerted, sends a budget alert email
 *   3. Updates lastAlertEmailSentAt to today on success
 *
 * Processes users sequentially (not in parallel) to stay within Resend rate
 * limits. Logs but does not throw on individual user failures.
 */
export async function runBudgetAlertJob(db: Db): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  // Format human-readable month label e.g. "May 2026"
  const now = new Date();
  const monthLabel = now.toLocaleDateString("en-NZ", {
    month: "long",
    year: "numeric",
  });

  // Fetch all users where emailAlertsEnabled=true AND (lastAlertEmailSentAt IS NULL OR < today)
  const eligible = await db
    .select({
      userId: userPreferences.userId,
      email: users.email,
    })
    .from(userPreferences)
    .innerJoin(users, eq(users.id, userPreferences.userId))
    .where(
      and(
        eq(userPreferences.emailAlertsEnabled, true),
        or(
          isNull(userPreferences.lastAlertEmailSentAt),
          and(
            ne(userPreferences.lastAlertEmailSentAt, today),
            lt(userPreferences.lastAlertEmailSentAt, today),
          ),
        ),
      ),
    );

  let sent = 0;

  for (const { userId, email } of eligible) {
    try {
      const alerted = await checkBudgetAlerts(userId, db);

      if (alerted.length === 0) continue;

      await sendBudgetAlertEmail(email, monthLabel, alerted);

      // Update lastAlertEmailSentAt only on success
      await db
        .update(userPreferences)
        .set({ lastAlertEmailSentAt: today })
        .where(eq(userPreferences.userId, userId));

      sent++;
    } catch (err) {
      // Log but continue to the next user
      console.error(`[budgetAlertJob] Failed for userId=${userId}:`, err);
    }
  }

  console.log(
    `[budgetAlertJob] Done. ${sent} alert email(s) sent for ${today}.`,
  );
}
