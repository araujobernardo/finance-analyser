// FA-AI-001 — Auto-generate financial advisor summary on login if last summary
// is older than 7 days (or none exists).
// T008 / T018

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  ApiFinancialSummary,
  ApiTransaction,
  ApiGoal,
  ApiBudget,
  ApiSnapshot,
} from "../types/api";
import {
  buildAdvisorPrompt,
  generateSummary,
} from "../services/financialAdvisor";

const DAYS_7_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Returns true when the summary's server-assigned generatedAt timestamp is
 * older than 7 days relative to the current client time.
 *
 * T018: only the comparison against new Date() is client-side; the
 * reference timestamp (generatedAt) is always the server-assigned DB value.
 */
function isOlderThan7Days(generatedAt: string): boolean {
  const ts = new Date(generatedAt).getTime();
  return Date.now() - ts >= DAYS_7_MS;
}

export interface AutoSummaryResult {
  isGenerating: boolean;
  currentSummary: ApiFinancialSummary | null;
  error: string | null;
  refresh: () => void;
}

/**
 * Automatically generates a new AI financial advisor summary on mount when:
 *   - no summary exists for the user, or
 *   - the latest summary's generatedAt is older than 7 days.
 *
 * Mirrors the useAutoSync pattern:
 *   - useRef guard prevents double-generation in React Strict Mode (double-mount).
 *   - Only fires once per component lifecycle; refresh() can re-trigger it.
 *
 * @param transactions  All user transactions (used to build the AI context).
 * @param goals         All user goals.
 * @param budgets       Current-month budgets with actual spend.
 * @param netWorthSnapshot Latest net worth snapshot, or null.
 * @param isLoadingData True while any upstream data fetch is still in flight;
 *   the hook waits until this is false before checking the TTL.
 * @param apiFetch      Authenticated fetch wrapper from useApi().
 */
export function useAutoSummary(
  transactions: ApiTransaction[],
  goals: ApiGoal[],
  budgets: ApiBudget[],
  netWorthSnapshot: ApiSnapshot | null,
  isLoadingData: boolean,
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>,
): AutoSummaryResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSummary, setCurrentSummary] =
    useState<ApiFinancialSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Guard: single-fire per mount. Also used by refresh() to re-arm the trigger.
  const hasRunRef = useRef(false);

  /**
   * Core generation flow:
   *   1. GET /api/summaries/latest
   *   2. If null or stale → build prompt, call AI, POST result
   *   3. Update state
   *
   * @param force  When true, skip the 7-day TTL check and always regenerate.
   */
  const runGeneration = useCallback(
    async (force: boolean) => {
      setIsGenerating(true);
      setError(null);

      try {
        // Step 1: fetch the latest stored summary.
        const latestRes = await apiFetch("/api/summaries/latest");
        if (!latestRes.ok) {
          throw new Error(
            `Failed to fetch latest summary (${latestRes.status})`,
          );
        }
        const latestData = (await latestRes.json()) as {
          summary: ApiFinancialSummary | null;
        };
        const latestSummary = latestData.summary;

        // Step 2: show existing summary immediately if it's still fresh.
        if (
          !force &&
          latestSummary !== null &&
          !isOlderThan7Days(latestSummary.generatedAt)
        ) {
          setCurrentSummary(latestSummary);
          setIsGenerating(false);
          return;
        }

        // Step 3: summary is absent or stale — generate a new one.
        const contextPrompt = buildAdvisorPrompt(
          transactions,
          goals,
          budgets,
          netWorthSnapshot,
          latestSummary, // pass as previousSummary for diff context
        );

        const content = await generateSummary(contextPrompt);

        // Step 4: persist to the server.
        const postRes = await apiFetch("/api/summaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            previousSummaryId: latestSummary?.id ?? null,
          }),
        });

        if (!postRes.ok) {
          throw new Error(`Failed to save summary (${postRes.status})`);
        }

        const saved = (await postRes.json()) as ApiFinancialSummary;
        setCurrentSummary(saved);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred.",
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [apiFetch, transactions, goals, budgets, netWorthSnapshot],
  );

  // Auto-trigger on mount once upstream data has loaded.
  useEffect(() => {
    // Wait for upstream data fetches to resolve.
    if (isLoadingData) return;
    // Already fired this session — do not run again.
    if (hasRunRef.current) return;

    hasRunRef.current = true;
    void runGeneration(false);
  }, [isLoadingData, runGeneration]);

  /**
   * Forces a new AI generation regardless of the 7-day TTL.
   * Intended for the "Refresh" button on the FinancialAdvisorCard.
   */
  const refresh = useCallback(() => {
    // Re-arm the guard so the effect could also re-fire if needed,
    // but call runGeneration directly so it works without unmounting.
    hasRunRef.current = false;
    void runGeneration(true);
  }, [runGeneration]);

  return { isGenerating, currentSummary, error, refresh };
}
