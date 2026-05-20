import Anthropic from "@anthropic-ai/sdk";

export const ALL_ACCOUNTS_ID = "all" as const;

/** Token budget cap — if context exceeds this, trim to most recent 3 months. */
const MAX_TOKENS = 80_000;
/** Rough token estimate: 1 token ≈ 4 characters. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
// Suppress unused-variable warning — estimateTokens kept for future API use.
void estimateTokens;
void MAX_TOKENS;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Builds a concise finance summary to inject as system context.
 *
 * NOTE: This function previously read from localStorage (storage.ts).
 * storage.ts has been deleted as part of FA-CORE-001 T013. ChatPage now
 * builds its own context from ApiTransaction[] directly. This function
 * is kept for backward-compatibility but always returns an empty-data
 * message. It will be removed or rewritten in a future story.
 *
 * @param activeAccountId - Unused — kept for interface compatibility.
 */
export function buildFinanceContext(
  _activeAccountId: string | typeof ALL_ACCOUNTS_ID = ALL_ACCOUNTS_ID,
): string {
  return "The user has not uploaded any financial data yet.";
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
