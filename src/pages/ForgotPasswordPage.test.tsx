import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { API_BASE } from "../lib/api";

function renderForgotPasswordPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );
}

describe("ForgotPasswordPage — API_BASE integration (#274)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the forgot password form", () => {
    renderForgotPasswordPage();
    expect(
      screen.getByRole("heading", { name: /forgot password/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it("calls fetch with a URL built from API_BASE, not a bare hardcoded string", async () => {
    const expectedUrl = `${API_BASE}/api/auth/forgot-password`;

    fetchSpy.mockResolvedValue(
      new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const user = userEvent.setup();
    renderForgotPasswordPage();

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledOnce());

    const [calledUrl] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
    expect(calledUrl).toBe(expectedUrl);
  });

  it("shows the success state after submission regardless of server response", async () => {
    fetchSpy.mockResolvedValue(
      new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const user = userEvent.setup();
    renderForgotPasswordPage();

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(
      await screen.findByRole("heading", { name: /check your email/i }),
    ).toBeInTheDocument();
  });

  it("shows validation error when email is empty", async () => {
    fetchSpy.mockResolvedValue(new Response("{}", { status: 200 }));

    const user = userEvent.setup();
    renderForgotPasswordPage();

    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows network error banner when fetch throws", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"));

    const user = userEvent.setup();
    renderForgotPasswordPage();

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });
});
