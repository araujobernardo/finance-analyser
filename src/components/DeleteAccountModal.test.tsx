import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteAccountModal } from "./DeleteAccountModal";
import { AccountProvider } from "../context/AccountContext";
import { ACCOUNT_COLOURS } from "../services/storage";
import type { Account } from "../services/storage";

const ACCOUNTS_KEY = "finance_analyser_accounts";

function seedAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

const ACCOUNT_A: Account = {
  id: "acc-a",
  name: "Checking",
  colour: ACCOUNT_COLOURS[0],
  createdAt: "",
};

const ACCOUNT_B: Account = {
  id: "acc-b",
  name: "Savings",
  colour: ACCOUNT_COLOURS[1],
  createdAt: "",
};

function renderModal(accountId: string, onClose = vi.fn()) {
  return render(
    <AccountProvider>
      <DeleteAccountModal accountId={accountId} onClose={onClose} />
    </AccountProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

// ── Render ─────────────────────────────────────────────────────────────────

describe("DeleteAccountModal — render", () => {
  it("renders the modal title", () => {
    seedAccounts([ACCOUNT_A, ACCOUNT_B]);
    renderModal("acc-a");
    expect(
      screen.getByRole("heading", { name: /delete account/i }),
    ).toBeInTheDocument();
  });

  it("renders the account name in the body", () => {
    seedAccounts([ACCOUNT_A, ACCOUNT_B]);
    renderModal("acc-a");
    expect(screen.getByText(/checking/i)).toBeInTheDocument();
  });

  it("shows a data-loss warning when no months are stored", () => {
    seedAccounts([ACCOUNT_A, ACCOUNT_B]);
    renderModal("acc-a");
    expect(screen.getByRole("note")).toHaveTextContent(/no transaction data/i);
  });

  it("renders Cancel and Delete buttons", () => {
    seedAccounts([ACCOUNT_A, ACCOUNT_B]);
    renderModal("acc-a");
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  it('has role="dialog" and aria-modal="true"', () => {
    seedAccounts([ACCOUNT_A, ACCOUNT_B]);
    renderModal("acc-a");
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("returns null when the account does not exist", () => {
    seedAccounts([ACCOUNT_A]);
    const { container } = renderModal("non-existent");
    expect(container.firstChild).toBeNull();
  });
});

// ── Disabled state (last account) ─────────────────────────────────────────

describe("DeleteAccountModal — last account protection", () => {
  it("disables the Delete button when only one account remains", () => {
    seedAccounts([ACCOUNT_A]);
    renderModal("acc-a");
    expect(screen.getByRole("button", { name: /delete/i })).toBeDisabled();
  });

  it("has aria-disabled on the delete button for the last account", () => {
    seedAccounts([ACCOUNT_A]);
    renderModal("acc-a");
    expect(screen.getByRole("button", { name: /delete/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("enables the Delete button when multiple accounts exist", () => {
    seedAccounts([ACCOUNT_A, ACCOUNT_B]);
    renderModal("acc-a");
    expect(screen.getByRole("button", { name: /delete/i })).not.toBeDisabled();
  });
});

// ── Confirm action ─────────────────────────────────────────────────────────

describe("DeleteAccountModal — confirm action", () => {
  it("calls onClose after confirming deletion", async () => {
    seedAccounts([ACCOUNT_A, ACCOUNT_B]);
    const onClose = vi.fn();
    renderModal("acc-a", onClose);
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("removes the account from localStorage after confirming", async () => {
    seedAccounts([ACCOUNT_A, ACCOUNT_B]);
    renderModal("acc-a");
    await userEvent.click(screen.getByRole("button", { name: /delete/i }));
    const stored = JSON.parse(
      localStorage.getItem(ACCOUNTS_KEY) ?? "[]",
    ) as Account[];
    expect(stored.find((a) => a.id === "acc-a")).toBeUndefined();
  });

  it("calls onClose when Cancel is clicked", async () => {
    seedAccounts([ACCOUNT_A, ACCOUNT_B]);
    const onClose = vi.fn();
    renderModal("acc-a", onClose);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
