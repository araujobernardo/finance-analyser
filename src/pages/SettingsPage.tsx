import { useState } from "react";
import {
  getAccounts,
  saveAccount,
  deleteAccount,
  ACCOUNT_COLOURS,
} from "../services/storage";
import type { Account } from "../services/storage";
import "./SettingsPage.css";

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return `acct_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function nextColour(accounts: Account[]): string {
  const used = new Set(accounts.map((a) => a.colour));
  return ACCOUNT_COLOURS.find((c) => !used.has(c)) ?? ACCOUNT_COLOURS[0];
}

// ── ColourPicker ──────────────────────────────────────────────────────────────

interface ColourPickerProps {
  value: string;
  onChange: (colour: string) => void;
}

function ColourPicker({ value, onChange }: ColourPickerProps) {
  return (
    <div className="account-edit-form__colours">
      {ACCOUNT_COLOURS.map((c) => (
        <button
          key={c}
          type="button"
          className={`colour-swatch${c === value ? " colour-swatch--selected" : ""}`}
          style={{ background: c }}
          aria-label={`Select colour ${c}`}
          aria-pressed={c === value}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

// ── AccountEditForm ───────────────────────────────────────────────────────────

interface AccountEditFormProps {
  initial: { name: string; colour: string };
  onSave: (name: string, colour: string) => void;
  onCancel: () => void;
}

function AccountEditForm({ initial, onSave, onCancel }: AccountEditFormProps) {
  const [name, setName] = useState(initial.name);
  const [colour, setColour] = useState(initial.colour);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, colour);
  }

  return (
    <form className="account-edit-form" onSubmit={handleSubmit}>
      <div className="account-edit-form__row">
        <span className="account-edit-form__label">Name</span>
        <input
          className="account-edit-form__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
          aria-label="Account name"
        />
      </div>
      <div className="account-edit-form__row">
        <span className="account-edit-form__label">Colour</span>
        <ColourPicker value={colour} onChange={setColour} />
      </div>
      <div className="account-edit-form__actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn--primary"
          disabled={!name.trim()}
        >
          Save
        </button>
      </div>
    </form>
  );
}

// ── ConfirmDelete ─────────────────────────────────────────────────────────────

interface ConfirmDeleteProps {
  accountName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDelete({
  accountName,
  onConfirm,
  onCancel,
}: ConfirmDeleteProps) {
  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true">
      <div className="confirm-panel">
        <h2>Delete account?</h2>
        <p>
          This will permanently delete <strong>{accountName}</strong> and all
          its transaction data. This cannot be undone.
        </p>
        <div className="confirm-panel__actions">
          <button className="btn btn--secondary" onClick={onCancel} autoFocus>
            Cancel
          </button>
          <button className="btn btn--danger" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AccountManagementSection ──────────────────────────────────────────────────

type EditingState =
  | { type: "none" }
  | { type: "edit"; accountId: string }
  | { type: "add" };

function AccountManagementSection() {
  const [accounts, setAccounts] = useState<Account[]>(() => getAccounts());
  const [editing, setEditing] = useState<EditingState>({ type: "none" });
  const [pendingDelete, setPendingDelete] = useState<Account | null>(null);

  function refresh() {
    setAccounts(getAccounts());
  }

  function handleSaveEdit(accountId: string, name: string, colour: string) {
    const account = accounts.find((a) => a.id === accountId);
    if (!account) return;
    saveAccount({ ...account, name, colour });
    refresh();
    setEditing({ type: "none" });
  }

  function handleAdd(name: string, colour: string) {
    saveAccount({
      id: generateId(),
      name,
      colour,
      createdAt: new Date().toISOString(),
    });
    refresh();
    setEditing({ type: "none" });
  }

  function handleDelete(account: Account) {
    deleteAccount(account.id);
    refresh();
    setPendingDelete(null);
  }

  return (
    <section id="account-management">
      <div className="settings__section-header">
        <h3>Account Management</h3>
      </div>
      <div className="account-list">
        {accounts.map((account) =>
          editing.type === "edit" && editing.accountId === account.id ? (
            <AccountEditForm
              key={account.id}
              initial={{ name: account.name, colour: account.colour }}
              onSave={(name, colour) =>
                handleSaveEdit(account.id, name, colour)
              }
              onCancel={() => setEditing({ type: "none" })}
            />
          ) : (
            <div className="account-row" key={account.id}>
              <span
                className="account-row__swatch"
                style={{ background: account.colour }}
                aria-hidden="true"
              />
              <span className="account-row__name">{account.name}</span>
              <div className="account-row__actions">
                <button
                  className="icon-btn"
                  onClick={() =>
                    setEditing({ type: "edit", accountId: account.id })
                  }
                  aria-label={`Edit ${account.name}`}
                >
                  Edit
                </button>
                <button
                  className="icon-btn icon-btn--danger"
                  onClick={() => setPendingDelete(account)}
                  aria-label={`Delete ${account.name}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ),
        )}

        {editing.type === "add" && (
          <AccountEditForm
            initial={{ name: "", colour: nextColour(accounts) }}
            onSave={handleAdd}
            onCancel={() => setEditing({ type: "none" })}
          />
        )}

        {editing.type !== "add" && (
          <button
            className="btn btn--secondary add-account-btn"
            onClick={() => setEditing({ type: "add" })}
          >
            + Add Account
          </button>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDelete
          accountName={pendingDelete.name}
          onConfirm={() => handleDelete(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: "account-management", label: "Account Management" },
  { id: "category-budgets", label: "Category Budgets" },
  { id: "data-management", label: "Data Management" },
];

export function SettingsPage() {
  return (
    <>
      <div className="settings__title-row">
        <h1 className="settings__title">Settings</h1>
      </div>
      <div className="settings">
        <nav className="settings__sidebar" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="settings__sidebar-link">
              {s.label}
            </a>
          ))}
        </nav>

        <div className="settings__content">
          <AccountManagementSection />

          <section id="category-budgets">
            <div className="settings__section-header">
              <h3>Category Budgets</h3>
            </div>
            <p className="settings__section-placeholder">
              Budget settings will appear here (FA-58).
            </p>
          </section>

          <section id="data-management">
            <div className="settings__section-header">
              <h3>Data Management</h3>
            </div>
            <p className="settings__section-placeholder">
              Export and reset options will appear here (FA-59).
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
