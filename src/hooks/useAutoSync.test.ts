// Tests for useAutoSync — FA-BANK-017 / FA-BANK-018
// Verifies: 24-hour check, null lastSyncedAt, no-connection guard, single-fire guard,
//           auto-categorise chaining after successful sync, and non-fatal error handling.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoSync } from "./useAutoSync";
import type { ApiAkahuConnection, ApiTransaction } from "../types/api";

// ── mock runAutoCategorise ────────────────────────────────────────────────────

const mockRunAutoCategorise = vi.fn();

vi.mock("../utils/runAutoCategorise", () => ({
  runAutoCategorise: (...args: unknown[]) => mockRunAutoCategorise(...args),
}));

// ── helper: minimal categoriseOptions ────────────────────────────────────────

function makeCategoriseOptions(
  overrides: {
    transactions?: ApiTransaction[];
    onError?: (msg: string) => void;
  } = {},
) {
  return {
    transactions: overrides.transactions ?? [],
    apiFetch: vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
    refetch: vi.fn().mockResolvedValue(undefined),
    onError: overrides.onError ?? vi.fn(),
  };
}

// ── helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal ApiAkahuConnection for testing. */
function makeConnection(lastSyncedAt: string | null): ApiAkahuConnection {
  return {
    id: "conn-1",
    userId: "user-1",
    akahuUserId: "akahu-user-1",
    connectedAt: "2026-01-01T00:00:00.000Z",
    lastSyncedAt,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function makeTimestamp(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── AC: lastSyncedAt null → sync triggered ────────────────────────────────────

describe("useAutoSync — null lastSyncedAt (first use)", () => {
  it("calls syncNow when connection.lastSyncedAt is null", async () => {
    const syncNow = vi.fn().mockResolvedValue(undefined);
    const connection = makeConnection(null);

    renderHook(() => useAutoSync(connection, false, syncNow));

    // Allow microtasks to flush
    await Promise.resolve();

    expect(syncNow).toHaveBeenCalledTimes(1);
  });
});

// ── AC: lastSyncedAt > 24 hours ago → sync triggered ─────────────────────────

describe("useAutoSync — lastSyncedAt older than 24 hours", () => {
  it("calls syncNow when last sync was 25 hours ago", async () => {
    const syncNow = vi.fn().mockResolvedValue(undefined);
    const connection = makeConnection(makeTimestamp(25));

    renderHook(() => useAutoSync(connection, false, syncNow));

    await Promise.resolve();

    expect(syncNow).toHaveBeenCalledTimes(1);
  });

  it("calls syncNow when last sync was exactly 24 hours ago", async () => {
    const syncNow = vi.fn().mockResolvedValue(undefined);
    // Exactly 24 hours — meets the >= threshold
    const connection = makeConnection(makeTimestamp(24));

    renderHook(() => useAutoSync(connection, false, syncNow));

    await Promise.resolve();

    expect(syncNow).toHaveBeenCalledTimes(1);
  });
});

// ── AC: lastSyncedAt < 24 hours ago → NO sync ────────────────────────────────

describe("useAutoSync — lastSyncedAt within 24 hours", () => {
  it("does NOT call syncNow when last sync was 1 hour ago", async () => {
    const syncNow = vi.fn().mockResolvedValue(undefined);
    const connection = makeConnection(makeTimestamp(1));

    renderHook(() => useAutoSync(connection, false, syncNow));

    await Promise.resolve();

    expect(syncNow).not.toHaveBeenCalled();
  });

  it("does NOT call syncNow when last sync was 23 hours ago", async () => {
    const syncNow = vi.fn().mockResolvedValue(undefined);
    const connection = makeConnection(makeTimestamp(23));

    renderHook(() => useAutoSync(connection, false, syncNow));

    await Promise.resolve();

    expect(syncNow).not.toHaveBeenCalled();
  });
});

// ── AC: no connection → no sync ───────────────────────────────────────────────

describe("useAutoSync — no Akahu connection", () => {
  it("does NOT call syncNow when connection is null", async () => {
    const syncNow = vi.fn().mockResolvedValue(undefined);

    renderHook(() => useAutoSync(null, false, syncNow));

    await Promise.resolve();

    expect(syncNow).not.toHaveBeenCalled();
  });
});

// ── AC: isLoading true → waits before deciding ────────────────────────────────

describe("useAutoSync — isLoading guard", () => {
  it("does NOT call syncNow while isLoading is true", async () => {
    const syncNow = vi.fn().mockResolvedValue(undefined);
    const connection = makeConnection(null);

    renderHook(() => useAutoSync(connection, true, syncNow));

    await Promise.resolve();

    expect(syncNow).not.toHaveBeenCalled();
  });

  it("calls syncNow after isLoading transitions to false with stale data", async () => {
    const syncNow = vi.fn().mockResolvedValue(undefined);
    const connection = makeConnection(makeTimestamp(25));

    const { rerender } = renderHook(
      ({ loading }: { loading: boolean }) =>
        useAutoSync(connection, loading, syncNow),
      { initialProps: { loading: true } },
    );

    await Promise.resolve();
    expect(syncNow).not.toHaveBeenCalled();

    // Loading resolves
    rerender({ loading: false });
    await Promise.resolve();

    expect(syncNow).toHaveBeenCalledTimes(1);
  });
});

// ── AC: single-fire guard — only syncs once per mount ────────────────────────

describe("useAutoSync — single-fire guard", () => {
  it("does NOT call syncNow a second time when connection re-renders", async () => {
    const syncNow = vi.fn().mockResolvedValue(undefined);
    const connection = makeConnection(null);

    const { rerender } = renderHook(
      ({ conn }: { conn: ApiAkahuConnection | null }) =>
        useAutoSync(conn, false, syncNow),
      { initialProps: { conn: connection } },
    );

    await Promise.resolve();
    expect(syncNow).toHaveBeenCalledTimes(1);

    // Simulate a context re-render (same object, new reference)
    rerender({ conn: { ...connection } });
    await Promise.resolve();

    // Must still be exactly 1 — the ref prevents a second fire
    expect(syncNow).toHaveBeenCalledTimes(1);
  });
});

// ── AC: syncNow rejection is swallowed ───────────────────────────────────────

describe("useAutoSync — syncNow rejection handling", () => {
  it("does not throw when syncNow rejects", async () => {
    const syncNow = vi.fn().mockRejectedValue(new Error("Network error"));
    const connection = makeConnection(null);

    // Should not throw — errors are swallowed, toast shown elsewhere
    expect(() => {
      renderHook(() => useAutoSync(connection, false, syncNow));
    }).not.toThrow();

    // Allow rejection to propagate through the catch silently
    await new Promise((r) => setTimeout(r, 10));
  });
});

// ── FA-BANK-018: categoriseOptions — auto-categorise after successful sync ────

describe("useAutoSync — auto-categorise after sync (categoriseOptions)", () => {
  it("calls runAutoCategorise after a successful syncNow when options are provided", async () => {
    const syncNow = vi.fn().mockResolvedValue(undefined);
    mockRunAutoCategorise.mockResolvedValue({
      categorised: 2,
      hadError: false,
    });

    const opts = makeCategoriseOptions();
    const connection = makeConnection(null);

    renderHook(() => useAutoSync(connection, false, syncNow, opts));

    // Allow the promise chain to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(syncNow).toHaveBeenCalledTimes(1);
    expect(mockRunAutoCategorise).toHaveBeenCalledTimes(1);
    expect(mockRunAutoCategorise).toHaveBeenCalledWith(opts);
  });

  it("does NOT call runAutoCategorise when categoriseOptions is not provided", async () => {
    const syncNow = vi.fn().mockResolvedValue(undefined);
    const connection = makeConnection(null);

    renderHook(() => useAutoSync(connection, false, syncNow));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(syncNow).toHaveBeenCalledTimes(1);
    expect(mockRunAutoCategorise).not.toHaveBeenCalled();
  });

  it("does NOT call runAutoCategorise when syncNow fails", async () => {
    const syncNow = vi.fn().mockRejectedValue(new Error("Sync failed"));
    const opts = makeCategoriseOptions();
    const connection = makeConnection(null);

    renderHook(() => useAutoSync(connection, false, syncNow, opts));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(syncNow).toHaveBeenCalledTimes(1);
    // Auto-categorise must NOT be triggered when sync itself failed
    expect(mockRunAutoCategorise).not.toHaveBeenCalled();
  });

  it("does NOT call runAutoCategorise when sync is skipped (recent lastSyncedAt)", async () => {
    const syncNow = vi.fn();
    const opts = makeCategoriseOptions();
    // Last sync was 1 hour ago — within the 24 h threshold
    const connection = makeConnection(makeTimestamp(1));

    renderHook(() => useAutoSync(connection, false, syncNow, opts));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(syncNow).not.toHaveBeenCalled();
    expect(mockRunAutoCategorise).not.toHaveBeenCalled();
  });
});
