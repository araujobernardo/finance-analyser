# Data Model: AI Chat Enhancements

**Branch**: `001-ai-chat-enhancements` | **Date**: 2026-04-19

## Existing Types (unchanged)

### `PersistedMessage` — `src/services/chatStorage.ts`

```ts
interface PersistedMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string; // ISO-8601
}
```

Used for localStorage persistence. Already defined — no changes.

### `ChatMessage` — `src/services/claudeChat.ts`

```ts
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
```

Used as the Anthropic API message format. Already defined — no changes.

### `DisplayMessage` — `src/components/ChatPanel.tsx` (local)

```ts
interface DisplayMessage {
  role: "user" | "bot";
  text: string;
  isStreaming?: boolean;
}
```

UI-only render type. Already defined — no changes.

## New Type

### `UseChatHistoryResult` — `src/hooks/useChatHistory.ts`

The return type of the new `useChatHistory` hook:

```ts
interface UseChatHistoryResult {
  displayMessages: DisplayMessage[];
  apiHistory: ChatMessage[];
  appendUserMessage: (text: string) => void;
  appendAssistantMessage: (text: string) => void;
  setStreamingMessage: (text: string) => void;
  markStreamingDone: () => void;
  setError: (message: string) => void;
}
```

| Field                    | Description                                    |
| ------------------------ | ---------------------------------------------- |
| `displayMessages`        | Derived UI messages for rendering in ChatPanel |
| `apiHistory`             | Completed API messages for sending to Claude   |
| `appendUserMessage`      | Adds user turn; persists immediately           |
| `appendAssistantMessage` | Adds completed assistant turn; persists        |
| `setStreamingMessage`    | Updates the in-progress streaming bubble       |
| `markStreamingDone`      | Finalises the streaming bubble; persists       |
| `setError`               | Replaces last bubble with an error message     |

## Storage Layout (unchanged)

```
localStorage["finance-analyser-chat"] = {
  "global": PersistedMessage[],   ← chat panel uses this key
}
```

The `"global"` key is the only value written by the chat panel. Other accountId-keyed entries remain available for future per-account history features.

## State Transitions

```
EMPTY STATE
  → user sends message → appendUserMessage() → save to storage
  → streaming starts  → setStreamingMessage() (no save — in-progress)
  → streaming ends    → markStreamingDone()   → save to storage
  → error occurs      → setError()            → no save (error not persisted)
```
