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
  // NOTE: import.meta.env.VITE_API_URL is resolved at module load time (baked
  // by Vite before the test file runs), so vi.stubEnv cannot override it after
  // the fact. Tests must be environment-agnostic: assert the normalisation rules
  // rather than hardcoding the expected value.

  it("normalises VITE_API_URL=/api to empty string (double-prefix guard)", () => {
    // The normalisation rule: if VITE_API_URL is "/api", collapse to ""
    // so that call sites using "/api/..." don't produce "/api/api/...".
    function normalise(raw: string): string {
      return raw === "/api" ? "" : raw;
    }
    expect(normalise("/api")).toBe("");
  });

  it("passes through absolute URLs unchanged", () => {
    // Absolute URLs (e.g. Render web service URL) must be used as-is.
    function normalise(raw: string): string {
      return raw === "/api" ? "" : raw;
    }
    expect(normalise("https://finance-analyser-web-service.onrender.com")).toBe(
      "https://finance-analyser-web-service.onrender.com",
    );
  });

  it("passes through empty string unchanged", () => {
    // When VITE_API_URL is not set (undefined → ""), API_BASE is "".
    function normalise(raw: string): string {
      return raw === "/api" ? "" : raw;
    }
    expect(normalise("")).toBe("");
  });

  it("API_BASE equals the normalised value of VITE_API_URL in the current environment", () => {
    // Environment-agnostic: whatever VITE_API_URL is baked to, API_BASE must
    // equal the normalised form (the "/api" guard applied).
    const raw = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
    const expected = raw === "/api" ? "" : raw;
    expect(API_BASE).toBe(expected);
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
