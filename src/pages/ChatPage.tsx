import { useState, useEffect, useRef } from "react";
import Anthropic from "@anthropic-ai/sdk";
import type { PfaTxn, PfaCategory, PfaBudgets } from "../types/pfa";
import "./ChatPage.css";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  txns: PfaTxn[];
  budgets: PfaBudgets;
  categories: PfaCategory[];
  messages: ChatMsg[];
  setMessages: (m: ChatMsg[]) => void;
}

const SUGGESTIONS = [
  "How much did I spend last month across all accounts?",
  "Which account has the highest expenses?",
  "What is my biggest spending category?",
  "Where can I save $200/month?",
];

function buildContext(
  txns: PfaTxn[],
  budgets: PfaBudgets,
  categories: PfaCategory[],
): string {
  const accts = [...new Set(txns.map((t) => t.account))];
  const months = [...new Set(txns.map((t) => t.month))].sort();
  let summary = `Accounts: ${accts.join(", ")}\nMonths: ${months.join(", ")}\n\n`;

  months.forEach((mo) => {
    summary += `=== ${mo} ===\n`;
    accts.forEach((acc) => {
      const at = txns.filter(
        (t) => t.month === mo && t.account === acc && !t.isTransfer,
      );
      if (!at.length) return;
      const inc = at
        .filter((t) => t.isCredit)
        .reduce((s, t) => s + t.amount, 0);
      const sp = at
        .filter((t) => !t.isCredit)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      summary += `  ${acc}: Income $${inc.toFixed(2)}, Spend $${sp.toFixed(2)}\n`;
      categories
        .filter((c) => c.name !== "Income")
        .forEach((cat) => {
          const v = at
            .filter((t) => t.category === cat.name && !t.isCredit)
            .reduce((s, t) => s + Math.abs(t.amount), 0);
          if (v > 0) summary += `    ${cat.name}: $${v.toFixed(2)}\n`;
        });
    });
  });

  if (Object.keys(budgets).length) {
    summary += "\nMonthly Budgets:\n";
    Object.entries(budgets).forEach(([k, v]) => {
      summary += `  ${k}: $${v}\n`;
    });
  }
  return summary;
}

export function ChatPage({
  txns,
  budgets,
  categories,
  messages,
  setMessages,
}: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    const newMsgs: ChatMsg[] = [...messages, { role: "user", content: q }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as
        | string
        | undefined;
      if (!apiKey) throw new Error("VITE_ANTHROPIC_API_KEY is not set.");
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const history = newMsgs
        .slice(1)
        .map((m) => ({ role: m.role, content: m.content }));
      const systemCtx = buildContext(txns, budgets, categories);
      const res = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: `You are a personal finance assistant for a New Zealand user. Their financial data:\n\n${systemCtx}\n\nAnswer concisely in NZD. Note which account when relevant. Inter-account transfers (isTransfer:true) are excluded from all spending totals.`,
        messages: history,
      });
      const reply = res.content
        .map((b) => ("text" in b ? b.text : ""))
        .join("");
      setMessages([...newMsgs, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages([
        ...newMsgs,
        {
          role: "assistant",
          content: `Error: ${e instanceof Error ? e.message : String(e)}`,
        },
      ]);
    }
    setLoading(false);
  };

  if (!txns.length) {
    return (
      <div className="chat-empty">
        <div className="chat-empty-icon">◎</div>
        <div className="chat-empty-sub">Upload transactions first.</div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <div className="chat-top">
        <h1 className="chat-title">AI Chat</h1>
        <div className="chat-subtitle">
          Ask anything about your finances across all accounts
        </div>
      </div>

      <div className="chat-messages" data-testid="chat-messages">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-msg-row${m.role === "user" ? " user" : ""}`}
          >
            <div className={`chat-avatar${m.role === "user" ? " user" : ""}`}>
              {m.role === "user" ? "U" : "◎"}
            </div>
            <div className={`chat-bubble${m.role === "user" ? " user" : ""}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-msg-row">
            <div className="chat-avatar">◎</div>
            <div className="chat-bubble chat-typing">
              <div className="chat-dots">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="chat-dot"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-footer">
        {messages.length <= 1 && (
          <div className="chat-suggestions">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="chat-suggestion"
                onClick={() => send(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <div className="chat-input-row">
          <input
            className="chat-input"
            data-testid="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about your spending..."
          />
          <button
            className="chat-send"
            data-testid="chat-send"
            disabled={!input.trim() || loading}
            onClick={() => send()}
            style={{
              background:
                input.trim() && !loading ? "var(--accent)" : "var(--border)",
            }}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
