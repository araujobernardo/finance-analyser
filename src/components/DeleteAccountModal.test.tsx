import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteAccountModal } from "./DeleteAccountModal";
import { AccountProvider } from "../context/AccountContext";
import type { ApiAccount } from "../types/api";

// ── Mock useApi ────────────────────────────────────────────────────────────

const mockApiFetch = vi.fn();
vi.mock("../lib/api", () => ({
  useApi: () => ({ apiFetch: mockApiFetch }),
  API_BASE: "",
}));

function makeApiAccount(overrides: Partial<ApiAccount> = {}): ApiAccount {
  return {
    id: "acc-a",
    userId: "user-1",
    accountNumber: "",
    nickname: "Checking",
    accountType: "Checking",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const ACCOUNT_A = makeApiAccount({ id: "acc-a", nickname: "Checking" });
const ACCOUNT_B = makeApiAccount({ id: "acc-b", nickname: "Savings" });

function renderModal(accountId: string, onClose = vi.fn()) {
  return render(
    <AccountProvider>
      <DeleteAccountModal accountId={accountId} onClose={onClose} />
    </AccountProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ── Render ─────────────────────────────────────────────────────────────────

describe("DeleteAccountModal — render", () => {
  it("renders the modal title", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accounts: [ACCOUNT_A, ACCOUNT_B] }),
    });
    renderModal("acc-a");
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /delete account/i }),
      ).toBeInTheDocument(),
    );
  });

  it("renders the account nickname in the body", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accounts: [ACCOUNT_A, ACCOUNT_B] }),
    });
    renderModal("acc-a");
    await waitFor(() =>
      expect(screen.getByText(/checking/i)).toBeInTheDocument(),
    );
  });

  it("shows a data-loss warning when no months are stored", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accounts: [ACCOUNT_A, ACCOUNT_B] }),
    });
    renderModal("acc-a");
    await waitFor(() =>
      expect(screen.getByRole("note")).toHaveTextContent(
        /no transaction data/i,
      ),
    );
  });

  it("renders Cancel and Delete buttons", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accounts: [ACCOUNT_A, ACCOUNT_B] }),
    });
    renderModal("acc-a");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /delete/i }),
      ).toBeInTheDocument();
    });
  });

  it('has role="dialog" and aria-modal="true"', async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accounts: [ACCOUNT_A, ACCOUNT_B] }),
    });
    renderModal("acc-a");
    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });
  });

  it("returns null when the account does not exist in the loaded list", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accounts: [ACCOUNT_A] }),
    });
    const { container } = renderModal("non-existent");
    // Initially loading, once loaded, account not found -> null
    await waitFor(() => expect(container.firstChild).toBeNull());
  });
});

// ── Disabled state (last account) ─────────────────────────────────────────

describe("DeleteAccountModal — last account protection", () => {
  it("disables the Delete button when only one account remains", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accounts: [ACCOUNT_A] }),
    });
    renderModal("acc-a");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /delete/i })).toBeDisabled(),
    );
  });

  it("has aria-disabled on the delete button for the last account", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accounts: [ACCOUNT_A] }),
    });
    renderModal("acc-a");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /delete/i })).toHaveAttribute(
        "aria-disabled",
        "true",
      ),
    );
  });

  it("enables the Delete button when multiple accounts exist", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accounts: [ACCOUNT_A, ACCOUNT_B] }),
    });
    renderModal("acc-a");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /delete/i }),
      ).not.toBeDisabled(),
    );
  });
});

// ── Confirm action ─────────────────────────────────────────────────────────

describe("DeleteAccountModal — confirm action", () => {
  it("calls onClose after confirming deletion", async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accounts: [ACCOUNT_A, ACCOUNT_B] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => null,
      });
    const onClose = vi.fn();
    renderModal("acc-a", onClose);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /delete/i }),
      ).not.toBeDisabled(),
    );
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Cancel is clicked", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ accounts: [ACCOUNT_A, ACCOUNT_B] }),
    });
    const onClose = vi.fn();
    renderModal("acc-a", onClose);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
