import Anthropic from "@anthropic-ai/sdk";
import type { Transaction } from "../utils/csvParser";
import { getRuleForDescription } from "./categoryRules";

// Exported for test injection only — do not call directly in production code.
export const _clientFactory = {
  create: (apiKey: string) =>
    new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) as {
      messages: { create: (params: unknown) => Promise<unknown> };
    },
};

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

  // Apply stored category rules first — rules always win over API.
  const withRules = transactions.map((t) => {
    if (t.category) return t;
    const rule = getRuleForDescription(t.description);
    return rule ? { ...t, category: rule } : t;
  });

  // Separate already-categorised from those needing classification.
  const needsCategory = withRules.filter((t) => !t.category);

  if (!apiKey) {
    console.warn(
      "[categorisation] VITE_ANTHROPIC_API_KEY is not set — skipping API.",
    );
    return withRules.map((t) => ({
      ...t,
      category: t.category ?? "Uncategorised",
    }));
  }
  if (needsCategory.length === 0) {
    return withRules.map((t) => ({
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
    return withRules.map((t) => (t.category ? t : classified[classifiedIdx++]));
  } catch (err) {
    console.error("[categorisation] Unexpected error:", err);
    return withRules.map((t) => ({
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

  const client = _clientFactory.create(apiKey);

  let text: string;
  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    const msg = message as { content: Array<{ type: string; text?: string }> };
    const block = msg.content.find((c) => c.type === "text");
    text = block?.text ?? "[]";
  } catch (err) {
    console.error("[categorisation] API call failed:", err);
    return fallback(batch.length);
  }

  // Strip markdown code fences if Claude wraps the response (e.g. ```json ... ```)
  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch (err) {
    console.error(
      "[categorisation] JSON parse failed. Raw response:",
      text,
      err,
    );
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
