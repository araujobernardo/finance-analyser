// FA-AI-001 — FinancialAdvisorCard (#946)
// Redesigned: solid accent header, display-based visibility (no max-height
// animations), explicit colour tokens so the card is always unmistakable.

import { Link } from "react-router-dom";
import "./FinancialAdvisorCard.css";

export interface FinancialAdvisorCardProps {
  isGenerating: boolean;
  summary: string | null;
  generatedAt: Date | null;
  error: string | null;
  previousSummary: string | null;
  onRefresh: () => void;
  onRetry: () => void;
}

function formatGeneratedAt(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleString("en-NZ", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function FinancialAdvisorCard({
  isGenerating,
  summary,
  generatedAt,
  error,
  previousSummary,
  onRefresh,
  onRetry,
}: FinancialAdvisorCardProps) {
  const hasContent = !isGenerating && summary !== null;
  const hasError = !isGenerating && error !== null && summary === null;

  return (
    <div className="fac2-card" data-testid="financial-advisor-card">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={`fac2-header${hasError ? " fac2-header--error" : ""}`}>
        <span className="fac2-header-icon" aria-hidden="true">
          {hasError ? "!" : "✦"}
        </span>
        <span className="fac2-header-title">AI Financial Summary</span>
        {hasContent && generatedAt && (
          <span className="fac2-header-date">
            {formatGeneratedAt(generatedAt)}
          </span>
        )}
        {isGenerating && (
          <span className="fac2-header-status">Generating…</span>
        )}
        {(hasContent || hasError) && (
          <button
            type="button"
            className="fac2-refresh-btn"
            onClick={hasError ? onRetry : onRefresh}
            disabled={isGenerating}
            aria-label={hasError ? "Retry" : "Refresh summary"}
          >
            {hasError ? "Retry" : "Refresh"}
          </button>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="fac2-body">
        {/* Loading skeleton */}
        {isGenerating && (
          <div
            className="fac2-skeleton-wrap"
            data-testid="fac-skeleton"
            aria-busy="true"
            aria-label="Generating summary"
          >
            <div className="fac2-skeleton fac2-sk-w100" />
            <div className="fac2-skeleton fac2-sk-w85" />
            <div className="fac2-skeleton fac2-sk-w70" />
            <div className="fac2-skeleton fac2-sk-w90" />
            <div className="fac2-skeleton fac2-sk-w60" />
          </div>
        )}

        {/* Summary content */}
        {hasContent && (
          <>
            <p className="fac2-summary-text" data-testid="fac-summary-text">
              {summary}
            </p>
            <div className="fac2-footer">
              <Link
                to="/chat"
                className="fac2-ask-link"
                data-testid="fac-ask-link"
              >
                Ask a question →
              </Link>
            </div>
          </>
        )}

        {/* Error state */}
        {hasError && (
          <div className="fac2-error-wrap" data-testid="fac-error-wrap">
            <p className="fac2-error-msg">
              Unable to generate summary. Check your connection and try again.
            </p>
            {previousSummary && (
              <p className="fac2-prev-text" data-testid="fac-fallback-text">
                {previousSummary}
              </p>
            )}
            <div className="fac2-footer">
              <Link
                to="/chat"
                className="fac2-ask-link"
                data-testid="fac-ask-link-error"
              >
                Ask a question →
              </Link>
            </div>
          </div>
        )}

        {/* No data / not yet generated */}
        {!isGenerating && !hasContent && !hasError && (
          <p className="fac2-no-data" data-testid="fac-no-data">
            Not enough data to generate a summary yet.
          </p>
        )}
      </div>
    </div>
  );
}
