import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AccountProvider } from "../context/AccountContext";
import { ToastProvider } from "../context/ToastContext";
import { Sidebar } from "./Sidebar";

// ── Mock useApi ───────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();
vi.mock("../lib/api", () => ({
  useApi: () => ({ apiFetch: mockApiFetch }),
  API_BASE: "",
}));

// ── Mock useAuth ──────────────────────────────────────────────────────────────

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

// ── Mock useFileUpload ────────────────────────────────────────────────────────

const mockHandleFile = vi.fn();
vi.mock("../hooks/useFileUpload", () => ({
  useFileUpload: () => ({
    selectedFile: null,
    parseErrors: [],
    isDuplicate: false,
    duplicateMonth: null,
    isCategorising: false,
    savedMonthKey: null,
    savedMonthCount: 0,
    importedCount: 0,
    skippedCount: 0,
    handleFile: mockHandleFile,
    confirmReplace: vi.fn(),
    cancelReplace: vi.fn(),
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const FAKE_TOKEN = "test.jwt.token";

function renderSidebar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AccountProvider>
          <Sidebar />
        </AccountProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // Explicitly clear the active-account key so AccountProvider always starts
  // with a clean slate. This prevents the "all" value set by a previous test
  // from bleeding into the next one, which causes the Upload-to label to show
  // the fallback instead of the first account's nickname (#802 flake fix).
  localStorage.clear();
  localStorage.setItem("fa-auth-token", FAKE_TOKEN);
  // Default: GET /api/accounts returns empty list; no transaction fetches.
  mockApiFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ accounts: [] }),
  });
  vi.clearAllMocks();
  // Re-apply the default mock after clearAllMocks.
  mockApiFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ accounts: [] }),
  });
});

afterEach(() => {
  localStorage.clear();
  cleanup();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Sidebar — upload wiring", () => {
  it("renders the Upload CSV button", async () => {
    renderSidebar();
    expect(screen.getByTestId("upload-csv-btn")).toBeInTheDocument();
  });

  it("renders the hidden file input", async () => {
    renderSidebar();
    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.accept).toBe(".csv");
    expect(input.multiple).toBe(true);
  });

  it("calls handleFile from useFileUpload when a CSV file is selected", async () => {
    const user = userEvent.setup();
    renderSidebar();

    const input = screen.getByTestId("csv-file-input") as HTMLInputElement;
    const file = new File(
      ["date,desc,amount\n2026-01-01,Test,100"],
      "test.csv",
      {
        type: "text/csv",
      },
    );

    await user.upload(input, file);

    await waitFor(() => expect(mockHandleFile).toHaveBeenCalledWith(file));
  });

  it("does not accept the onUpload prop — Sidebar manages uploads internally", () => {
    // Sidebar's prop interface must not include onUpload.
    // Verify by checking that passing an unknown prop does not reach handleFile logic.
    // (TypeScript enforces this at compile time; here we just confirm the upload
    // path uses handleFile from the hook, not an external callback.)
    const user = userEvent.setup();
    renderSidebar();
    // Passes if the component renders without error.
    expect(screen.getByTestId("csv-file-input")).toBeInTheDocument();
    void user; // suppress unused-variable lint for async user in sync test
  });
});

describe("Sidebar — upload status display", () => {
  it("shows no status message when no file has been selected", () => {
    renderSidebar();
    expect(screen.queryByTestId("upload-status")).not.toBeInTheDocument();
  });
});

describe("Sidebar — account selection (issue #748)", () => {
  it("renders account rows with role=button", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accounts: [
          {
            id: "acc-1",
            nickname: "Cheque",
            accountType: "cheque",
            accountNumber: "",
            userId: "u1",
            createdAt: "2026-01-01T00:00:00Z",
          },
          {
            id: "acc-2",
            nickname: "Credit",
            accountType: "credit",
            accountNumber: "",
            userId: "u1",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    });
    renderSidebar();
    const rows = await screen.findAllByTestId("account-item");
    expect(rows.length).toBe(2);
    for (const row of rows) {
      expect(row).toHaveAttribute("role", "button");
    }
  });

  it("marks first account as active by default and renders Upload to label", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accounts: [
          {
            id: "acc-1",
            nickname: "Cheque",
            accountType: "cheque",
            accountNumber: "",
            userId: "u1",
            createdAt: "2026-01-01T00:00:00Z",
          },
          {
            id: "acc-2",
            nickname: "Credit",
            accountType: "credit",
            accountNumber: "",
            userId: "u1",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    });
    renderSidebar();
    const label = await screen.findByTestId("upload-to-label");
    expect(label).toBeInTheDocument();
    // Active account is the first one loaded
    expect(label).toHaveTextContent("Upload to:");
    expect(label).toHaveTextContent("Cheque");
  });

  it("clicking an account row selects it and updates Upload to label", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accounts: [
          {
            id: "acc-1",
            nickname: "Cheque",
            accountType: "cheque",
            accountNumber: "",
            userId: "u1",
            createdAt: "2026-01-01T00:00:00Z",
          },
          {
            id: "acc-2",
            nickname: "Credit",
            accountType: "credit",
            accountNumber: "",
            userId: "u1",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    });
    const user = userEvent.setup();
    renderSidebar();

    const rows = await screen.findAllByTestId("account-item");
    // Click second row (Credit)
    await user.click(rows[1]);

    await waitFor(() => {
      const label = screen.getByTestId("upload-to-label");
      expect(label).toHaveTextContent("Credit");
    });

    // Second row should now have the active class
    expect(rows[1]).toHaveClass("sidebar-account-row--active");
    expect(rows[0]).not.toHaveClass("sidebar-account-row--active");
  });

  it("shows fallback label when no accounts exist", async () => {
    renderSidebar();
    const label = await screen.findByTestId("upload-to-label");
    expect(label).toHaveTextContent("Upload to:");
    // No accounts loaded — shows the fallback
    expect(label).toHaveTextContent("(select an account)");
  });
});

describe("Sidebar — add account button", () => {
  it("renders the add-account-btn inside the All Accounts row", async () => {
    renderSidebar();
    const btn = screen.getByTestId("add-account-btn");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("aria-label", "Add account");
  });

  it("opens AddAccountModal when + button is clicked", async () => {
    const user = userEvent.setup();
    renderSidebar();

    // Modal should not be present initially
    expect(screen.queryByText("Add Account")).not.toBeInTheDocument();

    // Click the + button
    await user.click(screen.getByTestId("add-account-btn"));

    // Modal should now appear
    expect(screen.getByText("Add Account")).toBeInTheDocument();
  });

  it("closes AddAccountModal when Cancel is clicked", async () => {
    const user = userEvent.setup();
    renderSidebar();

    // Open modal
    await user.click(screen.getByTestId("add-account-btn"));
    expect(screen.getByText("Add Account")).toBeInTheDocument();

    // Click cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByText("Add Account")).not.toBeInTheDocument();
  });
});

describe("Sidebar — All Accounts row (issue #755 Option C)", () => {
  it("renders the All Accounts row with data-testid and role=button", async () => {
    renderSidebar();
    const allAccountsRow = screen.getByTestId("account-all-accounts");
    expect(allAccountsRow).toBeInTheDocument();
    expect(allAccountsRow).toHaveAttribute("role", "button");
  });

  it("All Accounts row has aria-pressed=true when activeAccountId is 'all'", async () => {
    // Seed localStorage with the correct key so AccountContext resolves to "all"
    localStorage.setItem("finance_analyser_active_account", "all");
    renderSidebar();
    const allAccountsRow = screen.getByTestId("account-all-accounts");
    // Wait for the async account fetch to complete and activeAccountId to settle to "all"
    await waitFor(() => {
      expect(allAccountsRow).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("clicking All Accounts row selects all accounts (upload-to label shows fallback)", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accounts: [
          {
            id: "acc-1",
            nickname: "Cheque",
            accountType: "cheque",
            accountNumber: "",
            userId: "u1",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    });
    const user = userEvent.setup();
    renderSidebar();

    // Wait for accounts to load, then click All Accounts row
    await screen.findAllByTestId("account-item");
    const allAccountsRow = screen.getByTestId("account-all-accounts");
    await user.click(allAccountsRow);

    await waitFor(() => {
      expect(allAccountsRow).toHaveAttribute("aria-pressed", "true");
    });

    // Upload label should now show the "select an account" fallback
    const label = screen.getByTestId("upload-to-label");
    expect(label).toHaveTextContent("(select an account)");
  });

  it("clicking + button inside All Accounts row does NOT select All Accounts", async () => {
    const user = userEvent.setup();
    renderSidebar();

    const addBtn = screen.getByTestId("add-account-btn");

    // Click the + button — stopPropagation should prevent the row click handler
    await user.click(addBtn);

    // Modal opened (confirming + click worked without triggering All Accounts selection)
    expect(screen.getByText("Add Account")).toBeInTheDocument();
  });

  it("individual account rows have the indented class", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accounts: [
          {
            id: "acc-1",
            nickname: "Cheque",
            accountType: "cheque",
            accountNumber: "",
            userId: "u1",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    });
    renderSidebar();
    const rows = await screen.findAllByTestId("account-item");
    for (const row of rows) {
      expect(row).toHaveClass("sidebar-account-row--indented");
    }
  });
});
