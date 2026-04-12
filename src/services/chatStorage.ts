const CHAT_STORAGE_KEY = "finance-analyser-chat";
const MAX_MESSAGES = 100;

export interface PersistedMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO string
}

type ChatStore = Record<string, PersistedMessage[]>;

function readStore(): ChatStore {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChatStore) : {};
  } catch {
    return {};
  }
}

/** Returns persisted chat messages for the given account. */
export function loadChatHistory(accountId: string): PersistedMessage[] {
  return readStore()[accountId] ?? [];
}

/**
 * Saves the full message list for an account.
 * Trims to the last MAX_MESSAGES entries.
 */
export function saveChatHistory(
  accountId: string,
  messages: PersistedMessage[],
): void {
  try {
    const store = readStore();
    store[accountId] = messages.slice(-MAX_MESSAGES);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Best-effort — storage failures should not break the chat UI
  }
}

/** Removes all chat history for the given account. */
export function clearChatHistory(accountId: string): void {
  try {
    const store = readStore();
    delete store[accountId];
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Best-effort
  }
}
