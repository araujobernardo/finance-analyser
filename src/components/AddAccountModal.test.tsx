import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddAccountModal } from "./AddAccountModal";
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
    id: "acc-1",
    userId: "user-1",
    accountNumber: "",
    nickname: "Checking",
    accountType: "Checking",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderModal(onClose = vi.fn()) {
  return render(
    <AccountProvider>
      <AddAccountModal onClose={onClose} />
    </AccountProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  // Default: GET /api/accounts returns empty
  mockApiFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ accounts: [] }),
  });
});

// ── Render ─────────────────────────────────────────────────────────────────

describe("AddAccountModal — render", () => {
  it("renders the modal title", async () => {
    renderModal();
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /add account/i }),
      ).toBeInTheDocument(),
    );
  });

  it("renders the name input", async () => {
    renderModal();
    await waitFor(() =>
      expect(screen.getByLabelText(/account name/i)).toBeInTheDocument(),
    );
  });

  it("renders the account type select", async () => {
    renderModal();
    await waitFor(() =>
      expect(screen.getByLabelText(/account type/i)).toBeInTheDocument(),
    );
  });

  it("renders Cancel and Save buttons", async () => {
    renderModal();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /cancel/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });
  });

  it('has role="dialog" and aria-modal="true"', async () => {
    renderModal();
    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });
  });

  it("focuses the name input on open", async () => {
    renderModal();
    await waitFor(() =>
      expect(screen.getByLabelText(/account name/i)).toHaveFocus(),
    );
  });
});

// ── Validation ─────────────────────────────────────────────────────────────

describe("AddAccountModal — validation", () => {
  it("shows an error when saving with an empty name", async () => {
    renderModal();
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/required/i);
  });

  it("shows an error when name exceeds 100 characters", async () => {
    renderModal();
    const input = screen.getByLabelText(/account name/i);
    await userEvent.clear(input);
    Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "A".repeat(101));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/100 characters/i);
  });

  it("shows an error for a duplicate account name (case-insensitive)", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        accounts: [makeApiAccount({ nickname: "Savings" })],
      }),
    });
    renderModal();
    await waitFor(() => {}); // let accounts load
    await userEvent.type(screen.getByLabelText(/account name/i), "savings");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/already exists/i);
  });

  it("clears validation error as user corrects the name", async () => {
    renderModal();
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/account name/i), "Valid Name");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// ── Successful save ────────────────────────────────────────────────────────

describe("AddAccountModal — successful save", () => {
  it("calls onClose after saving a valid account", async () => {
    const onClose = vi.fn();
    // First call: GET accounts (empty), second call: POST new account
    mockApiFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ accounts: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () =>
          makeApiAccount({ id: "new-1", nickname: "Holiday Fund" }),
      });
    renderModal(onClose);
    await userEvent.type(
      screen.getByLabelText(/account name/i),
      "Holiday Fund",
    );
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = vi.fn();
    renderModal(onClose);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
