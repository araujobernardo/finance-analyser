import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useApi, API_BASE } from "./api";

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockLogout = vi.fn();
const mockNavigate = vi.fn();

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ accessToken: "test-token", logout: mockLogout }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// ── Tests ─────────────────────────────────────────────────────────────────

describe("API_BASE normalisation (#422)", () => {
  // NOTE: import.meta.env.VITE_API_URL is resolved at module load time, so
  // these tests validate the exported constant against the rules documented
  // in api.ts. The constant is "" in the test environment (no VITE_API_URL set).

  it("resolves to an empty string when VITE_API_URL is not set", () => {
    // In the test environment VITE_API_URL is undefined, so API_BASE must be "".
    expect(API_BASE).toBe("");
  });
});

describe("useApi — apiFetch prepends API_BASE (#351)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockLogout.mockReset();
    mockNavigate.mockReset();
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("prepends API_BASE to the path so requests reach the correct origin", async () => {
    // apiFetch must call fetch(API_BASE + path), not fetch(path) directly.
    // The expected URL is API_BASE + "/api/accounts" regardless of what
    // VITE_API_URL is set to in the current environment.
    const { result } = renderHook(() => useApi());
    await result.current.apiFetch("/api/accounts");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toBe(`${API_BASE}/api/accounts`);
  });

  it("attaches the Bearer token from AuthContext", async () => {
    const { result } = renderHook(() => useApi());
    await result.current.apiFetch("/api/accounts");

    const calledInit = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = new Headers(calledInit?.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-token");
  });

  it("navigates to /login and calls logout when the API returns 401 TOKEN_EXPIRED", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: "TOKEN_EXPIRED" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() => useApi());
    await result.current.apiFetch("/api/accounts");

    expect(mockLogout).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });
});
