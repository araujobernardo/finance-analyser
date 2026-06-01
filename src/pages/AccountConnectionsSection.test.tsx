/**
 * FA-BANK-003 (#885) — Component tests for AccountConnectionsSection
 *
 * Covers:
 * - Card hidden when no Finance Analyser accounts exist
 * - Card renders when accounts exist
 * - Rows rendered — one per Finance Analyser account
 * - Linked badge shown when account has a matching accountLink
 * - Not-linked badge shown when account has no matching accountLink
 * - Bank account name and balance rendered for linked accounts
 * - Dashes shown for unlinked accounts
 * - Summary row shows correct X of Y count
 * - Akahu not-connected state: all accounts show not-linked
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AccountConnectionsSection } from "./SettingsPage";
import type { BankContextValue } from "../context/BankContext";

// ── Mock BankContext ────────────────────────────────────────────────────────────

const DEFAULT_BANK_CONTEXT: BankContextValue = {
  connection: null,
  accountLinks: [],
  isLoading: false,
  isSyncing: false,
  lastSyncResult: null,
  error: null,
  connect: vi.fn(),
  disconnect: vi.fn(),
  linkAccount: vi.fn(),
  unlinkAccount: vi.fn(),
  syncNow: vi.fn(),
  refetch: vi.fn(),
};

let currentBankContext: BankContextValue = { ...DEFAULT_BANK_CONTEXT };

vi.mock("../context/BankContext", () => ({
  useBankContext: () => currentBankContext,
  BankProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// ── Mock AccountContext ─────────────────────────────────────────────────────────

const MOCK_ACCOUNTS = [
  {
    id: "acc-1",
    nickname: "Cheque",
    accountType: "Checking",
    colour: "#aaa",
    userId: "u1",
    accountNumber: "01-1234-5678901-00",
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "acc-2",
    nickname: "Savings",
    accountType: "Savings",
    colour: "#bbb",
    userId: "u1",
    accountNumber: "01-1234-5678901-01",
    createdAt: "2026-01-01T00:00:00Z",
  },
];

let mockAccounts = MOCK_ACCOUNTS;

vi.mock("../context/AccountContext", () => ({
  useAccount: () => ({ accounts: mockAccounts }),
}));

// ── Mock useApi ────────────────────────────────────────────────────────────────

vi.mock("../lib/api", () => ({
  useApi: () => ({ apiFetch: vi.fn() }),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const MOCK_LINK = {
  id: "link-1",
  userId: "u1",
  akahuAccountId: "akahu-1",
  financeAccountId: "acc-1",
  akahuAccountName: "ASB Everyday",
  akahuAccountType: "CHECKING",
  lastBalance: "1234.56",
  lastTransactionSyncedAt: "2026-05-30T00:00:00Z",
  syncStatus: "active" as const,
  syncError: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderSection() {
  return render(<AccountConnectionsSection />);
}

beforeEach(() => {
  vi.clearAllMocks();
  currentBankContext = { ...DEFAULT_BANK_CONTEXT };
  mockAccounts = MOCK_ACCOUNTS;
});

// ── Visibility ────────────────────────────────────────────────────────────────

describe("AccountConnectionsSection — visibility", () => {
  it("renders nothing when accounts list is empty", () => {
    mockAccounts = [];
    const { container } = renderSection();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the card when accounts exist", () => {
    renderSection();
    expect(
      screen.getByTestId("account-connections-section"),
    ).toBeInTheDocument();
  });
});

// ── Row rendering ─────────────────────────────────────────────────────────────

describe("AccountConnectionsSection — rows", () => {
  it("renders one row per Finance Analyser account", () => {
    renderSection();
    const rows = screen.getAllByTestId("account-connection-row");
    expect(rows).toHaveLength(MOCK_ACCOUNTS.length);
  });

  it("shows account nickname and type in each row", () => {
    renderSection();
    const rows = screen.getAllByTestId("account-connection-row");

    // First account: nickname "Cheque", type "Checking" — distinct text
    expect(within(rows[0]).getByText("Cheque")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Checking")).toBeInTheDocument();

    // Second account: nickname "Savings", type "Savings" — both appear, so use getAllByText
    const savingsMatches = within(rows[1]).getAllByText("Savings");
    expect(savingsMatches).toHaveLength(2); // nickname + accountType both say "Savings"
  });
});

// ── Linked state ──────────────────────────────────────────────────────────────

describe("AccountConnectionsSection — linked account", () => {
  beforeEach(() => {
    currentBankContext = {
      ...DEFAULT_BANK_CONTEXT,
      accountLinks: [MOCK_LINK],
    };
  });

  it("shows Linked badge for acc-1 (which has a link)", () => {
    renderSection();
    const rows = screen.getAllByTestId("account-connection-row");
    expect(
      within(rows[0]).getByTestId("connection-linked-badge"),
    ).toBeInTheDocument();
    expect(
      within(rows[0]).getByTestId("connection-linked-badge"),
    ).toHaveTextContent("Linked");
  });

  it("shows the Akahu account name for linked account", () => {
    renderSection();
    const rows = screen.getAllByTestId("account-connection-row");
    expect(
      within(rows[0]).getByTestId("connection-bank-account"),
    ).toHaveTextContent("ASB Everyday");
  });

  it("shows formatted balance for linked account", () => {
    renderSection();
    const rows = screen.getAllByTestId("account-connection-row");
    expect(within(rows[0]).getByTestId("connection-balance")).toHaveTextContent(
      "NZD",
    );
  });

  it("shows Not linked badge for acc-2 (which has no link)", () => {
    renderSection();
    const rows = screen.getAllByTestId("account-connection-row");
    expect(
      within(rows[1]).getByTestId("connection-not-linked-badge"),
    ).toBeInTheDocument();
    expect(
      within(rows[1]).getByTestId("connection-not-linked-badge"),
    ).toHaveTextContent("Not linked");
  });

  it("shows dash for bank account when not linked", () => {
    renderSection();
    const rows = screen.getAllByTestId("account-connection-row");
    expect(
      within(rows[1]).getByTestId("connection-bank-account"),
    ).toHaveTextContent("—");
  });

  it("shows dash for balance when not linked", () => {
    renderSection();
    const rows = screen.getAllByTestId("account-connection-row");
    expect(within(rows[1]).getByTestId("connection-balance")).toHaveTextContent(
      "—",
    );
  });
});

// ── Null balance ──────────────────────────────────────────────────────────────

describe("AccountConnectionsSection — null balance", () => {
  it("shows dash when lastBalance is null", () => {
    currentBankContext = {
      ...DEFAULT_BANK_CONTEXT,
      accountLinks: [{ ...MOCK_LINK, lastBalance: null }],
    };
    renderSection();
    const rows = screen.getAllByTestId("account-connection-row");
    expect(within(rows[0]).getByTestId("connection-balance")).toHaveTextContent(
      "—",
    );
  });
});

// ── Not-connected state ───────────────────────────────────────────────────────

describe("AccountConnectionsSection — Akahu not connected", () => {
  it("shows Not linked for all accounts when connection is null and no links", () => {
    currentBankContext = {
      ...DEFAULT_BANK_CONTEXT,
      connection: null,
      accountLinks: [],
    };
    renderSection();
    const notLinkedBadges = screen.getAllByTestId(
      "connection-not-linked-badge",
    );
    expect(notLinkedBadges).toHaveLength(MOCK_ACCOUNTS.length);
  });
});

// ── Summary row ───────────────────────────────────────────────────────────────

describe("AccountConnectionsSection — summary row", () => {
  it("shows '0 of 2 accounts linked' when no accounts are linked", () => {
    renderSection();
    const summary = screen.getByTestId("account-connections-summary");
    expect(summary).toHaveTextContent("0 of 2 accounts linked");
  });

  it("shows '1 of 2 accounts linked' when one account is linked", () => {
    currentBankContext = {
      ...DEFAULT_BANK_CONTEXT,
      accountLinks: [MOCK_LINK],
    };
    renderSection();
    const summary = screen.getByTestId("account-connections-summary");
    expect(summary).toHaveTextContent("1 of 2 accounts linked");
  });

  it("shows '2 of 2 accounts linked' when all accounts are linked", () => {
    currentBankContext = {
      ...DEFAULT_BANK_CONTEXT,
      accountLinks: [
        MOCK_LINK,
        {
          ...MOCK_LINK,
          id: "link-2",
          akahuAccountId: "akahu-2",
          financeAccountId: "acc-2",
          akahuAccountName: "ASB Savings",
        },
      ],
    };
    renderSection();
    const summary = screen.getByTestId("account-connections-summary");
    expect(summary).toHaveTextContent("2 of 2 accounts linked");
  });

  it("shows singular 'account' when there is only one account", () => {
    mockAccounts = [MOCK_ACCOUNTS[0]!];
    currentBankContext = {
      ...DEFAULT_BANK_CONTEXT,
      accountLinks: [MOCK_LINK],
    };
    renderSection();
    const summary = screen.getByTestId("account-connections-summary");
    // Should say "1 of 1 account linked" (singular), not "1 of 1 accounts linked"
    expect(summary).toHaveTextContent("1 of 1 account linked");
    // The count portion must not say "accounts" — note the copy also says "link accounts"
    // so we check that the count phrase specifically uses singular form
    expect(summary.textContent).toMatch(/1 of 1 account linked/);
    expect(summary.textContent).not.toMatch(/1 of 1 accounts linked/);
  });

  it("mentions the link location in the summary", () => {
    renderSection();
    const summary = screen.getByTestId("account-connections-summary");
    expect(summary).toHaveTextContent("link accounts in Bank Connection above");
  });
});
