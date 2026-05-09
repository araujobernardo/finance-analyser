import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { VerifyEmailPage } from "./VerifyEmailPage";
import { API_BASE } from "../lib/api";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Render with a `?token=` query param — triggers the TokenVerification branch. */
function renderWithToken(token = "valid-token") {
  return render(
    <MemoryRouter
      initialEntries={[`/verify-email?token=${token}`]}
      initialIndex={0}
    >
      <VerifyEmailPage />
    </MemoryRouter>,
  );
}

/** Render without a token — triggers the SentConfirmation branch.
 *  Pass `email` via router location state to enable the resend button. */
function renderSentConfirmation(email = "user@example.com") {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: "/verify-email-sent", state: { email } }]}
      initialIndex={0}
    >
      <VerifyEmailPage />
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("VerifyEmailPage — API_BASE integration (#276)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // ── TokenVerification branch ────────────────────────────────────────────────

  describe("token verification branch", () => {
    it("calls verify-email with a URL built from API_BASE on mount", async () => {
      const expectedUrl = `${API_BASE}/api/auth/verify-email`;

      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ message: "Email verified." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      renderWithToken();

      await waitFor(() => expect(fetchSpy).toHaveBeenCalledOnce());

      const [calledUrl] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
      expect(calledUrl).toBe(expectedUrl);
    });

    it("shows success state after successful verification", async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ message: "Email verified." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      renderWithToken();

      expect(await screen.findByText(/email verified/i)).toBeInTheDocument();
    });

    it("shows error state when verification fails", async () => {
      fetchSpy.mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "The verification link is invalid or has expired.",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

      renderWithToken("bad-token");

      expect(
        await screen.findByText(/invalid or has expired/i),
      ).toBeInTheDocument();
    });

    it("shows network error when fetch throws during verification", async () => {
      fetchSpy.mockRejectedValue(new Error("Network error"));

      renderWithToken();

      expect(await screen.findByText(/network error/i)).toBeInTheDocument();
    });
  });

  // ── SentConfirmation branch ─────────────────────────────────────────────────

  describe("sent confirmation branch (resend)", () => {
    it("renders the sent confirmation view when no token is present", () => {
      renderSentConfirmation();
      expect(
        screen.getByRole("heading", { name: /check your email/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /resend email/i }),
      ).toBeInTheDocument();
    });

    it("calls resend-verification with a URL built from API_BASE", async () => {
      const expectedUrl = `${API_BASE}/api/auth/resend-verification`;

      fetchSpy.mockResolvedValue(
        new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const user = userEvent.setup();
      renderSentConfirmation("user@example.com");

      await user.click(screen.getByRole("button", { name: /resend email/i }));

      await waitFor(() => expect(fetchSpy).toHaveBeenCalledOnce());

      const [calledUrl] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
      expect(calledUrl).toBe(expectedUrl);
    });

    it("shows sent confirmation banner after successful resend", async () => {
      fetchSpy.mockResolvedValue(
        new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const user = userEvent.setup();
      renderSentConfirmation();

      await user.click(screen.getByRole("button", { name: /resend email/i }));

      expect(
        await screen.findByText(/a new link has been sent/i),
      ).toBeInTheDocument();
    });

    it("shows error banner when resend fetch throws", async () => {
      fetchSpy.mockRejectedValue(new Error("Network error"));

      const user = userEvent.setup();
      renderSentConfirmation();

      await user.click(screen.getByRole("button", { name: /resend email/i }));

      expect(
        await screen.findByText(/something went wrong/i),
      ).toBeInTheDocument();
    });
  });
});
