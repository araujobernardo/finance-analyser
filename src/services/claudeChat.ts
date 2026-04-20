import Anthropic from "@anthropic-ai/sdk";
import { getAccounts, getAccountMonths, getTransactions } from "./storage";

export const ALL_ACCOUNTS_ID = "all" as const;

/** Token budget cap — if context exceeds this, trim to most recent 3 months. */
const MAX_TOKENS = 80_000;
/** Rough token estimate: 1 token ≈ 4 characters. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Builds a concise finance summary to inject as system context.
 *
 * @param activeAccountId - When `'all'`, includes all accounts; otherwise
 *   restricts to the specified account ID. Defaults to `'all'` for
 *   backward-compatibility.
 */
export function buildFinanceContext(
  activeAccountId: string | typeof ALL_ACCOUNTS_ID = ALL_ACCOUNTS_ID,
): string {
  const allAccounts = getAccounts();
  if (allAccounts.length === 0) {
    return "The user has not uploaded any financial data yet.";
  }

  // Determine which accounts to include
  const accounts =
    activeAccountId === ALL_ACCOUNTS_ID
      ? allAccounts
      : allAccounts.filter((a) => a.id === activeAccountId);

  if (accounts.length === 0) {
    return "The user has not uploaded any financial data yet.";
  }

  // --- Collect all (accountId, monthKey) pairs sorted by date (newest first) ---
  const allMonthEntries: Array<{ accountId: string; monthKey: string }> = [];
  for (const account of accounts) {
    const months = getAccountMonths(account.id);
    for (const m of months) {
      allMonthEntries.push({ accountId: account.id, monthKey: m });
    }
  }
  // Sort descending (newest month first) for trimming purposes
  allMonthEntries.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  // --- Build the context lines without trimming first ---
  function buildLines(
    entries: Array<{ accountId: string; monthKey: string }>,
    includedAccounts: typeof accounts,
  ): string[] {
    // Group month lines by account first (so we know which accounts have data)
    const byAccount = new Map<string, string[]>();
    for (const account of includedAccounts) {
      byAccount.set(account.id, []);
    }

    for (const { accountId, monthKey } of entries) {
      const account = includedAccounts.find((a) => a.id === accountId);
      if (!account) continue;

      const { transactions } = getTransactions(accountId, monthKey);
      if (transactions.length === 0) continue;

      const [year, month] = monthKey.split("-");
      const label = new Date(Number(year), Number(month) - 1, 1).toLocaleString(
        "en",
        { month: "long", year: "numeric" },
      );

      const income = transactions
        .filter((t) => t.amount > 0)
        .reduce((s, t) => s + t.amount, 0);
      const expenses = transactions
        .filter((t) => t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      const net = income - expenses;

      const byCategoryMap: Record<string, number> = {};
      for (const t of transactions) {
        if (t.amount >= 0) continue;
        const cat = t.category || "Uncategorised";
        byCategoryMap[cat] = (byCategoryMap[cat] ?? 0) + Math.abs(t.amount);
      }
      const topCategories = Object.entries(byCategoryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, total]) => `${cat}: $${total.toFixed(2)}`)
        .join(", ");

      byAccount
        .get(accountId)
        ?.push(
          `\n## ${label}`,
          `- Income: $${income.toFixed(2)}`,
          `- Expenses: $${expenses.toFixed(2)}`,
          `- Net savings: $${net.toFixed(2)}`,
          `- Top categories: ${topCategories || "none"}`,
        );
    }

    // Determine which accounts actually have data
    const accountsWithData = includedAccounts.filter(
      (a) => (byAccount.get(a.id) ?? []).length > 0,
    );

    if (accountsWithData.length === 0) return [];

    const lines: string[] = [];

    if (activeAccountId === ALL_ACCOUNTS_ID && accountsWithData.length > 1) {
      const names = accountsWithData.map((a) => a.name).join(", ");
      lines.push(
        `The user has ${accountsWithData.length} accounts: ${names}.`,
        "The financial data for each account is summarised below.",
      );
    } else {
      lines.push("The user's financial data is summarised below.");
    }

    for (const account of accountsWithData) {
      const monthLines = byAccount.get(account.id) ?? [];
      lines.push(`\n# Account: ${account.name}`);
      lines.push(...monthLines);
    }

    return lines;
  }

  // Build full context
  let contextLines = buildLines(allMonthEntries, accounts);
  if (contextLines.length === 0) {
    return "The user has not uploaded any financial data yet.";
  }

  let contextText = contextLines.join("\n");

  // --- Token budget enforcement ---
  if (estimateTokens(contextText) > MAX_TOKENS) {
    // Trim to most recent 3 months across all selected accounts
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 3);
    const cutoffKey = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, "0")}`;

    const trimmedEntries = allMonthEntries.filter(
      (e) => e.monthKey >= cutoffKey,
    );

    contextLines = buildLines(trimmedEntries, accounts);
    if (contextLines.length === 0) {
      contextLines = ["The user has not uploaded any financial data yet."];
    } else {
      contextLines.push(
        "\nNote: Context has been trimmed to the most recent 3 months to stay within the token limit.",
      );
    }
    contextText = contextLines.join("\n");
  }

  return contextText;
}

const SYSTEM_PROMPT = `You are a helpful personal finance assistant. Answer questions concisely and specifically based on the user's financial data provided. If the data doesn't contain enough information to answer, say so clearly. Do not make up numbers.`;

/**
 * Streams a Claude API response for the given conversation history.
 * Calls onChunk with each text delta, onDone when complete, onError on failure.
 *
 * @param activeAccountId - Passed to `buildFinanceContext` to scope context.
 *   Defaults to `'all'` (all accounts).
 */
export async function streamChatResponse(
  history: ChatMessage[],
  onChunk: (delta: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
  activeAccountId: string | typeof ALL_ACCOUNTS_ID = ALL_ACCOUNTS_ID,
): Promise<void> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) {
    onError(new Error("VITE_ANTHROPIC_API_KEY is not set."));
    return;
  }

  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const financeContext = buildFinanceContext(activeAccountId);
  const systemPrompt = `${SYSTEM_PROMPT}\n\n${financeContext}`;

  try {
    const stream = client.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        onChunk(event.delta.text);
      }
    }
    onDone();
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}
