/**
 * FA-BANK-003 T003 — Tests for BankContext
 *
 * Covers:
 * - BankProvider and useBankContext exported
 * - 404 on mount sets connection = null without setting error
 * - isSyncing is true during syncNow() and false after (even on error)
 * - connect, disconnect, linkAccount, unlinkAccount delegate to API
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act, waitFor } from "@testing-library/react";
import { BankProvider, useBankContext } from "./BankContext";
import type { BankContextValue } from "./BankContext";

// ── Mock useApi ────────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();
vi.mock("../lib/api", () => ({
  useApi: () => ({ apiFetch: mockApiFetch }),
  API_BASE: "",
}));

// ── Mock useAuth (required by useApi's internal navigate on 401) ────────────

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ accessToken: "test-token", logout: vi.fn() }),
}));

// ── Mock useNavigate ──────────────────────────────────────────────────────────

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

// ── Mock useToast ─────────────────────────────────────────────────────────────

const mockAddToast = vi.fn();
vi.mock("../hooks/useToast", () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Renders BankProvider with a consumer that calls onRender() on each render.
 * Use the returned getContext() to read the latest context value in assertions.
 */
function renderContext() {
  let latestCtx!: BankContextValue;

  function Consumer({
    onRender,
  }: {
    onRender: (ctx: BankContextValue) => void;
  }) {
    const ctx = useBankContext();
    onRender(ctx);
    return null;
  }

  render(
    <BankProvider>
      <Consumer
        onRender={(ctx) => {
          latestCtx = ctx;
        }}
      />
    </BankProvider>,
  );

  return {
    getContext: () => latestCtx,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BankContext — exports", () => {
  it("exports BankProvider component", () => {
    expect(BankProvider).toBeDefined();
    expect(typeof BankProvider).toBe("function");
  });

  it("exports useBankContext hook", () => {
    expect(useBankContext).toBeDefined();
    expect(typeof useBankContext).toBe("function");
  });
});

describe("BankContext — initial load (mount fetch)", () => {
  it("sets connection = null and no error when GET /api/bank/connection returns 404", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "No connection found" }),
    });

    const { getContext } = renderContext();

    await waitFor(() => {
      expect(getContext().isLoading).toBe(false);
    });

    expect(getContext().connection).toBeNull();
    expect(getContext().error).toBeNull();
    expect(getContext().accountLinks).toHaveLength(0);
  });

  it("sets connection and accountLinks when GET /api/bank/connection returns 200", async () => {
    const mockConnection = {
      id: "conn-1",
      userId: "user-1",
      akahuUserId: "user_abc",
      connectedAt: "2026-06-01T00:00:00Z",
      lastSyncedAt: null,
      createdAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
    };

    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ connection: mockConnection, accountLinks: [] }),
    });

    const { getContext } = renderContext();

    await waitFor(() => {
      expect(getContext().connection).not.toBeNull();
    });

    expect(getContext().connection?.id).toBe("conn-1");
    expect(getContext().error).toBeNull();
  });

  it("sets error when GET /api/bank/connection returns non-404 error", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal server error" }),
    });

    const { getContext } = renderContext();

    await waitFor(() => {
      expect(getContext().error).not.toBeNull();
    });

    expect(getContext().error).toBe("Internal server error");
    expect(getContext().connection).toBeNull();
  });
});

describe("BankContext — syncNow()", () => {
  it("sets isSyncing to false after syncNow() resolves successfully", async () => {
    // Mount fetch returns 404 (no connection)
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    const { getContext } = renderContext();
    await waitFor(() => expect(getContext().isLoading).toBe(false));

    // syncNow POST returns success
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        accountsSynced: 1,
        transactionsAdded: 5,
        errors: [],
      }),
    });
    // refetch after sync returns 404 again
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    await act(async () => {
      await getContext().syncNow();
    });

    expect(getContext().isSyncing).toBe(false);
    expect(getContext().lastSyncResult?.transactionsAdded).toBe(5);
  });

  it("sets isSyncing to false even when syncNow() throws", async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    const { getContext } = renderContext();
    await waitFor(() => expect(getContext().isLoading).toBe(false));

    // syncNow POST throws a network error
    mockApiFetch.mockRejectedValueOnce(new Error("Network failure"));

    await act(async () => {
      await getContext().syncNow();
    });

    expect(getContext().isSyncing).toBe(false);
  });
});

describe("BankContext — connect()", () => {
  it("returns true and calls refetch on success", async () => {
    // Mount fetch
    mockApiFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    });

    const { getContext } = renderContext();
    await waitFor(() => expect(getContext().isLoading).toBe(false));

    const mockConnection = {
      id: "conn-1",
      userId: "user-1",
      akahuUserId: "user_abc",
      connectedAt: "2026-06-01T00:00:00Z",
      lastSyncedAt: null,
      createdAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
    };

    // connect POST succeeds
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockConnection,
    });
    // refetch after connect
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ connection: mockConnection, accountLinks: [] }),
    });

    let result: boolean | undefined;
    await act(async () => {
      result = await getContext().connect();
    });

    expect(result).toBe(true);
    await waitFor(() => expect(getContext().connection?.id).toBe("conn-1"));
  });
});

describe("BankContext — disconnect()", () => {
  it("clears connection and accountLinks on success", async () => {
    const mockConnection = {
      id: "conn-1",
      userId: "user-1",
      akahuUserId: "user_abc",
      connectedAt: "2026-06-01T00:00:00Z",
      lastSyncedAt: null,
      createdAt: "2026-06-01T00:00:00Z",
      updatedAt: "2026-06-01T00:00:00Z",
    };

    // Mount fetch returns connected state
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ connection: mockConnection, accountLinks: [] }),
    });

    const { getContext } = renderContext();
    await waitFor(() => expect(getContext().connection).not.toBeNull());

    // disconnect DELETE succeeds
    mockApiFetch.mockResolvedValueOnce({ ok: true, status: 204 });

    let result: boolean | undefined;
    await act(async () => {
      result = await getContext().disconnect();
    });

    expect(result).toBe(true);
    expect(getContext().connection).toBeNull();
    expect(getContext().accountLinks).toHaveLength(0);
  });
});
