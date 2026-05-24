import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DangerZoneSection } from "./SettingsPage";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();

vi.mock("../lib/api", () => ({
  useApi: () => ({ apiFetch: mockApiFetch }),
  API_BASE: "",
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ accessToken: "test-token", logout: vi.fn() }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────────────

const MOCK_ACCOUNTS = [
  { id: "acc-1", nickname: "Checking" },
  { id: "acc-2", nickname: "Credit Card" },
];

const accountsOkResponse = {
  ok: true,
  status: 200,
  json: () => Promise.resolve({ accounts: MOCK_ACCOUNTS }),
} as unknown as Response;

function renderSection() {
  return render(<DangerZoneSection />);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("DangerZoneSection — rendering (#769)", () => {
  beforeEach(() => {
    mockApiFetch.mockResolvedValue(accountsOkResponse);
  });

  it("renders the Danger Zone section heading", () => {
    renderSection();
    expect(screen.getByText("Danger Zone")).toBeInTheDocument();
  });

  it("renders the delete all transactions button", () => {
    renderSection();
    expect(screen.getByTestId("danger-zone-open-btn")).toBeInTheDocument();
  });

  it("does not show the confirmation dialog initially", () => {
    renderSection();
    expect(screen.queryByTestId("danger-zone-dialog")).not.toBeInTheDocument();
  });
});

describe("DangerZoneSection — confirmation dialog (#769)", () => {
  beforeEach(() => {
    // Default: accounts fetch succeeds; individual tests override for action calls
    mockApiFetch.mockResolvedValue(accountsOkResponse);
  });

  it("shows the dialog when the delete button is clicked", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByTestId("danger-zone-open-btn"));
    expect(screen.getByTestId("danger-zone-dialog")).toBeInTheDocument();
  });

  it("keeps the confirm button disabled when no text is entered", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByTestId("danger-zone-open-btn"));
    const confirmBtn = screen.getByTestId(
      "danger-zone-confirm-btn",
    ) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  it("keeps the confirm button disabled when wrong text is entered", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByTestId("danger-zone-open-btn"));

    await user.type(screen.getByTestId("danger-zone-confirm-input"), "delete");
    const confirmBtn = screen.getByTestId(
      "danger-zone-confirm-btn",
    ) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
  });

  it("enables the confirm button only when exact 'DELETE' is typed", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByTestId("danger-zone-open-btn"));

    await user.type(screen.getByTestId("danger-zone-confirm-input"), "DELETE");
    const confirmBtn = screen.getByTestId(
      "danger-zone-confirm-btn",
    ) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(false);
  });

  it("hides the dialog and shows success message when confirm is clicked and API succeeds", async () => {
    const user = userEvent.setup();
    mockApiFetch
      .mockResolvedValueOnce(accountsOkResponse)
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
      } as unknown as Response);

    renderSection();
    await user.click(screen.getByTestId("danger-zone-open-btn"));
    await user.type(screen.getByTestId("danger-zone-confirm-input"), "DELETE");
    await user.click(screen.getByTestId("danger-zone-confirm-btn"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("danger-zone-dialog"),
      ).not.toBeInTheDocument();
    });
    expect(
      await screen.findByTestId("danger-zone-success"),
    ).toBeInTheDocument();
  });

  it("calls DELETE /api/transactions when confirm is clicked", async () => {
    const user = userEvent.setup();
    mockApiFetch
      .mockResolvedValueOnce(accountsOkResponse)
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
      } as unknown as Response);

    renderSection();
    await user.click(screen.getByTestId("danger-zone-open-btn"));
    await user.type(screen.getByTestId("danger-zone-confirm-input"), "DELETE");
    await user.click(screen.getByTestId("danger-zone-confirm-btn"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith("/api/transactions", {
        method: "DELETE",
      });
    });
  });

  it("shows an error message when the API returns an error response", async () => {
    const user = userEvent.setup();
    mockApiFetch
      .mockResolvedValueOnce(accountsOkResponse)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      } as unknown as Response);

    renderSection();
    await user.click(screen.getByTestId("danger-zone-open-btn"));
    await user.type(screen.getByTestId("danger-zone-confirm-input"), "DELETE");
    await user.click(screen.getByTestId("danger-zone-confirm-btn"));

    expect(await screen.findByTestId("danger-zone-error")).toBeInTheDocument();
  });

  it("hides the dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByTestId("danger-zone-open-btn"));
    expect(screen.getByTestId("danger-zone-dialog")).toBeInTheDocument();

    await user.click(screen.getByTestId("danger-zone-cancel-btn"));
    expect(screen.queryByTestId("danger-zone-dialog")).not.toBeInTheDocument();
  });
});

// ── Per-account deletion tests (#770) ──────────────────────────────────────

describe("DangerZoneSection — per-account deletion (#770)", () => {
  beforeEach(() => {
    mockApiFetch.mockResolvedValue(accountsOkResponse);
  });

  it("renders the account selector dropdown", async () => {
    renderSection();
    expect(
      await screen.findByTestId("account-select-dropdown"),
    ).toBeInTheDocument();
  });

  it("populates the dropdown with accounts from API", async () => {
    renderSection();
    expect(await screen.findByText("Checking")).toBeInTheDocument();
    expect(screen.getByText("Credit Card")).toBeInTheDocument();
  });

  it("renders the Clear account data button disabled by default", async () => {
    renderSection();
    const btn = (await screen.findByTestId(
      "account-clear-btn",
    )) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("enables the Clear account data button when an account is selected", async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByTestId("account-select-dropdown");

    await user.selectOptions(
      screen.getByTestId("account-select-dropdown"),
      "acc-1",
    );

    const btn = screen.getByTestId("account-clear-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("shows confirmation dialog with account name when Clear account data is clicked", async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByTestId("account-select-dropdown");

    await user.selectOptions(
      screen.getByTestId("account-select-dropdown"),
      "acc-1",
    );
    await user.click(screen.getByTestId("account-clear-btn"));

    expect(screen.getByTestId("account-clear-dialog")).toBeInTheDocument();
    expect(screen.getByText(/Checking/)).toBeInTheDocument();
  });

  it("keeps the per-account confirm button disabled until DELETE is typed", async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByTestId("account-select-dropdown");

    await user.selectOptions(
      screen.getByTestId("account-select-dropdown"),
      "acc-1",
    );
    await user.click(screen.getByTestId("account-clear-btn"));

    const confirmBtn = screen.getByTestId(
      "account-clear-confirm-btn",
    ) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);

    await user.type(
      screen.getByTestId("account-clear-confirm-input"),
      "DELETE",
    );
    expect(confirmBtn.disabled).toBe(false);
  });

  it("calls DELETE /api/accounts/:id/transactions on confirm", async () => {
    const user = userEvent.setup();
    mockApiFetch
      .mockResolvedValueOnce(accountsOkResponse)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ deletedCount: 5 }),
      } as unknown as Response);

    renderSection();
    await screen.findByTestId("account-select-dropdown");

    await user.selectOptions(
      screen.getByTestId("account-select-dropdown"),
      "acc-1",
    );
    await user.click(screen.getByTestId("account-clear-btn"));
    await user.type(
      screen.getByTestId("account-clear-confirm-input"),
      "DELETE",
    );
    await user.click(screen.getByTestId("account-clear-confirm-btn"));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(
        "/api/accounts/acc-1/transactions",
        { method: "DELETE" },
      );
    });
  });

  it("shows success toast with deleted count and account name", async () => {
    const user = userEvent.setup();
    mockApiFetch
      .mockResolvedValueOnce(accountsOkResponse)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ deletedCount: 5 }),
      } as unknown as Response);

    renderSection();
    await screen.findByTestId("account-select-dropdown");

    await user.selectOptions(
      screen.getByTestId("account-select-dropdown"),
      "acc-1",
    );
    await user.click(screen.getByTestId("account-clear-btn"));
    await user.type(
      screen.getByTestId("account-clear-confirm-input"),
      "DELETE",
    );
    await user.click(screen.getByTestId("account-clear-confirm-btn"));

    const success = await screen.findByTestId("account-clear-success");
    expect(success).toHaveTextContent("5 transactions deleted from Checking.");
  });

  it("hides the dialog after successful deletion", async () => {
    const user = userEvent.setup();
    mockApiFetch
      .mockResolvedValueOnce(accountsOkResponse)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ deletedCount: 3 }),
      } as unknown as Response);

    renderSection();
    await screen.findByTestId("account-select-dropdown");

    await user.selectOptions(
      screen.getByTestId("account-select-dropdown"),
      "acc-2",
    );
    await user.click(screen.getByTestId("account-clear-btn"));
    await user.type(
      screen.getByTestId("account-clear-confirm-input"),
      "DELETE",
    );
    await user.click(screen.getByTestId("account-clear-confirm-btn"));

    await waitFor(() => {
      expect(
        screen.queryByTestId("account-clear-dialog"),
      ).not.toBeInTheDocument();
    });
  });

  it("shows error message when per-account API call fails", async () => {
    const user = userEvent.setup();
    mockApiFetch
      .mockResolvedValueOnce(accountsOkResponse)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" }),
      } as unknown as Response);

    renderSection();
    await screen.findByTestId("account-select-dropdown");

    await user.selectOptions(
      screen.getByTestId("account-select-dropdown"),
      "acc-1",
    );
    await user.click(screen.getByTestId("account-clear-btn"));
    await user.type(
      screen.getByTestId("account-clear-confirm-input"),
      "DELETE",
    );
    await user.click(screen.getByTestId("account-clear-confirm-btn"));

    expect(
      await screen.findByTestId("account-clear-error"),
    ).toBeInTheDocument();
  });

  it("hides the dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    renderSection();
    await screen.findByTestId("account-select-dropdown");

    await user.selectOptions(
      screen.getByTestId("account-select-dropdown"),
      "acc-1",
    );
    await user.click(screen.getByTestId("account-clear-btn"));
    expect(screen.getByTestId("account-clear-dialog")).toBeInTheDocument();

    await user.click(screen.getByTestId("account-clear-cancel-btn"));
    expect(
      screen.queryByTestId("account-clear-dialog"),
    ).not.toBeInTheDocument();
  });
});
