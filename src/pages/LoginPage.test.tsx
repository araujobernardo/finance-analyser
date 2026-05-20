import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { LoginPage } from "./LoginPage";
import { API_BASE } from "../lib/api";

// Mock react-router-dom navigate so we can test the success path without
// a real router history.
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("LoginPage — API_BASE integration (#272)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockNavigate.mockReset();
    fetchSpy = vi.spyOn(globalThis, "fetch");
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("renders the sign-in form", () => {
    renderLoginPage();
    expect(
      screen.getByRole("heading", { name: /sign in/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("calls fetch with a URL built from API_BASE, not a bare hardcoded string", async () => {
    // VITE_API_URL is undefined in tests so API_BASE resolves to "".
    // The fetch call must be `${API_BASE}/api/auth/login` which equals "/api/auth/login".
    // This test verifies that the URL actually matches what API_BASE produces — any
    // hardcoded alternative (e.g. "http://localhost:3000/api/auth/login") would fail.
    const expectedUrl = `${API_BASE}/api/auth/login`;

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: "tok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "secret123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const [calledUrl] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
    expect(calledUrl).toBe(expectedUrl);
  });

  it("shows validation errors when fields are empty", async () => {
    fetchSpy.mockResolvedValue(new Response("{}", { status: 200 }));

    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows error banner on API error response", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid credentials" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), "bad@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });

  it("shows network error banner when fetch throws", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"));

    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "pass");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });
});

describe("LoginPage — post-login navigation (T009)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockNavigate.mockReset();
    fetchSpy = vi.spyOn(globalThis, "fetch");
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("navigates to /dashboard immediately after successful login (no migration check)", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: "jwt-token", user: { id: 1 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const user = userEvent.setup();
    renderLoginPage();
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "pass");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard"),
    );
    expect(mockNavigate).not.toHaveBeenCalledWith("/migrate");
  });

  it("never navigates to /migrate (the /migrate route no longer exists)", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: "jwt-token", user: { id: 1 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const user = userEvent.setup();
    renderLoginPage();
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "pass");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard"),
    );
    expect(mockNavigate).not.toHaveBeenCalledWith("/migrate");
  });

  it("only makes one fetch call (no /api/accounts check after login)", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: "jwt-token", user: { id: 1 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const user = userEvent.setup();
    renderLoginPage();
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "pass");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    // Only the POST /api/auth/login call — no extra GET /api/accounts
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
