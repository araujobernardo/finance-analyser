import { useState, useEffect } from "react";
import {
  loadChatHistory,
  saveChatHistory,
  type PersistedMessage,
} from "../services/chatStorage";
import type { ChatMessage } from "../services/claudeChat";

export interface DisplayMessage {
  role: "user" | "bot";
  text: string;
  isStreaming?: boolean;
}

export interface UseChatHistoryResult {
  displayMessages: DisplayMessage[];
  apiHistory: ChatMessage[];
  appendUserMessage: (text: string) => void;
  appendAssistantMessage: (text: string) => void;
  setStreamingMessage: (text: string) => void;
  markStreamingDone: () => void;
  setError: (message: string) => void;
  reset: () => void;
}

const ACCOUNT_ID = "global";

function toDisplayMessage(m: PersistedMessage): DisplayMessage {
  return { role: m.role === "user" ? "user" : "bot", text: m.content };
}

function toApiMessage(m: PersistedMessage): ChatMessage {
  return { role: m.role, content: m.content };
}

function persist(messages: PersistedMessage[]): void {
  saveChatHistory(ACCOUNT_ID, messages);
}

export function useChatHistory(): UseChatHistoryResult {
  const [persisted, setPersisted] = useState<PersistedMessage[]>(() =>
    loadChatHistory(ACCOUNT_ID),
  );
  const [streamingText, setStreamingText] = useState<string | null>(null);

  // On mount load is done lazily via useState initialiser above
  useEffect(() => {
    // Nothing extra needed — initial state is populated synchronously
  }, []);

  const displayMessages: DisplayMessage[] = [
    ...persisted.map(toDisplayMessage),
    ...(streamingText !== null
      ? [{ role: "bot" as const, text: streamingText, isStreaming: true }]
      : []),
  ];

  const apiHistory: ChatMessage[] = persisted.map(toApiMessage);

  function appendUserMessage(text: string): void {
    const msg: PersistedMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setPersisted((prev) => {
      const next = [...prev, msg];
      persist(next);
      return next;
    });
  }

  function appendAssistantMessage(text: string): void {
    const msg: PersistedMessage = {
      role: "assistant",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setPersisted((prev) => {
      const next = [...prev, msg];
      persist(next);
      return next;
    });
    setStreamingText(null);
  }

  function setStreamingMessage(text: string): void {
    setStreamingText(text);
  }

  function markStreamingDone(): void {
    if (streamingText === null) return;
    appendAssistantMessage(streamingText);
  }

  function setError(message: string): void {
    // Error is shown in UI but NOT persisted
    setStreamingText(`Error: ${message}`);
  }

  function reset(): void {
    setPersisted([]);
    setStreamingText(null);
    saveChatHistory(ACCOUNT_ID, []);
  }

  return {
    displayMessages,
    apiHistory,
    appendUserMessage,
    appendAssistantMessage,
    setStreamingMessage,
    markStreamingDone,
    setError,
    reset,
  };
}
