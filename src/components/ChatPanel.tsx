import { useState, useRef, useEffect } from "react";
import { streamChatResponse } from "../services/claudeChat";
import type { ChatMessage } from "../services/claudeChat";
import {
  loadChatHistory,
  saveChatHistory,
  clearChatHistory,
} from "../services/chatStorage";
import type { PersistedMessage } from "../services/chatStorage";
import { DEFAULT_ACCOUNT_ID } from "../services/storage";
import "./ChatPanel.css";

interface DisplayMessage {
  role: "user" | "bot";
  text: string;
  timestamp?: string; // ISO string
  isStreaming?: boolean;
}

interface ChatPanelProps {
  accountId?: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function persistedToDisplay(m: PersistedMessage): DisplayMessage {
  return {
    role: m.role === "user" ? "user" : "bot",
    text: m.content,
    timestamp: m.timestamp,
  };
}

function persistedToChat(m: PersistedMessage): ChatMessage {
  return { role: m.role, content: m.content };
}

// Note: if accountId can change at runtime, remount with key={accountId}
// so lazy initialisers re-run with the new account's history.
export function ChatPanel({ accountId = DEFAULT_ACCOUNT_ID }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>(() =>
    loadChatHistory(accountId).map(persistedToDisplay),
  );
  const [history, setHistory] = useState<ChatMessage[]>(() =>
    loadChatHistory(accountId).map(persistedToChat),
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  function handleClearChat() {
    clearChatHistory(accountId);
    setMessages([]);
    setHistory([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userTimestamp = new Date().toISOString();
    const newHistory: ChatMessage[] = [
      ...history,
      { role: "user", content: text },
    ];

    setMessages((prev) => [
      ...prev,
      { role: "user", text, timestamp: userTimestamp },
      { role: "bot", text: "", isStreaming: true },
    ]);
    setInput("");
    setIsLoading(true);

    let accumulated = "";

    streamChatResponse(
      newHistory,
      (delta) => {
        accumulated += delta;
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "bot",
            text: accumulated,
            isStreaming: true,
          };
          return next;
        });
      },
      () => {
        const botTimestamp = new Date().toISOString();
        const updatedHistory: ChatMessage[] = [
          ...newHistory,
          { role: "assistant", content: accumulated },
        ];

        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "bot",
            text: accumulated,
            timestamp: botTimestamp,
            isStreaming: false,
          };

          // Persist the full conversation after each completed exchange
          const persisted: PersistedMessage[] = next
            .filter((m) => !m.isStreaming && m.timestamp)
            .map((m) => ({
              role: m.role === "user" ? "user" : "assistant",
              content: m.text,
              timestamp: m.timestamp!,
            }));
          saveChatHistory(accountId, persisted);

          return next;
        });

        setHistory(updatedHistory);
        setIsLoading(false);
      },
      (err) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "bot",
            text: `Error: ${err.message}`,
            isStreaming: false,
          };
          return next;
        });
        setIsLoading(false);
      },
    );
  }

  return (
    <>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Chat panel">
          <div className="chat-panel__header">
            <span>Finance Assistant</span>
            <div className="chat-panel__header-actions">
              <button
                className="chat-panel__clear"
                onClick={handleClearChat}
                aria-label="Clear chat history"
                disabled={isLoading || messages.length === 0}
              >
                Clear Chat
              </button>
              <button
                className="chat-panel__close"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="chat-panel__messages">
            {messages.length === 0 && (
              <p className="chat-panel__empty">
                Ask me anything about your finances.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className="chat-panel__message-group">
                <div
                  className={
                    m.role === "user"
                      ? "chat-panel__bubble chat-panel__bubble--user"
                      : "chat-panel__bubble chat-panel__bubble--bot"
                  }
                >
                  {m.text ||
                    (m.isStreaming ? (
                      <span className="chat-panel__typing">●●●</span>
                    ) : (
                      ""
                    ))}
                </div>
                {m.timestamp && !m.isStreaming && (
                  <div className="chat-panel__timestamp">
                    {formatTime(m.timestamp)}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <form className="chat-panel__input-bar" onSubmit={handleSubmit}>
            <input
              className="chat-panel__input"
              type="text"
              placeholder="Type a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Message input"
              disabled={isLoading}
            />
            <button
              className="chat-panel__send"
              type="submit"
              disabled={isLoading}
              aria-label="Send message"
            >
              Send
            </button>
          </form>
        </div>
      )}
      <button
        className="chat-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </>
  );
}
