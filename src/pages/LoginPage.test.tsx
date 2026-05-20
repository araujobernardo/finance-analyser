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

// Mock storage so we control what "localStorage accounts" look like in tests.
const mockGetAccounts = vi.fn();
vi.mock("../services/storage", () => ({
  getAccounts: () => mockGetAccounts(),
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

/** Simulate a successful auth login response then submit the form. */
async function loginSuccessfully(
  fetchSpy: ReturnType<typeof vi.spyOn>,
  {
    cloudAccounts = [],
    localStorageFlag = false,
  }: { cloudAccounts?: unknown[]; localStorageFlag?: boolean } = {},
) {
  if (localStorageFlag) {
    localStorage.setItem("fa-migration-complete", "true");
  } else {
    localStorage.removeItem("fa-migration-complete");
  }

  // First fetch: POST /api/auth/login → returns token
  // Second fetch: GET /api/accounts → returns cloud accounts
  fetchSpy
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ token: "jwt-token", user: { id: 1 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ accounts: cloudAccounts }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

  const user = userEvent.setup();
  renderLoginPage();
  await user.type(screen.getByLabelText(/email/i), "user@example.com");
  await user.type(screen.getByLabelText(/password/i), "pass");
  await user.click(screen.getByRole("button", { name: /sign in/i }));
}

describe("LoginPage — API_BASE integration (#272)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetAccounts.mockReset();
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

    mockGetAccounts.mockReturnValue([]);
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token: "tok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accounts: [] }), {
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

describe("LoginPage — migration trigger logic (#680)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockNavigate.mockReset();
    mockGetAccounts.mockReset();
    fetchSpy = vi.spyOn(globalThis, "fetch");
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("(a) navigates to /dashboard when cloud already has accounts", async () => {
    mockGetAccounts.mockReturnValue([{ id: "acc1", name: "Savings" }]);
    await loginSuccessfully(fetchSpy, {
      cloudAccounts: [{ id: "cloud-acc1" }],
    });
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard"),
    );
    expect(mockNavigate).not.toHaveBeenCalledWith("/migrate");
  });

  it("(b) navigates to /dashboard when localStorage has no accounts (new user)", async () => {
    mockGetAccounts.mockReturnValue([]);
    await loginSuccessfully(fetchSpy, { cloudAccounts: [] });
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard"),
    );
    expect(mockNavigate).not.toHaveBeenCalledWith("/migrate");
  });

  it("(c) redirects to /migrate when localStorage has accounts and cloud is empty", async () => {
    mockGetAccounts.mockReturnValue([{ id: "acc1", name: "Checking" }]);
    await loginSuccessfully(fetchSpy, { cloudAccounts: [] });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/migrate"));
    expect(mockNavigate).not.toHaveBeenCalledWith("/dashboard");
  });

  it("(d) redirects to /migrate even when fa-migration-complete flag is set but cloud is empty", async () => {
    // This is the core bug fix: the flag alone must NOT skip migration when cloud is empty
    mockGetAccounts.mockReturnValue([{ id: "acc1", name: "Checking" }]);
    await loginSuccessfully(fetchSpy, {
      cloudAccounts: [],
      localStorageFlag: true,
    });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/migrate"));
    expect(mockNavigate).not.toHaveBeenCalledWith("/dashboard");
  });
});
