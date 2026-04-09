import { useState, useRef, useEffect } from "react";
import "./ChatPanel.css";

interface Message {
  role: "user" | "bot";
  text: string;
}

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { role: "user", text },
      { role: "bot", text: "…" },
    ]);
    setInput("");
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
            {messages.length === 0 && (
              <p className="chat-panel__empty">
                Ask me anything about your finances.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "chat-panel__bubble chat-panel__bubble--user"
                    : "chat-panel__bubble chat-panel__bubble--bot"
                }
              >
                {m.text}
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
            />
            <button
              className="chat-panel__send"
              type="submit"
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
