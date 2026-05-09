import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SignUpPage } from "./SignUpPage";
import { API_BASE } from "../lib/api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderSignUpPage() {
  return render(
    <MemoryRouter>
      <SignUpPage />
    </MemoryRouter>,
  );
}

describe("SignUpPage — API_BASE integration (#273)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockNavigate.mockReset();
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the create account form", () => {
    renderSignUpPage();
    expect(
      screen.getByRole("heading", { name: /create your account/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("calls fetch with a URL built from API_BASE, not a bare hardcoded string", async () => {
    const expectedUrl = `${API_BASE}/api/auth/register`;

    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ message: "Check your email" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const user = userEvent.setup();
    renderSignUpPage();

    await user.type(screen.getByLabelText(/display name/i), "Test User");
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledOnce());

    const [calledUrl] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
    expect(calledUrl).toBe(expectedUrl);
  });

  it("navigates to /verify-email-sent on successful registration", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ message: "Verify your email" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const user = userEvent.setup();
    renderSignUpPage();

    await user.type(screen.getByLabelText(/display name/i), "Test User");
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "securepass");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith(
        "/verify-email-sent",
        expect.objectContaining({ state: { email: "user@example.com" } }),
      ),
    );
  });

  it("shows validation errors when required fields are empty", async () => {
    fetchSpy.mockResolvedValue(new Response("{}", { status: 200 }));

    const user = userEvent.setup();
    renderSignUpPage();

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/display name is required/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows error banner on API error response", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: "Email already registered" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const user = userEvent.setup();
    renderSignUpPage();

    await user.type(screen.getByLabelText(/display name/i), "Existing");
    await user.type(screen.getByLabelText(/email/i), "existing@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(
      await screen.findByText(/email already registered/i),
    ).toBeInTheDocument();
  });

  it("shows network error banner when fetch throws", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"));

    const user = userEvent.setup();
    renderSignUpPage();

    await user.type(screen.getByLabelText(/display name/i), "User");
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });
});
