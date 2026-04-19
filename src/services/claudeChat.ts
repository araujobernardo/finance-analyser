import Anthropic from "@anthropic-ai/sdk";
import { getAccounts, getAccountMonths, getTransactions } from "./storage";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Builds a concise finance summary to inject as system context. */
export function buildFinanceContext(): string {
  const accounts = getAccounts();
  if (accounts.length === 0) {
    return "The user has not uploaded any financial data yet.";
  }

  const lines: string[] = ["The user's financial data is summarised below."];
  let hasAnyData = false;

  for (const account of accounts) {
    const months = getAccountMonths(account.id);
    if (months.length === 0) continue;

    lines.push(`\n# Account: ${account.name}`);

    for (const monthKey of months) {
      const { transactions } = getTransactions(account.id, monthKey);
      if (transactions.length === 0) continue;

      hasAnyData = true;

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

      // Category totals
      const byCategory: Record<string, number> = {};
      for (const t of transactions) {
        if (t.amount >= 0) continue;
        const cat = t.category || "Uncategorised";
        byCategory[cat] = (byCategory[cat] ?? 0) + Math.abs(t.amount);
      }
      const topCategories = Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, total]) => `${cat}: $${total.toFixed(2)}`)
        .join(", ");

      lines.push(
        `\n## ${label}`,
        `- Income: $${income.toFixed(2)}`,
        `- Expenses: $${expenses.toFixed(2)}`,
        `- Net savings: $${net.toFixed(2)}`,
        `- Top categories: ${topCategories || "none"}`,
      );
    }
  }

  if (!hasAnyData) {
    return "The user has not uploaded any financial data yet.";
  }

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are a helpful personal finance assistant. Answer questions concisely and specifically based on the user's financial data provided. If the data doesn't contain enough information to answer, say so clearly. Do not make up numbers.`;

/**
 * Streams a Claude API response for the given conversation history.
 * Calls onChunk with each text delta, onDone when complete, onError on failure.
 */
export async function streamChatResponse(
  history: ChatMessage[],
  onChunk: (delta: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
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

  const financeContext = buildFinanceContext();
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
