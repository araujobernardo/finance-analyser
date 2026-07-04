// Tests for useAutoSummary — FA-AI-001 / #945
// Verifies all six acceptance criteria:
//   AC1: no summary → isGenerating true, AI called, result POSTed, currentSummary populated
//   AC2: summary <7 days → no AI call, currentSummary set from GET
//   AC3: summary >7 days → new AI call triggered
//   AC4: refresh() → AI call regardless of TTL
//   AC5: useRef guard prevents double-generation in Strict Mode (double-effect)
//   AC6: AI failure → error non-null, isGenerating false, no unhandled exception

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoSummary } from "./useAutoSummary";
import type {
  ApiFinancialSummary,
  ApiTransaction,
  ApiGoal,
  ApiBudget,
  ApiSnapshot,
} from "../types/api";

// ── Mock the financial advisor service ───────────────────────────────────────

const mockBuildAdvisorPrompt = vi.hoisted(() => vi.fn(() => "mocked-prompt"));
const mockGenerateSummary = vi.hoisted(() => vi.fn());

vi.mock("../services/financialAdvisor", () => ({
  buildAdvisorPrompt: mockBuildAdvisorPrompt,
  generateSummary: mockGenerateSummary,
}));

// ── Helper factories ──────────────────────────────────────────────────────────

const noTransactions: ApiTransaction[] = [];
const noGoals: ApiGoal[] = [];
const noBudgets: ApiBudget[] = [];
const noSnapshot: ApiSnapshot | null = null;

function makeSummary(
  overrides: Partial<ApiFinancialSummary> = {},
): ApiFinancialSummary {
  return {
    id: "sum-1",
    generatedAt: new Date().toISOString(),
    content: "Summary content",
    previousSummaryId: null,
    ...overrides,
  };
}

/** Summary generated 1 day ago — within the 7-day TTL. */
function makeFreshSummary(): ApiFinancialSummary {
  return makeSummary({
    generatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

/** Summary generated 8 days ago — older than the 7-day TTL. */
function makeStaleSummary(): ApiFinancialSummary {
  return makeSummary({
    generatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

/**
 * Builds an apiFetch mock that returns GET and POST responses in sequence.
 *
 * GET calls return successive entries from `getResponses`.
 * POST calls always return `postSummary` (or a default summary if not provided).
 */
function makeApiFetch(
  getResponses: { summary: ApiFinancialSummary | null }[],
  postSummary?: ApiFinancialSummary,
) {
  let getCallIndex = 0;
  return vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      return new Response(JSON.stringify(postSummary ?? makeSummary()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    const resp = getResponses[getCallIndex] ?? { summary: null };
    getCallIndex++;
    return new Response(JSON.stringify(resp), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockBuildAdvisorPrompt.mockReturnValue("mocked-prompt");
  mockGenerateSummary.mockResolvedValue("Generated AI summary text.");
});

// ── AC1: no existing summary → AI called, POSTed, currentSummary populated ───

describe("useAutoSummary — AC1: no existing summary", () => {
  it("calls generateSummary when GET returns summary:null", async () => {
    const savedSummary = makeSummary({ content: "Brand new summary." });
    const apiFetch = makeApiFetch([{ summary: null }], savedSummary);

    renderHook(() =>
      useAutoSummary(
        noTransactions,
        noGoals,
        noBudgets,
        noSnapshot,
        false,
        apiFetch,
      ),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockGenerateSummary).toHaveBeenCalledTimes(1);
  });

  it("POSTs the generated content to /api/summaries", async () => {
    const savedSummary = makeSummary();
    const apiFetch = makeApiFetch([{ summary: null }], savedSummary);
    mockGenerateSummary.mockResolvedValue("AI generated text.");

    renderHook(() =>
      useAutoSummary(
        noTransactions,
        noGoals,
        noBudgets,
        noSnapshot,
        false,
        apiFetch,
      ),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const postCall = apiFetch.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === "POST",
    );
    expect(postCall).toBeDefined();
    const body = JSON.parse(postCall![1]!.body as string) as {
      content: string;
    };
    expect(body.content).toBe("AI generated text.");
  });

  it("sets currentSummary from the POST response body", async () => {
    const savedSummary = makeSummary({ content: "Saved to server." });
    const apiFetch = makeApiFetch([{ summary: null }], savedSummary);

    const { result } = renderHook(() =>
      useAutoSummary(
        noTransactions,
        noGoals,
        noBudgets,
        noSnapshot,
        false,
        apiFetch,
      ),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.currentSummary).toEqual(savedSummary);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

// ── AC2: fresh summary (<7 days) → no AI call, currentSummary from GET ───────

describe("useAutoSummary — AC2: fresh summary (<7 days old)", () => {
  it("does NOT call generateSummary", async () => {
    const fresh = makeFreshSummary();
    const apiFetch = makeApiFetch([{ summary: fresh }]);

    renderHook(() =>
      useAutoSummary(
        noTransactions,
        noGoals,
        noBudgets,
        noSnapshot,
        false,
        apiFetch,
      ),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockGenerateSummary).not.toHaveBeenCalled();
  });

  it("sets currentSummary to the existing fresh summary", async () => {
    const fresh = makeFreshSummary();
    const apiFetch = makeApiFetch([{ summary: fresh }]);

    const { result } = renderHook(() =>
      useAutoSummary(
        noTransactions,
        noGoals,
        noBudgets,
        noSnapshot,
        false,
        apiFetch,
      ),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.currentSummary).toEqual(fresh);
    expect(result.current.isGenerating).toBe(false);
  });
});

// ── AC3: stale summary (>7 days) → new AI call triggered automatically ───────

describe("useAutoSummary — AC3: stale summary (>7 days old)", () => {
  it("calls generateSummary when the latest summary is older than 7 days", async () => {
    const stale = makeStaleSummary();
    const newSummary = makeSummary({ content: "Freshly generated." });
    const apiFetch = makeApiFetch([{ summary: stale }], newSummary);

    const { result } = renderHook(() =>
      useAutoSummary(
        noTransactions,
        noGoals,
        noBudgets,
        noSnapshot,
        false,
        apiFetch,
      ),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockGenerateSummary).toHaveBeenCalledTimes(1);
    expect(result.current.currentSummary).toEqual(newSummary);
  });

  it("passes the stale summary as previousSummary to buildAdvisorPrompt", async () => {
    const stale = makeStaleSummary();
    const apiFetch = makeApiFetch([{ summary: stale }], makeSummary());

    renderHook(() =>
      useAutoSummary(
        noTransactions,
        noGoals,
        noBudgets,
        noSnapshot,
        false,
        apiFetch,
      ),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockBuildAdvisorPrompt).toHaveBeenCalledWith(
      noTransactions,
      noGoals,
      noBudgets,
      noSnapshot,
      stale,
    );
  });
});

// ── AC4: refresh() bypasses TTL and forces regeneration ──────────────────────

describe("useAutoSummary — AC4: refresh()", () => {
  it("calls generateSummary when refresh() is called after a fresh-summary mount", async () => {
    const fresh = makeFreshSummary();
    const refreshedSummary = makeSummary({ content: "Manually refreshed." });

    // GET 1: initial mount (fresh → no AI call)
    // GET 2: refresh run fetch
    // POST:  save refreshed summary
    const apiFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ summary: fresh }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ summary: fresh }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(refreshedSummary), { status: 200 }),
      );

    const { result } = renderHook(() =>
      useAutoSummary(
        noTransactions,
        noGoals,
        noBudgets,
        noSnapshot,
        false,
        apiFetch,
      ),
    );

    // Let initial mount settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockGenerateSummary).not.toHaveBeenCalled();

    // Now call refresh()
    await act(async () => {
      result.current.refresh();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockGenerateSummary).toHaveBeenCalledTimes(1);
    expect(result.current.currentSummary).toEqual(refreshedSummary);
  });

  it("calls generateSummary regardless of summary age when refresh() is used", async () => {
    // Even a fresh summary should be regenerated on refresh
    const fresh = makeFreshSummary();
    const apiFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ summary: fresh }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ summary: fresh }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(makeSummary()), { status: 200 }),
      );

    const { result } = renderHook(() =>
      useAutoSummary(
        noTransactions,
        noGoals,
        noBudgets,
        noSnapshot,
        false,
        apiFetch,
      ),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    await act(async () => {
      result.current.refresh();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockGenerateSummary).toHaveBeenCalledTimes(1);
  });
});

// ── AC5: useRef guard prevents double-generation ──────────────────────────────

describe("useAutoSummary — AC5: useRef double-generation guard", () => {
  it("calls generateSummary exactly once even after a re-render that changes runGeneration", async () => {
    const savedSummary = makeSummary();

    // Two separate apiFetch instances to force runGeneration to change between renders
    const apiFetch1 = makeApiFetch([{ summary: null }], savedSummary);
    const apiFetch2 = makeApiFetch([{ summary: null }], savedSummary);

    const { rerender } = renderHook(
      ({ fetch }: { fetch: typeof apiFetch1 }) =>
        useAutoSummary(
          noTransactions,
          noGoals,
          noBudgets,
          noSnapshot,
          false,
          fetch,
        ),
      { initialProps: { fetch: apiFetch1 } },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockGenerateSummary).toHaveBeenCalledTimes(1);

    // Changing apiFetch causes runGeneration to change, re-firing the effect,
    // but hasRunRef.current is already true so the guard prevents a second call.
    rerender({ fetch: apiFetch2 });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Must remain at exactly 1 — the ref guard prevented the second fire.
    expect(mockGenerateSummary).toHaveBeenCalledTimes(1);
  });

  it("does NOT call generateSummary on a plain re-render with same data", async () => {
    const fresh = makeFreshSummary();
    const apiFetch = makeApiFetch([{ summary: fresh }, { summary: fresh }]);

    const { rerender } = renderHook(() =>
      useAutoSummary(
        noTransactions,
        noGoals,
        noBudgets,
        noSnapshot,
        false,
        apiFetch,
      ),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    rerender();

    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    // No AI call on either render — summary is fresh and guard is armed.
    expect(mockGenerateSummary).not.toHaveBeenCalled();
  });
});

// ── AC6: AI call failure handling ────────────────────────────────────────────

describe("useAutoSummary — AC6: AI call failure", () => {
  it("sets error and isGenerating=false when generateSummary throws an Error", async () => {
    mockGenerateSummary.mockRejectedValue(new Error("AI service unavailable"));
    const apiFetch = makeApiFetch([{ summary: null }]);

    const { result } = renderHook(() =>
      useAutoSummary(
        noTransactions,
        noGoals,
        noBudgets,
        noSnapshot,
        false,
        apiFetch,
      ),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.error).toBe("AI service unavailable");
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.currentSummary).toBeNull();
  });

  it("sets a fallback error message for non-Error exceptions", async () => {
    mockGenerateSummary.mockRejectedValue("plain string thrown");
    const apiFetch = makeApiFetch([{ summary: null }]);

    const { result } = renderHook(() =>
      useAutoSummary(
        noTransactions,
        noGoals,
        noBudgets,
        noSnapshot,
        false,
        apiFetch,
      ),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.error).toBe("An unexpected error occurred.");
    expect(result.current.isGenerating).toBe(false);
  });

  it("sets error when GET /api/summaries/latest returns a non-ok status", async () => {
    const apiFetch = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 500 }));

    const { result } = renderHook(() =>
      useAutoSummary(
        noTransactions,
        noGoals,
        noBudgets,
        noSnapshot,
        false,
        apiFetch,
      ),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.error).toMatch(/500/);
    expect(result.current.isGenerating).toBe(false);
  });

  it("sets error when POST /api/summaries returns a non-ok status", async () => {
    const apiFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ summary: null }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 422 }));

    const { result } = renderHook(() =>
      useAutoSummary(
        noTransactions,
        noGoals,
        noBudgets,
        noSnapshot,
        false,
        apiFetch,
      ),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.error).toMatch(/422/);
    expect(result.current.isGenerating).toBe(false);
  });

  it("does not throw an unhandled exception when the AI call fails", () => {
    mockGenerateSummary.mockRejectedValue(new Error("crash"));
    const apiFetch = makeApiFetch([{ summary: null }]);

    // renderHook itself must not throw
    expect(() => {
      renderHook(() =>
        useAutoSummary(
          noTransactions,
          noGoals,
          noBudgets,
          noSnapshot,
          false,
          apiFetch,
        ),
      );
    }).not.toThrow();
  });
});

// ── isLoadingData guard ───────────────────────────────────────────────────────

describe("useAutoSummary — isLoadingData guard", () => {
  it("does NOT fetch or generate while isLoadingData is true", async () => {
    const apiFetch = vi.fn();

    renderHook(() =>
      useAutoSummary(
        noTransactions,
        noGoals,
        noBudgets,
        noSnapshot,
        true, // still loading
        apiFetch,
      ),
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(apiFetch).not.toHaveBeenCalled();
    expect(mockGenerateSummary).not.toHaveBeenCalled();
  });

  it("triggers generation after isLoadingData transitions false→true→false", async () => {
    const savedSummary = makeSummary();
    const apiFetch = makeApiFetch([{ summary: null }], savedSummary);

    const { rerender } = renderHook(
      ({ loading }: { loading: boolean }) =>
        useAutoSummary(
          noTransactions,
          noGoals,
          noBudgets,
          noSnapshot,
          loading,
          apiFetch,
        ),
      { initialProps: { loading: true } },
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(mockGenerateSummary).not.toHaveBeenCalled();

    // Upstream data finishes loading
    rerender({ loading: false });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockGenerateSummary).toHaveBeenCalledTimes(1);
  });
});
