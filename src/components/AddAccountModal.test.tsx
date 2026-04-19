import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddAccountModal } from "./AddAccountModal";
import { AccountProvider } from "../context/AccountContext";
import type { Account } from "../services/storage";

const ACCOUNTS_KEY = "finance_analyser_accounts";

function seedAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
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
});

// ── Render ─────────────────────────────────────────────────────────────────

describe("AddAccountModal — render", () => {
  it("renders the modal title", () => {
    renderModal();
    expect(
      screen.getByRole("heading", { name: /add account/i }),
    ).toBeInTheDocument();
  });

  it("renders the name input", () => {
    renderModal();
    expect(screen.getByLabelText(/account name/i)).toBeInTheDocument();
  });

  it("renders 6 colour swatches", () => {
    renderModal();
    expect(screen.getAllByRole("radio")).toHaveLength(6);
  });

  it("renders Cancel and Save buttons", () => {
    renderModal();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
  });

  it('has role="dialog" and aria-modal="true"', () => {
    renderModal();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("focuses the name input on open", () => {
    renderModal();
    expect(screen.getByLabelText(/account name/i)).toHaveFocus();
  });
});

// ── Validation ─────────────────────────────────────────────────────────────

describe("AddAccountModal — validation", () => {
  it("shows an error when saving with an empty name", async () => {
    renderModal();
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/required/i);
  });

  it("shows an error when name exceeds 40 characters", async () => {
    renderModal();
    const input = screen.getByLabelText(/account name/i);
    // Bypass maxLength to simulate a value longer than 40 chars
    await userEvent.clear(input);
    Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "A".repeat(41));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/40 characters/i);
  });

  it("shows an error for a duplicate account name (case-insensitive)", async () => {
    seedAccounts([
      {
        id: "acc-1",
        name: "Savings",
        colour: "#6366f1",
        createdAt: "",
      },
    ]);
    renderModal();
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
    renderModal(onClose);
    await userEvent.type(
      screen.getByLabelText(/account name/i),
      "Holiday Fund",
    );
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("saves the account to localStorage", async () => {
    renderModal();
    await userEvent.type(
      screen.getByLabelText(/account name/i),
      "Holiday Fund",
    );
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    const stored = JSON.parse(
      localStorage.getItem(ACCOUNTS_KEY) ?? "[]",
    ) as Account[];
    expect(stored.some((a) => a.name === "Holiday Fund")).toBe(true);
  });

  it("calls onClose when Cancel is clicked", async () => {
    const onClose = vi.fn();
    renderModal(onClose);
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("selects a swatch colour on click", async () => {
    renderModal();
    const swatches = screen.getAllByRole("radio");
    await userEvent.click(swatches[2]);
    expect(swatches[2]).toHaveAttribute("aria-checked", "true");
  });
});
