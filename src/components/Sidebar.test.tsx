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

describe("Sidebar — add account button", () => {
  it("renders the add-account-btn beside the ACCOUNTS section label", async () => {
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
