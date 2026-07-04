// FA-AI-001 — AI financial advisor service
// T007: FINANCIAL_ADVISOR_SYSTEM_PROMPT, buildAdvisorPrompt, generateSummary

import Anthropic from "@anthropic-ai/sdk";
import type {
  ApiTransaction,
  ApiGoal,
  ApiBudget,
  ApiSnapshot,
  ApiFinancialSummary,
} from "../types/api";

/**
 * Standing system prompt for the AI financial advisor persona.
 * Stored verbatim as a constant — not user-editable in the UI.
 *
 * Output format: transaction summary → behavioural read → 2–3 concrete actions.
 */
export const FINANCIAL_ADVISOR_SYSTEM_PROMPT = `You are a proactive personal financial advisor reviewing a New Zealand user's complete financial picture. Your role is to give them a clear, honest, and actionable summary of where they stand — without being asked.

Your response MUST follow this exact three-part structure:

**1. TRANSACTION SUMMARY**
Summarise the user's financial activity over the last 90 days. Cover:
- Total income vs total spending (use NZD)
- Top spending categories and approximate amounts
- Any notable patterns (e.g. subscription creep, post-payday spending spikes, seasonal variation)
- Net cash flow trend

**2. BEHAVIOURAL READ**
Identify the key financial behaviours and patterns visible in the data. Be specific and honest — not just descriptive. Cover:
- Spending habits that stand out (positive or negative)
- Progress (or lack thereof) toward goals and budget targets
- Any concerning trends that deserve attention
- How this period compares to the previous summary, if one exists

**3. RECOMMENDED ACTIONS**
Give exactly 2–3 specific, actionable steps the user can take right now based on the data. Each action must be:
- Grounded in the actual numbers (reference specific amounts or categories)
- Achievable within the next 30 days
- Concrete — not generic advice

Rules:
- Use NZD for all dollar amounts
- If data is missing for a section (e.g. no goals set), acknowledge it briefly and move on
- Do not make up numbers — only reference what is in the data provided
- Keep the total response under 500 words
- Write in plain, direct English — no jargon, no filler phrases like "Great job!" or "It's important to..."`;

// ─── Prompt assembly ─────────────────────────────────────────────────────────

const DAYS_90_MS = 90 * 24 * 60 * 60 * 1000;

function formatDate(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

function formatAmount(n: number): string {
  return `$${Math.abs(n).toLocaleString("en-NZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Assembles the structured context block sent as the user message to the AI.
 * Follows the Context Assembly section in specs/935-ai-finance-summary/plan.md.
 *
 * @param transactions - All transactions available; function filters to last 90
 *   days and excludes transfers.
 * @param goals - All goals for the user (active, achieved, abandoned).
 * @param budgets - Current-month budgets with actual spend.
 * @param netWorthSnapshot - Latest net worth snapshot, or null if none.
 * @param previousSummary - Most recent stored summary (for diff context), or null.
 */
export function buildAdvisorPrompt(
  transactions: ApiTransaction[],
  goals: ApiGoal[],
  budgets: ApiBudget[],
  netWorthSnapshot: ApiSnapshot | null,
  previousSummary: ApiFinancialSummary | null,
): string {
  const today = new Date();
  const cutoff = new Date(today.getTime() - DAYS_90_MS);

  // Filter: last 90 days, exclude transfers.
  const recentTxns = transactions
    .filter((t) => {
      const d = new Date(t.date);
      return d >= cutoff && !t.isTransfer && !t.isManualTransfer;
    })
    .sort((a, b) => b.date.localeCompare(a.date)); // newest first

  const parts: string[] = [];

  // Current date header
  parts.push(`[Current date: ${formatDate(today.toISOString())}]`);
  parts.push("");

  // TRANSACTIONS section
  parts.push(`TRANSACTIONS (last 90 days, excluding transfers):`);
  if (recentTxns.length === 0) {
    parts.push("No transactions in the last 90 days.");
  } else {
    for (const t of recentTxns) {
      const sign = t.amount < 0 ? "-" : "+";
      const amt = `${sign}${formatAmount(t.amount)}`;
      const cat = t.category ?? "Uncategorised";
      parts.push(`${t.date} | ${amt} | ${cat} | ${t.description}`);
    }
  }
  parts.push("");

  // GOALS section
  parts.push("GOALS:");
  const activeGoals = goals.filter((g) => g.status === "active");
  if (activeGoals.length === 0) {
    parts.push("No active goals set.");
  } else {
    for (const g of activeGoals) {
      const target = formatAmount(parseFloat(g.targetAmount));
      const current =
        g.currentAmount != null
          ? formatAmount(parseFloat(g.currentAmount))
          : "unknown";
      const deadline = g.targetDate ? ` by ${g.targetDate}` : "";
      parts.push(
        `- ${g.name}: target ${target}${deadline}, currently at ${current} (${g.status})`,
      );
    }
  }
  parts.push("");

  // BUDGETS section
  parts.push("BUDGETS (current month):");
  if (budgets.length === 0) {
    parts.push("No budget limits set.");
  } else {
    for (const b of budgets) {
      const limit = formatAmount(b.limitAmount);
      const spent = formatAmount(b.actualSpend);
      const pct = b.percentageUsed.toFixed(0);
      parts.push(
        `- ${b.categoryName}: budget ${limit}, spent ${spent} (${pct}%)`,
      );
    }
  }
  parts.push("");

  // NET WORTH section
  parts.push("NET WORTH (latest snapshot):");
  if (netWorthSnapshot === null) {
    parts.push("No net worth snapshot available.");
  } else {
    const assets = formatAmount(parseFloat(netWorthSnapshot.totalAssets));
    const liabilities = formatAmount(
      parseFloat(netWorthSnapshot.totalLiabilities),
    );
    const netWorth = formatAmount(parseFloat(netWorthSnapshot.netWorth));
    parts.push(
      `Assets: ${assets} | Liabilities: ${liabilities} | Net worth: ${netWorth}`,
    );
  }
  parts.push("");

  // PREVIOUS SUMMARY section
  if (previousSummary !== null) {
    const prevDate = formatDate(previousSummary.generatedAt);
    parts.push(`PREVIOUS SUMMARY (${prevDate}):`);
    parts.push(previousSummary.content);
  } else {
    parts.push("PREVIOUS SUMMARY:");
    parts.push("No previous summary available.");
  }

  return parts.join("\n");
}

// ─── AI call ─────────────────────────────────────────────────────────────────

/**
 * Calls the Anthropic API with the assembled context prompt and returns the
 * full text of the first content block.
 *
 * Uses the browser-side pattern (dangerouslyAllowBrowser: true) consistent
 * with claudeChat.ts and categorisation.ts.
 *
 * @param contextPrompt - Output of buildAdvisorPrompt().
 */
export async function generateSummary(contextPrompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error("VITE_ANTHROPIC_API_KEY is not set.");
  }

  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: FINANCIAL_ADVISOR_SYSTEM_PROMPT,
    messages: [{ role: "user", content: contextPrompt }],
  });

  const firstBlock = response.content[0];
  if (!firstBlock || firstBlock.type !== "text") {
    throw new Error("Unexpected response format from Anthropic API.");
  }
  return firstBlock.text;
}
