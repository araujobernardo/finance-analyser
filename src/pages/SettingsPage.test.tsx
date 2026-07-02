import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AccountProvider } from "../context/AccountContext";
import { ToastProvider } from "../context/ToastContext";
import { ImportTransactionsSection } from "./SettingsPage";

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

// ── Mock BankContext ──────────────────────────────────────────────────────────

vi.mock("../context/BankContext", () => ({
  useBankContext: () => ({
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
  }),
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
    uploadError: null,
    handleFile: mockHandleFile,
    confirmReplace: vi.fn(),
    cancelReplace: vi.fn(),
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const FAKE_TOKEN = "test.jwt.token";

function renderImportSection() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AccountProvider>
          <ImportTransactionsSection />
        </AccountProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("fa-auth-token", FAKE_TOKEN);
  mockApiFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ accounts: [] }),
  });
  vi.clearAllMocks();
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

describe("ImportTransactionsSection — rendering", () => {
  it("renders the import-transactions-section card", () => {
    renderImportSection();
    expect(
      screen.getByTestId("import-transactions-section"),
    ).toBeInTheDocument();
  });

  it("renders the account selector dropdown", () => {
    renderImportSection();
    const select = screen.getByTestId(
      "import-account-select",
    ) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.tagName).toBe("SELECT");
  });

  it("renders the Upload CSV button", () => {
    renderImportSection();
    expect(screen.getByTestId("import-upload-btn")).toBeInTheDocument();
  });

  it("renders the hidden file input with correct attributes", () => {
    renderImportSection();
    const input = screen.getByTestId(
      "import-csv-file-input",
    ) as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.accept).toBe(".csv");
    expect(input.multiple).toBe(true);
  });

  it("populates account options from API", async () => {
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
            nickname: "Savings",
            accountType: "savings",
            accountNumber: "",
            userId: "u1",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    });
    renderImportSection();
    await waitFor(() => {
      expect(screen.getByText("Cheque")).toBeInTheDocument();
      expect(screen.getByText("Savings")).toBeInTheDocument();
    });
  });
});

describe("ImportTransactionsSection — upload wiring", () => {
  it("Upload CSV button is disabled when no account is selected", async () => {
    renderImportSection();
    const btn = screen.getByTestId("import-upload-btn");
    // With no accounts and empty selection, button should be disabled
    await waitFor(() => {
      expect(btn).toBeDisabled();
    });
  });

  it("Upload CSV button is enabled after selecting an account", async () => {
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
    renderImportSection();

    // Wait for accounts to load
    await screen.findByText("Cheque");

    // Select the account
    const select = screen.getByTestId("import-account-select");
    await user.selectOptions(select, "acc-1");

    await waitFor(() => {
      expect(screen.getByTestId("import-upload-btn")).not.toBeDisabled();
    });
  });

  it("calls handleFile from useFileUpload when a CSV file is selected", async () => {
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
    renderImportSection();

    // Select an account first
    await screen.findByText("Cheque");
    const select = screen.getByTestId("import-account-select");
    await user.selectOptions(select, "acc-1");

    // Upload a file via the hidden input
    const input = screen.getByTestId(
      "import-csv-file-input",
    ) as HTMLInputElement;
    const file = new File(
      ["date,desc,amount\n2026-01-01,Test,100"],
      "test.csv",
      { type: "text/csv" },
    );
    await user.upload(input, file);

    await waitFor(() => expect(mockHandleFile).toHaveBeenCalledWith(file));
  });
});

describe("ImportTransactionsSection — status display", () => {
  it("shows no status message when idle", () => {
    renderImportSection();
    expect(
      screen.queryByTestId("import-upload-status"),
    ).not.toBeInTheDocument();
  });

  it("does not show duplicate warning when isDuplicate is false", () => {
    renderImportSection();
    expect(
      screen.queryByTestId("import-duplicate-warning"),
    ).not.toBeInTheDocument();
  });
});
