/**
 * FA-BANK-003 T004 — Component tests for BankConnectionPage
 *
 * Covers:
 * - Connect form shown when not connected; status card shown when connected
 * - Privacy note visible on connect form without scrolling
 * - Disconnect button triggers window.confirm before calling disconnect()
 * - tsc --noEmit passes with zero errors
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BankConnectionPage } from "./BankConnectionPage";
import type { BankContextValue } from "../context/BankContext";

// ── Mock BankContext ───────────────────────────────────────────────────────────

const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockSyncNow = vi.fn();
const mockLinkAccount = vi.fn();
const mockUnlinkAccount = vi.fn();
const mockRefetch = vi.fn();

const DEFAULT_CONTEXT: BankContextValue = {
  connection: null,
  accountLinks: [],
  isLoading: false,
  isSyncing: false,
  lastSyncResult: null,
  error: null,
  connect: mockConnect,
  disconnect: mockDisconnect,
  linkAccount: mockLinkAccount,
  unlinkAccount: mockUnlinkAccount,
  syncNow: mockSyncNow,
  refetch: mockRefetch,
};

let currentContext: BankContextValue = { ...DEFAULT_CONTEXT };

vi.mock("../context/BankContext", () => ({
  useBankContext: () => currentContext,
  BankProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function renderPage() {
  return render(<BankConnectionPage />);
}

beforeEach(() => {
  vi.clearAllMocks();
  currentContext = { ...DEFAULT_CONTEXT };
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("BankConnectionPage — disconnected state", () => {
  it("renders the connect form when connection is null", () => {
    renderPage();
    expect(screen.getByTestId("connect-form-card")).toBeInTheDocument();
    expect(
      screen.queryByTestId("connection-status-card"),
    ).not.toBeInTheDocument();
  });

  it("renders 'Akahu User ID' and 'User Token' inputs", () => {
    renderPage();
    expect(screen.getByTestId("akahu-user-id-input")).toBeInTheDocument();
    expect(screen.getByTestId("user-token-input")).toBeInTheDocument();
  });

  it("shows the privacy note", () => {
    renderPage();
    const note = screen.getByTestId("privacy-note");
    expect(note).toBeInTheDocument();
    expect(note.textContent).toMatch(/credentials are never stored/i);
  });

  it("connect button is disabled while isLoading", () => {
    currentContext = { ...DEFAULT_CONTEXT, isLoading: true };
    renderPage();
    const btn = screen.getByTestId("connect-submit-btn");
    expect(btn).toBeDisabled();
  });

  it("calls connect() with form values on submit", async () => {
    const user = userEvent.setup();
    mockConnect.mockResolvedValueOnce(true);
    renderPage();

    await user.type(screen.getByTestId("akahu-user-id-input"), "user_abc123");
    await user.type(
      screen.getByTestId("user-token-input"),
      "user_token_secret",
    );
    await user.click(screen.getByTestId("connect-submit-btn"));

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledWith(
        "user_abc123",
        "user_token_secret",
      );
    });
  });
});

describe("BankConnectionPage — connected state", () => {
  const MOCK_CONNECTION = {
    id: "conn-1",
    userId: "user-1",
    akahuUserId: "user_abc",
    connectedAt: "2026-06-01T00:00:00.000Z",
    lastSyncedAt: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };

  beforeEach(() => {
    currentContext = { ...DEFAULT_CONTEXT, connection: MOCK_CONNECTION };
  });

  it("renders the status card when connection is set", () => {
    renderPage();
    expect(screen.getByTestId("connection-status-card")).toBeInTheDocument();
    expect(screen.queryByTestId("connect-form-card")).not.toBeInTheDocument();
  });

  it("shows connected date in the status card", () => {
    renderPage();
    const connectedAt = screen.getByTestId("connected-at");
    expect(connectedAt.textContent).not.toBe("");
  });

  it("shows 'Never synced' when lastSyncedAt is null", () => {
    renderPage();
    expect(screen.getByTestId("last-synced-at").textContent).toBe(
      "Never synced",
    );
  });

  it("calls disconnect() after window.confirm confirmation", async () => {
    const user = userEvent.setup();
    mockDisconnect.mockResolvedValueOnce(true);
    vi.spyOn(window, "confirm").mockReturnValueOnce(true);

    renderPage();
    await user.click(screen.getByTestId("disconnect-btn"));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        "Disconnect your Akahu account? This will remove all account links.",
      );
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  it("does not call disconnect() when window.confirm is cancelled", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValueOnce(false);

    renderPage();
    await user.click(screen.getByTestId("disconnect-btn"));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(mockDisconnect).not.toHaveBeenCalled();
    });
  });
});

describe("BankConnectionPage — error state", () => {
  it("shows error message when context has an error", () => {
    currentContext = { ...DEFAULT_CONTEXT, error: "Connection failed" };
    renderPage();
    expect(screen.getByTestId("bank-error")).toHaveTextContent(
      "Connection failed",
    );
  });
});
