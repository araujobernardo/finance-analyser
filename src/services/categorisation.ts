import type { Transaction } from "../utils/csvParser";

export const CATEGORIES = [
  "Groceries",
  "Transport",
  "Utilities",
  "Dining",
  "Entertainment",
  "Healthcare",
  "Shopping",
  "Education",
  "Income",
  "Transfer",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

const BATCH_SIZE = 50;
const MAX_DESC_LENGTH = 200;

/**
 * Sends transaction descriptions to the Claude API in batches and returns
 * the same transactions with a `category` field populated.
 *
 * Falls back to "Uncategorised" for every transaction if:
 * - VITE_CLAUDE_API_KEY is not set
 * - The API call fails for any reason
 * - The API returns an unexpected response shape
 */
export async function categoriseTransactions(
  transactions: Transaction[],
): Promise<Transaction[]> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

  // Separate already-categorised from those needing classification.
  const needsCategory = transactions.filter((t) => !t.category);

  if (!apiKey || needsCategory.length === 0) {
    // Respect existing categories; fall back to "Uncategorised" only for unset ones.
    return transactions.map((t) => ({
      ...t,
      category: t.category ?? "Uncategorised",
    }));
  }

  try {
    // Classify only the uncategorised subset.
    const classified: Transaction[] = [];
    for (let start = 0; start < needsCategory.length; start += BATCH_SIZE) {
      const batch = needsCategory.slice(start, start + BATCH_SIZE);
      const categories = await categoriseBatch(batch, apiKey);
      for (let i = 0; i < batch.length; i++) {
        classified.push({ ...batch[i], category: categories[i] });
      }
    }

    // Merge classified results back into the original order.
    let classifiedIdx = 0;
    return transactions.map((t) =>
      t.category ? t : classified[classifiedIdx++],
    );
  } catch {
    return transactions.map((t) => ({
      ...t,
      category: t.category ?? "Uncategorised",
    }));
  }
}

async function categoriseBatch(
  batch: Transaction[],
  apiKey: string,
): Promise<string[]> {
  const lines = batch
    .map((t, i) => `${i}: ${t.description.slice(0, MAX_DESC_LENGTH)}`)
    .join("\n");

  const prompt =
    `Categorise each transaction into exactly one of these categories: ${CATEGORIES.join(", ")}.\n` +
    `Reply with ONLY a JSON array of strings, one per transaction, in the same order. No explanation.\n\n` +
    `Transactions:\n${lines}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    return fallback(batch.length);
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; text: string }>;
  };

  const text = data.content.find((c) => c.type === "text")?.text ?? "[]";

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fallback(batch.length);
  }

  if (!Array.isArray(parsed)) return fallback(batch.length);

  return parsed.map((c) =>
    typeof c === "string" && (CATEGORIES as readonly string[]).includes(c)
      ? c
      : "Uncategorised",
  );
}

function fallback(length: number): string[] {
  return Array(length).fill("Uncategorised");
}
