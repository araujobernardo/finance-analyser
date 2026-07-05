import { useState, useEffect, useRef, useMemo } from "react";
import Anthropic from "@anthropic-ai/sdk";
import { useAccount, useAllTransactions } from "../context/AccountContext";
import { useApi } from "../lib/api";
import type { ApiTransaction, ApiFinancialSummary } from "../types/api";
import "./ChatPage.css";

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats a summary generatedAt date per the UX brief:
 * "4 Jul 2026" — day (no leading zero), short month, full year.
 */
function formatSummaryDate(generatedAt: string): string {
  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(generatedAt));
}

/**
 * Slices content to 80 characters, trimming to the last full word, then
 * appending "...".
 */
function buildPreview(content: string): string {
  if (content.length <= 80) return content;
  const sliced = content.slice(0, 80);
  const lastSpace = sliced.lastIndexOf(" ");
  const trimmed = lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced;
  return trimmed + "...";
}

// ── Context builder ──────────────────────────────────────────────────────────

/**
 * Builds a plain-text summary of the user's transactions for the AI system
 * prompt. Uses ApiTransaction[] directly (no PfaTxn adapter needed).
 */
function buildContext(
  rawTxns: ApiTransaction[],
  nicknameById: Map<string, string>,
): string {
  // Exclude transfers from context summary
  const txns = rawTxns.filter((t) => !t.isTransfer);

  const acctIds = [...new Set(txns.map((t) => t.accountId))];
  const acctNames = acctIds.map((id) => nicknameById.get(id) ?? id);
  const months = [...new Set(txns.map((t) => t.date.slice(0, 7)))].sort();

  let summary = `Accounts: ${acctNames.join(", ")}\nMonths: ${months.join(", ")}\n\n`;

  months.forEach((mo) => {
    summary += `=== ${mo} ===\n`;
    acctIds.forEach((accId) => {
      const accName = nicknameById.get(accId) ?? accId;
      const at = txns.filter(
        (t) => t.date.startsWith(mo) && t.accountId === accId,
      );
      if (!at.length) return;
      const inc = at
        .filter((t) => t.amount > 0)
        .reduce((s, t) => s + t.amount, 0);
      const sp = at
        .filter((t) => t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      summary += `  ${accName}: Income $${inc.toFixed(2)}, Spend $${sp.toFixed(2)}\n`;

      // Category breakdown (expenses only)
      const cats = [
        ...new Set(at.filter((t) => t.category).map((t) => t.category!)),
      ];
      cats
        .filter((cat) => cat !== "Income")
        .forEach((cat) => {
          const v = at
            .filter((t) => t.category === cat && t.amount < 0)
            .reduce((s, t) => s + Math.abs(t.amount), 0);
          if (v > 0) summary += `    ${cat}: $${v.toFixed(2)}\n`;
        });
    });
  });

  return summary;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "How much did I spend last month across all accounts?",
  "Which account has the highest expenses?",
  "What is my biggest spending category?",
  "Where can I save $200/month?",
];

const DEFAULT_MESSAGES: ChatMsg[] = [
  {
    role: "assistant",
    content:
      "Hi! I have full visibility across all your accounts. Ask me anything — spending by account, trends, where to cut back. Inter-account transfers are excluded from all totals.",
  },
];

// ── ChatPage ─────────────────────────────────────────────────────────────────
//
// Zero-prop component — reads transactions from AccountContext directly.
// Replaces the old prop-based pattern (txns/budgets/categories passed from
// App.tsx) which stopped working after the T005 context migration.

export function ChatPage() {
  const { accounts } = useAccount();
  const rawTransactions = useAllTransactions();
  const { apiFetch } = useApi();

  const nicknameById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.nickname])),
    [accounts],
  );

  // ── Chat state ─────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMsg[]>(DEFAULT_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Past summaries state ───────────────────────────────────────────────────
  const [summaries, setSummaries] = useState<ApiFinancialSummary[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(true);
  const [summariesError, setSummariesError] = useState<string | null>(null);
  const [sectionOpen, setSectionOpen] = useState(true);
  // Per-entry open state: initialised lazily once summaries load
  const [entryOpenIds, setEntryOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Fetch past summaries on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setSummariesLoading(true);
    setSummariesError(null);

    void apiFetch("/api/summaries")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ApiFinancialSummary[]>;
      })
      .then((data) => {
        if (cancelled) return;
        setSummaries(data);
        // Open the first two entries by default
        const defaultOpen = new Set(data.slice(0, 2).map((s) => s.id));
        setEntryOpenIds(defaultOpen);
      })
      .catch(() => {
        if (cancelled) return;
        setSummariesError("Could not load summaries.");
      })
      .finally(() => {
        if (!cancelled) setSummariesLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleEntry = (id: string) => {
    setEntryOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ── Chat send ──────────────────────────────────────────────────────────────
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
      const systemCtx = buildContext(rawTransactions, nicknameById);
      const res = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: `You are a personal finance assistant for a New Zealand user. Their financial data:\n\n${systemCtx}\n\nAnswer concisely in NZD. Note which account when relevant. Inter-account transfers are excluded from all spending totals.`,
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

  // Empty state — shown when the user has no transactions in the API
  if (!rawTransactions.length) {
    return (
      <div className="chat-empty">
        <div className="chat-empty-icon">◎</div>
        <div className="chat-empty-sub">Upload transactions first.</div>
      </div>
    );
  }

  const summaryCount = summaries.length;
  const countLabel =
    summaryCount === 1 ? "1 report" : `${summaryCount} reports`;

  return (
    <div className="chat-page">
      {/* Option C — Conversational Soft: branded header with teal avatar + status */}
      <div className="chat-top">
        <div className="chat-ai-avatar" aria-hidden="true">
          ◎
        </div>
        <div className="chat-top-info">
          <div className="chat-title">Finance AI</div>
          <div className="chat-status" data-testid="chat-status">
            ● Active
          </div>
        </div>
      </div>

      {/* ── Past Summaries Section ─────────────────────────────────────────── */}
      <section
        className="summaries-section"
        aria-label="Past Summaries"
        data-testid="summaries-section"
      >
        <button
          type="button"
          className="summaries-section-header"
          data-testid="summaries-section-header"
          aria-expanded={sectionOpen}
          aria-controls="summaries-section-body"
          onClick={() => setSectionOpen((o) => !o)}
          disabled={summariesLoading}
        >
          <span className="summaries-icon" aria-hidden="true">
            ✦
          </span>
          <span className="summaries-label">Past Summaries</span>
          <span className="summaries-count" aria-live="polite">
            {summariesLoading ? "..." : countLabel}
          </span>
          <span
            className={`summaries-chevron${sectionOpen ? " open" : ""}`}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>

        <div
          id="summaries-section-body"
          data-testid="summaries-body"
          className={`summaries-body${sectionOpen ? "" : " closed"}`}
        >
          <div className="summaries-body-inner">
            {summariesLoading && (
              <div
                className="summaries-skeletons"
                data-testid="summaries-skeletons"
                aria-busy="true"
                aria-label="Loading summaries"
              >
                <div className="summaries-skeleton" />
                <div className="summaries-skeleton" />
              </div>
            )}

            {!summariesLoading && summariesError && (
              <p className="summaries-error" data-testid="summaries-error">
                {summariesError}
              </p>
            )}

            {!summariesLoading && !summariesError && summaries.length === 0 && (
              <p className="summaries-empty" data-testid="summaries-empty">
                No summaries yet. Come back after your first login.
              </p>
            )}

            {!summariesLoading &&
              !summariesError &&
              summaries.map((summary) => {
                const isOpen = entryOpenIds.has(summary.id);
                const entryBodyId = `entry-body-${summary.id}`;
                const preview = buildPreview(summary.content);
                const dateLabel = formatSummaryDate(summary.generatedAt);

                return (
                  <div
                    key={summary.id}
                    className="summaries-entry"
                    data-testid="summaries-entry"
                  >
                    <button
                      type="button"
                      className="summaries-entry-toggle"
                      data-testid={`summaries-entry-toggle-${summary.id}`}
                      aria-expanded={isOpen}
                      aria-controls={entryBodyId}
                      onClick={() => toggleEntry(summary.id)}
                    >
                      <span
                        className={`summaries-entry-dot${isOpen ? " open" : ""}`}
                        aria-hidden="true"
                      />
                      <span className="summaries-entry-date">{dateLabel}</span>
                      <span
                        className={`summaries-entry-preview${isOpen ? " hidden" : ""}`}
                        aria-hidden={isOpen}
                      >
                        {preview}
                      </span>
                      <span
                        className={`summaries-entry-chevron${isOpen ? " open" : ""}`}
                        aria-hidden="true"
                      >
                        ▾
                      </span>
                    </button>

                    <div
                      id={entryBodyId}
                      className={`summaries-entry-body${isOpen ? "" : " closed"}`}
                    >
                      <div className="summaries-entry-body-inner">
                        <p className="summaries-entry-content">
                          {summary.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      <div className="chat-messages" data-testid="chat-messages">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-msg-row${m.role === "user" ? " user" : ""}`}
          >
            <div className={`chat-avatar${m.role === "user" ? " user" : ""}`}>
              {m.role === "user" ? "Me" : "◎"}
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
                void send();
              }
            }}
            placeholder="Message Finance AI..."
          />
          <button
            className="chat-send"
            data-testid="chat-send"
            disabled={!input.trim() || loading}
            onClick={() => void send()}
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
