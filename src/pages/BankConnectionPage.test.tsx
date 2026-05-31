/**
 * FA-BANK-003 T004 / T006 — Component tests for BankConnectionPage
 *
 * Covers:
 * - Connect form shown when not connected; status card shown when connected
 * - Privacy note visible on connect form without scrolling
 * - Disconnect button triggers window.confirm before calling disconnect()
 * - AccountMappingList and AccountMappingRow rendering
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

// ── Mock AccountContext ────────────────────────────────────────────────────────

const MOCK_FINANCE_ACCOUNTS = [
  { id: "acc-1", nickname: "Cheque", colour: "#aaa" },
  { id: "acc-2", nickname: "Savings", colour: "#bbb" },
];

vi.mock("../context/AccountContext", () => ({
  useAccount: () => ({ accounts: MOCK_FINANCE_ACCOUNTS }),
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

// ── AccountMappingList and AccountMappingRow tests (#838) ─────────────────────

const MOCK_CONNECTION = {
  id: "conn-1",
  userId: "user-1",
  akahuUserId: "user_abc",
  connectedAt: "2026-06-01T00:00:00.000Z",
  lastSyncedAt: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

const MOCK_ACCOUNT_LINK = {
  id: "link-1",
  userId: "user-1",
  akahuAccountId: "acc_xyz",
  financeAccountId: "acc-1",
  akahuAccountName: "Everyday Cheque",
  akahuAccountType: "CHECKING",
  lastBalance: "1234.56",
  lastTransactionSyncedAt: "2026-05-30T00:00:00.000Z",
  syncStatus: "active" as const,
  syncError: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("AccountMappingList — connected with accounts", () => {
  beforeEach(() => {
    currentContext = {
      ...DEFAULT_CONTEXT,
      connection: MOCK_CONNECTION,
      accountLinks: [MOCK_ACCOUNT_LINK],
    };
  });

  it("shows AccountMappingList when connected", () => {
    renderPage();
    expect(screen.getByTestId("account-mapping-list")).toBeInTheDocument();
  });

  it("renders account name from accountLinks", () => {
    renderPage();
    expect(screen.getByTestId("akahu-account-name")).toHaveTextContent(
      "Everyday Cheque",
    );
  });

  it("renders formatted balance with NZD prefix", () => {
    renderPage();
    expect(screen.getByTestId("akahu-balance")).toHaveTextContent(
      "NZD 1234.56",
    );
  });

  it("renders last synced date", () => {
    renderPage();
    expect(screen.getByTestId("akahu-last-synced").textContent).not.toBe("");
  });

  it("shows Finance Analyser account dropdown with options", () => {
    renderPage();
    const select = screen.getByTestId(
      "account-link-select",
    ) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.value).toBe("acc-1");
    const options = Array.from(select.options).map((o) => o.text);
    expect(options).toContain("Cheque");
    expect(options).toContain("Savings");
  });

  it("calls linkAccount when a Finance Analyser account is selected", async () => {
    const user = userEvent.setup();
    mockLinkAccount.mockResolvedValueOnce(true);
    renderPage();

    const select = screen.getByTestId("account-link-select");
    await user.selectOptions(select, "acc-2");

    await waitFor(() => {
      expect(mockLinkAccount).toHaveBeenCalledWith(
        "acc_xyz",
        "acc-2",
        "Savings",
      );
    });
  });

  it("calls unlinkAccount when 'Not linked' is selected", async () => {
    const user = userEvent.setup();
    mockUnlinkAccount.mockResolvedValueOnce(true);
    renderPage();

    const select = screen.getByTestId("account-link-select");
    await user.selectOptions(select, "");

    await waitFor(() => {
      expect(mockUnlinkAccount).toHaveBeenCalledWith("acc_xyz");
    });
  });

  it("shows active sync status badge", () => {
    renderPage();
    expect(screen.getByTestId("sync-status-badge")).toHaveTextContent("Active");
  });
});

describe("AccountMappingList — connected with no accounts", () => {
  beforeEach(() => {
    currentContext = {
      ...DEFAULT_CONTEXT,
      connection: MOCK_CONNECTION,
      accountLinks: [],
    };
  });

  it("shows empty state message when accountLinks is empty", () => {
    renderPage();
    expect(screen.getByTestId("no-accounts-message")).toBeInTheDocument();
    expect(screen.getByTestId("no-accounts-message")).toHaveTextContent(
      "No Akahu accounts found. Try syncing first.",
    );
  });
});

describe("AccountMappingRow — error sync status", () => {
  it("shows sync error text when syncStatus is error", () => {
    currentContext = {
      ...DEFAULT_CONTEXT,
      connection: MOCK_CONNECTION,
      accountLinks: [
        {
          ...MOCK_ACCOUNT_LINK,
          syncStatus: "error" as const,
          syncError: "Connection timed out",
        },
      ],
    };
    renderPage();
    expect(screen.getByTestId("sync-error-text")).toHaveTextContent(
      "Connection timed out",
    );
    expect(screen.getByTestId("sync-status-badge")).toHaveTextContent("Error");
  });
});

// ── SyncControls tests (#839) ─────────────────────────────────────────────────

describe("SyncControls — rendering", () => {
  it("shows SyncControls when connected with linked accounts", () => {
    currentContext = {
      ...DEFAULT_CONTEXT,
      connection: MOCK_CONNECTION,
      accountLinks: [MOCK_ACCOUNT_LINK],
    };
    renderPage();
    expect(screen.getByTestId("sync-controls")).toBeInTheDocument();
  });

  it("does not show SyncControls when connected but no linked accounts", () => {
    currentContext = {
      ...DEFAULT_CONTEXT,
      connection: MOCK_CONNECTION,
      accountLinks: [],
    };
    renderPage();
    expect(screen.queryByTestId("sync-controls")).not.toBeInTheDocument();
  });

  it("does not show SyncControls when not connected", () => {
    currentContext = { ...DEFAULT_CONTEXT, connection: null };
    renderPage();
    expect(screen.queryByTestId("sync-controls")).not.toBeInTheDocument();
  });

  it("shows security note when SyncControls is rendered", () => {
    currentContext = {
      ...DEFAULT_CONTEXT,
      connection: MOCK_CONNECTION,
      accountLinks: [MOCK_ACCOUNT_LINK],
    };
    renderPage();
    const securityNote = screen.getByTestId("security-note");
    expect(securityNote).toBeInTheDocument();
    expect(securityNote.textContent).toMatch(/Akahu/i);
    expect(securityNote.textContent).toMatch(/credentials are never shared/i);
  });

  it("Sync now button is disabled while isSyncing", () => {
    currentContext = {
      ...DEFAULT_CONTEXT,
      connection: MOCK_CONNECTION,
      accountLinks: [MOCK_ACCOUNT_LINK],
      isSyncing: true,
    };
    renderPage();
    expect(screen.getByTestId("sync-now-btn")).toBeDisabled();
    expect(screen.getByTestId("sync-spinner")).toBeInTheDocument();
  });

  it("calls syncNow() when Sync now button is clicked", async () => {
    const user = userEvent.setup();
    mockSyncNow.mockResolvedValueOnce(undefined);
    currentContext = {
      ...DEFAULT_CONTEXT,
      connection: MOCK_CONNECTION,
      accountLinks: [MOCK_ACCOUNT_LINK],
    };
    renderPage();

    await user.click(screen.getByTestId("sync-now-btn"));

    await waitFor(() => {
      expect(mockSyncNow).toHaveBeenCalled();
    });
  });
});

describe("SyncControls — sync result display", () => {
  beforeEach(() => {
    currentContext = {
      ...DEFAULT_CONTEXT,
      connection: MOCK_CONNECTION,
      accountLinks: [MOCK_ACCOUNT_LINK],
    };
  });

  it("shows 'Synced X new transactions' when transactions were added", () => {
    currentContext = {
      ...currentContext,
      lastSyncResult: { accountsSynced: 2, transactionsAdded: 14, errors: [] },
    };
    renderPage();
    expect(screen.getByTestId("sync-result-text")).toHaveTextContent(
      "Synced 14 new transactions across 2 accounts",
    );
  });

  it("shows 'No new transactions found' when transactionsAdded is 0", () => {
    currentContext = {
      ...currentContext,
      lastSyncResult: { accountsSynced: 1, transactionsAdded: 0, errors: [] },
    };
    renderPage();
    expect(screen.getByTestId("sync-result-text")).toHaveTextContent(
      "No new transactions found",
    );
  });

  it("shows per-account errors when errors are present", () => {
    currentContext = {
      ...currentContext,
      lastSyncResult: {
        accountsSynced: 0,
        transactionsAdded: 0,
        errors: [{ accountId: "acc_xyz", error: "Token expired" }],
      },
    };
    renderPage();
    expect(screen.getByTestId("sync-error-list")).toBeInTheDocument();
    expect(screen.getByTestId("sync-error-list").textContent).toContain(
      "acc_xyz",
    );
    expect(screen.getByTestId("sync-error-list").textContent).toContain(
      "Token expired",
    );
  });

  it("does not show sync result card when lastSyncResult is null", () => {
    currentContext = { ...currentContext, lastSyncResult: null };
    renderPage();
    expect(screen.queryByTestId("sync-result")).not.toBeInTheDocument();
  });
});
