// FA-BUDG-003 T008 — Send budget alert email via Resend
// Server-side only — do not import from React components or Vite browser code.

import {
  getResendClient,
  fromAddress,
  appUrl,
} from "../services/emailService.ts";
import type { AlertedCategory } from "./checkBudgetAlerts.ts";

/**
 * Sends a budget alert email listing all categories that have exceeded the
 * alert threshold.
 *
 * @param userEmail - the recipient's email address
 * @param month - human-readable month label, e.g. "May 2026"
 * @param alertedCategories - list of categories with spend details
 */
export async function sendBudgetAlertEmail(
  userEmail: string,
  month: string,
  alertedCategories: AlertedCategory[],
): Promise<void> {
  const resend = getResendClient();

  const categoryLines = alertedCategories
    .map(
      (a) =>
        `<li>${a.categoryName}: $${a.actualSpend.toFixed(2)} of $${a.limitAmount.toFixed(2)} (${Math.round(a.percentageUsed)}%)</li>`,
    )
    .join("\n");

  const budgetUrl = `${appUrl()}/budget`;

  const html = `
<p>Your budget alert for <strong>${month}</strong>:</p>
<ul>
${categoryLines}
</ul>
<p><a href="${budgetUrl}">View your budget</a></p>
`.trim();

  await resend.emails.send({
    from: fromAddress(),
    to: userEmail,
    subject: `Finance Analyser — budget alert for ${month}`,
    html,
  });
}
