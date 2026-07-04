// FA-AI-001 — FinancialAdvisorCard (#946)
// Collapsible advisor widget displayed on the dashboard above the charts grid.
// Prop-driven for all data states; owns only the isOpen collapse toggle.

import { useState } from "react";
import { Link } from "react-router-dom";
import "./FinancialAdvisorCard.css";

// ── Prop interface ─────────────────────────────────────────────────────────────

export interface FinancialAdvisorCardProps {
  isGenerating: boolean;
  summary: string | null;
  generatedAt: Date | null;
  error: string | null;
  previousSummary: string | null;
  onRefresh: () => void;
  onRetry: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Format date as "4 Jul 2025" (day, short month, full year — no time). */
function formatGeneratedAt(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString("en-NZ", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/** Return up to 80 chars of text with an ellipsis, or null if text is falsy. */
function truncate(text: string | null): string | null {
  if (!text) return null;
  return text.length > 80 ? text.slice(0, 80) + "…" : text;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function FinancialAdvisorCard({
  isGenerating,
  summary,
  generatedAt,
  error,
  previousSummary,
  onRefresh,
  onRetry,
}: FinancialAdvisorCardProps) {
  // The ONLY internal state: collapse / expand toggle (default open).
  const [isOpen, setIsOpen] = useState(true);

  // ── Derived state ────────────────────────────────────────────────────────────
  const isContent = !isGenerating && summary !== null;
  const isError = !isGenerating && error !== null && summary === null;
  const isNoData = !isGenerating && summary === null && error === null;

  // Toggle is available in content and error states.
  // In loading state it is disabled; in no-data state the body is always open.
  const canToggle = !isGenerating && !isNoData;

  const handleToggle = () => {
    if (canToggle) setIsOpen((prev) => !prev);
  };

  // The body is visible when: content/error (respects isOpen) OR loading OR no-data.
  const bodyOpen = isGenerating || isNoData || isOpen;

  // Preview text: truncated summary shown inline in the header.
  const previewText = truncate(summary);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="fac-card" data-testid="financial-advisor-card">
      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="fac-header-row">
        {/*
         * Main toggle button — keyboard-accessible expand/collapse trigger.
         * Contains: icon, label, preview text (or loading message), date chip,
         * and the chevron. The Refresh/Retry button is a separate sibling so
         * nested-button invalid HTML is avoided.
         */}
        <button
          type="button"
          className={[
            "fac-toggle-btn",
            isError && "fac-toggle-btn--error",
            isGenerating && "fac-toggle-btn--loading",
            isNoData && "fac-toggle-btn--no-data",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={handleToggle}
          aria-expanded={canToggle ? isOpen : undefined}
          aria-controls={canToggle ? "advisor-body" : undefined}
          disabled={isGenerating}
        >
          {/* Teal ✦ icon (or ! in error state) — decorative */}
          <span
            className={[
              "fac-icon",
              isError && "fac-icon--error",
              isGenerating && "fac-icon--loading",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-hidden="true"
          >
            {isError ? "!" : "✦"}
          </span>

          {/* "Financial Summary" label */}
          <span className="fac-label">Financial Summary</span>

          {/* Inline preview / loading message — grows to fill available space */}
          {isGenerating ? (
            <span className="fac-preview fac-preview--loading">
              Generating your financial summary...
            </span>
          ) : previewText !== null ? (
            <span
              className={[
                "fac-preview",
                !isOpen && canToggle && "fac-preview--faded",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {previewText}
            </span>
          ) : (
            /* Spacer keeps right-aligned items at end when no preview text */
            <span className="fac-spacer" aria-hidden="true" />
          )}

          {/* Date chip — visible only in content state */}
          {isContent && generatedAt !== null && (
            <span className="fac-date-chip">
              {formatGeneratedAt(generatedAt)}
            </span>
          )}

          {/* Chevron — rotates 180° when open; hidden in no-data and loading */}
          {canToggle && (
            <span
              className={["fac-chevron", isOpen && "fac-chevron--open"]
                .filter(Boolean)
                .join(" ")}
              aria-hidden="true"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
        </button>

        {/* Refresh / Retry button — sibling of toggle, positioned at far right */}
        {(isContent || isError) && (
          <button
            type="button"
            className="fac-refresh-btn"
            onClick={isError ? onRetry : onRefresh}
            disabled={isGenerating}
            aria-label={
              isError ? "Retry generating summary" : "Refresh summary"
            }
          >
            {isError ? "Retry" : "Refresh"}
          </button>
        )}
      </div>

      {/* ── Separator ──────────────────────────────────────────────────────── */}
      {/* 1 px border rule — visible only when the body is open */}
      {bodyOpen && <div className="fac-separator" role="presentation" />}

      {/* ── Collapsible body ────────────────────────────────────────────────── */}
      <div
        id="advisor-body"
        role="region"
        aria-label="Financial summary details"
        className={["fac-body", bodyOpen && "fac-body--open"]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Loading state — skeleton shimmer */}
        {isGenerating && (
          <div className="fac-skeleton-group" data-testid="fac-skeleton">
            <div className="fac-skeleton fac-skeleton--w100" />
            <div className="fac-skeleton fac-skeleton--w80" />
            <div className="fac-skeleton fac-skeleton--w60" />
          </div>
        )}

        {/* Content state — summary text + chat link */}
        {isContent && (
          <>
            <p className="fac-summary-text" data-testid="fac-summary-text">
              {summary}
            </p>
            <div className="fac-footer">
              <Link
                to="/chat"
                className="fac-ask-link"
                data-testid="fac-ask-link"
              >
                Ask a question →
              </Link>
            </div>
          </>
        )}

        {/* Error state — error banner + optional previous summary fallback */}
        {isError && (
          <div className="fac-error-wrap" data-testid="fac-error-wrap">
            <div className="fac-error-banner">
              Unable to generate summary. Check your connection and try again.
            </div>
            {previousSummary !== null && (
              <>
                <p
                  className="fac-fallback-text"
                  data-testid="fac-fallback-text"
                >
                  {previousSummary}
                </p>
                <div className="fac-footer">
                  <Link
                    to="/chat"
                    className="fac-ask-link"
                    data-testid="fac-ask-link-error"
                  >
                    Ask a question →
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* No-data state — empty state message */}
        {isNoData && (
          <p className="fac-no-data" data-testid="fac-no-data">
            Not enough data to generate a summary yet.
          </p>
        )}
      </div>
    </div>
  );
}
