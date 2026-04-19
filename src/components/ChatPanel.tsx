import { useState, useRef, useEffect } from "react";
import { streamChatResponse } from "../services/claudeChat";
import { useChatHistory } from "../hooks/useChatHistory";
import { SuggestedPrompts } from "./SuggestedPrompts";
import "./ChatPanel.css";

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    displayMessages,
    apiHistory,
    appendUserMessage,
    setStreamingMessage,
    markStreamingDone,
    setError,
  } = useChatHistory();

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [displayMessages, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    appendUserMessage(text);
    setInput("");
    setIsLoading(true);

    const historyWithUserMsg = [
      ...apiHistory,
      { role: "user" as const, content: text },
    ];

    let accumulated = "";

    streamChatResponse(
      historyWithUserMsg,
      (delta) => {
        accumulated += delta;
        setStreamingMessage(accumulated);
      },
      () => {
        markStreamingDone();
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
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
            <button
              className="chat-panel__close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>
          <div className="chat-panel__messages">
            {displayMessages.length === 0 && (
              <p className="chat-panel__empty">
                Ask me anything about your finances.
              </p>
            )}
            {displayMessages.map((m, i) => (
              <div
                key={i}
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
            ))}
            <div ref={bottomRef} />
          </div>
          {displayMessages.length === 0 && (
            <SuggestedPrompts onSelect={(prompt) => setInput(prompt)} />
          )}
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
