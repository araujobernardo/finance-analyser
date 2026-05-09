import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ResetPasswordPage } from "./ResetPasswordPage";
import { API_BASE } from "../lib/api";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams("token=abc123"), vi.fn()],
  };
});

function renderResetPasswordPage() {
  return render(
    <MemoryRouter initialEntries={["/reset-password?token=abc123"]}>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
}

describe("ResetPasswordPage — API_BASE integration (#275)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockNavigate.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the reset password form when token is present", () => {
    renderResetPasswordPage();
    expect(
      screen.getByRole("heading", { name: /reset password/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("calls fetch with a URL built from API_BASE, not a bare hardcoded string", async () => {
    const expectedUrl = `${API_BASE}/api/auth/reset-password`;

    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({ message: "Password reset successfully." }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderResetPasswordPage();

    await user.type(screen.getByLabelText(/new password/i), "newpassword1");
    await user.type(screen.getByLabelText(/confirm password/i), "newpassword1");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledOnce());

    const [calledUrl] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
    expect(calledUrl).toBe(expectedUrl);
  });

  it("shows success banner and navigates to /login after 2 seconds", async () => {
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({ message: "Password reset successfully." }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderResetPasswordPage();

    await user.type(screen.getByLabelText(/new password/i), "newpassword1");
    await user.type(screen.getByLabelText(/confirm password/i), "newpassword1");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    // Success banner should appear immediately after fetch resolves
    expect(
      await screen.findByText(/password reset successfully/i),
    ).toBeInTheDocument();

    // Advance fake timers past the 2000ms delay
    vi.advanceTimersByTime(2000);
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/login"));
  });

  it("shows validation errors when fields are empty", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderResetPasswordPage();

    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(
      await screen.findByText(/password is required/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/please confirm your password/i),
    ).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows error banner on API error response", async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify({ error: "Token expired" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderResetPasswordPage();

    await user.type(screen.getByLabelText(/new password/i), "newpassword1");
    await user.type(screen.getByLabelText(/confirm password/i), "newpassword1");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText(/token expired/i)).toBeInTheDocument();
  });

  it("shows network error banner when fetch throws", async () => {
    fetchSpy.mockRejectedValue(new Error("Network error"));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderResetPasswordPage();

    await user.type(screen.getByLabelText(/new password/i), "newpassword1");
    await user.type(screen.getByLabelText(/confirm password/i), "newpassword1");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });
});
