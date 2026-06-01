import { useState, useEffect, useCallback } from "react";
import { useApi } from "../lib/api";
import { useBankContext } from "../context/BankContext";
import { useAccount } from "../context/AccountContext";
import type { ApiAkahuAccountLink } from "../types/api";
import "./SettingsPage.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  userId: string;
  name: string;
  colour: string;
  createdAt: string;
}

interface Account {
  id: string;
  nickname: string;
}

// ── AlertPreferencesSection ──────────────────────────────────────────────────
// Self-contained: fetches /api/preferences directly via useApi.

export function AlertPreferencesSection() {
  const { apiFetch } = useApi();

  // ── Alert threshold state (T014) ─────────────────────────────────────────
  const [threshold, setThreshold] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [validationError, setValidationError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  // ── Email alerts toggle state (T016) ─────────────────────────────────────
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [emailToggleSaving, setEmailToggleSaving] = useState(false);

  useEffect(() => {
    apiFetch("/api/preferences")
      .then(async (res) => {
        if (!res.ok) return;
        const prefs = (await res.json()) as {
          alertThreshold?: number | null;
          emailAlertsEnabled?: boolean | null;
        };
        const val = prefs.alertThreshold ?? 80;
        setThreshold(val);
        setInputValue(String(val));
        setEmailAlertsEnabled(prefs.emailAlertsEnabled !== false);
      })
      .catch(() => {
        // Leave inputs at defaults on fetch error; user can still interact
      });
    // apiFetch identity is stable per render — exhaustive-deps would cause an
    // infinite loop if apiFetch were inadvertently recreated on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = (raw: string): string => {
    const n = Number(raw);
    if (raw.trim() === "" || !Number.isInteger(n))
      return "Enter a whole number between 50 and 100";
    if (n < 50 || n > 100) return "Threshold must be between 50 and 100";
    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
    setValidationError(validate(raw));
    setSaveStatus("idle");
  };

  const handleBlur = async () => {
    const error = validate(inputValue);
    if (error) {
      setValidationError(error);
      return;
    }
    const newVal = Number(inputValue);
    if (newVal === threshold) return; // no change

    setSaveStatus("saving");
    try {
      const res = await apiFetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertThreshold: newVal }),
      });
      if (res.ok) {
        const updated = (await res.json()) as { alertThreshold?: number };
        setThreshold(updated.alertThreshold ?? newVal);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("idle");
        setValidationError("Failed to save — please try again");
      }
    } catch {
      setSaveStatus("idle");
      setValidationError("Failed to save — please try again");
    }
  };

  const handleEmailToggle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.checked;
    setEmailAlertsEnabled(newVal); // optimistic update
    setEmailToggleSaving(true);
    try {
      await apiFetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailAlertsEnabled: newVal }),
      });
    } catch {
      // Roll back optimistic update on error
      setEmailAlertsEnabled(!newVal);
    } finally {
      setEmailToggleSaving(false);
    }
  };

  return (
    <div
      className="card settings-section"
      data-testid="alert-preferences-section"
    >
      <div className="settings-section-title">Alert Preferences</div>
      <div className="settings-section-sub">
        Set the budget usage percentage at which an alert banner appears. Must
        be a whole number between 50 and 100.
      </div>

      <div className="settings-alert-row">
        <label htmlFor="alert-threshold" className="settings-alert-label">
          Alert threshold (%)
        </label>
        <input
          id="alert-threshold"
          type="number"
          min={50}
          max={100}
          step={1}
          className="settings-input settings-alert-input mono"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          data-testid="alert-threshold-input"
          aria-describedby={
            validationError ? "alert-threshold-error" : undefined
          }
        />
        {saveStatus === "saving" && (
          <span className="settings-alert-status settings-alert-saving">
            Saving…
          </span>
        )}
        {saveStatus === "saved" && (
          <span className="settings-alert-status settings-alert-saved">
            ✓ Saved
          </span>
        )}
      </div>

      {validationError && (
        <div
          id="alert-threshold-error"
          className="settings-alert-error"
          data-testid="alert-threshold-error"
          role="alert"
        >
          {validationError}
        </div>
      )}

      <div className="settings-alert-toggle-row">
        <label
          htmlFor="email-alerts-toggle"
          className="settings-alert-toggle-label"
        >
          <input
            id="email-alerts-toggle"
            type="checkbox"
            className="settings-alert-checkbox"
            checked={emailAlertsEnabled}
            onChange={handleEmailToggle}
            disabled={emailToggleSaving}
            data-testid="email-alerts-toggle"
          />
          <span>Send email alerts when a budget is exceeded</span>
        </label>
        {emailToggleSaving && (
          <span className="settings-alert-status settings-alert-saving">
            Saving…
          </span>
        )}
      </div>
    </div>
  );
}

// ── CategoriesSection ─────────────────────────────────────────────────────────

export function CategoriesSection() {
  const { apiFetch } = useApi();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Add-new form state
  const [newName, setNewName] = useState("");
  const [newColour, setNewColour] = useState("#6366f1");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  // Inline rename state: maps category id → draft name
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [renaming, setRenaming] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try {
      const res = await apiFetch("/api/categories");
      if (res.ok) {
        const data = (await res.json()) as { categories: Category[] };
        setItems(data.categories);
      }
    } catch {
      // silently fail — empty state shown
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) {
      setAddError("Name is required");
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      const res = await apiFetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, colour: newColour }),
      });
      if (res.ok) {
        const created = (await res.json()) as Category;
        setItems((prev) => [...prev, created]);
        setNewName("");
        setNewColour("#6366f1");
      } else {
        const err = (await res.json()) as { error?: string };
        setAddError(err.error ?? "Failed to add category");
      }
    } catch {
      setAddError("Failed to add category");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // silently fail — item stays in list
    }
  };

  const handleRenameBlur = async (id: string, originalName: string) => {
    const draft = renameDrafts[id];
    if (draft === undefined || draft.trim() === originalName) return;
    const name = draft.trim();
    if (!name) return;
    setRenaming((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await apiFetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Category;
        setItems((prev) => prev.map((c) => (c.id === id ? updated : c)));
        setRenameDrafts((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    } catch {
      // silently fail — draft stays so user can retry
    } finally {
      setRenaming((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleColourChange = async (id: string, colour: string) => {
    try {
      const res = await apiFetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colour }),
      });
      if (res.ok) {
        const updated = (await res.json()) as Category;
        setItems((prev) => prev.map((c) => (c.id === id ? updated : c)));
      }
    } catch {
      // silently fail — colour reverts on next load
    }
  };

  return (
    <div className="card settings-section" data-testid="categories-section">
      <div className="settings-section-title">Categories</div>
      <div className="settings-section-sub">
        Manage spending categories. Deleting a category removes the label from
        existing transactions but does not delete them.
      </div>

      {loading ? (
        <div className="settings-cat-empty">Loading…</div>
      ) : items.length === 0 ? (
        <div className="settings-cat-empty" data-testid="categories-empty">
          No categories yet. Add one below.
        </div>
      ) : (
        <ul className="settings-cat-list" data-testid="categories-list">
          {items.map((cat) => (
            <li key={cat.id} className="settings-cat-row">
              <input
                type="color"
                className="settings-color-picker"
                value={cat.colour}
                aria-label={`Colour for ${cat.name}`}
                onChange={(e) =>
                  void handleColourChange(cat.id, e.target.value)
                }
                data-testid={`category-colour-${cat.id}`}
              />
              <input
                type="text"
                className="settings-input settings-cat-name-input"
                value={renameDrafts[cat.id] ?? cat.name}
                aria-label={`Rename category ${cat.name}`}
                onChange={(e) =>
                  setRenameDrafts((prev) => ({
                    ...prev,
                    [cat.id]: e.target.value,
                  }))
                }
                onBlur={() => void handleRenameBlur(cat.id, cat.name)}
                disabled={renaming[cat.id] ?? false}
                data-testid={`category-name-${cat.id}`}
              />
              <button
                type="button"
                className="settings-delete-btn"
                aria-label={`Delete category ${cat.name}`}
                onClick={() => void handleDelete(cat.id)}
                data-testid={`category-delete-${cat.id}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add new category */}
      <div className="settings-add-row" data-testid="category-add-row">
        <input
          type="color"
          className="settings-color-picker"
          value={newColour}
          aria-label="New category colour"
          onChange={(e) => setNewColour(e.target.value)}
          data-testid="category-new-colour"
        />
        <input
          type="text"
          className="settings-input settings-add-input"
          placeholder="New category name"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            if (addError) setAddError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleAdd();
          }}
          data-testid="category-new-name"
          aria-label="New category name"
        />
        <button
          type="button"
          className="btn-accent"
          onClick={() => void handleAdd()}
          disabled={adding}
          data-testid="category-add-btn"
        >
          {adding ? "Saving…" : "Add"}
        </button>
      </div>
      {addError && (
        <div
          className="settings-alert-error"
          role="alert"
          data-testid="category-add-error"
        >
          {addError}
        </div>
      )}
    </div>
  );
}

// ── DangerZoneSection ─────────────────────────────────────────────────────────

export function DangerZoneSection() {
  const { apiFetch } = useApi();

  // Global delete state
  const [showDialog, setShowDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Per-account delete state
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [accountConfirmText, setAccountConfirmText] = useState("");
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [accountSuccessMsg, setAccountSuccessMsg] = useState("");
  const [accountErrorMsg, setAccountErrorMsg] = useState("");

  useEffect(() => {
    apiFetch("/api/accounts")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { accounts: Account[] };
        setAccounts(data.accounts);
      })
      .catch(() => {
        // silently fail — dropdown stays empty
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const isConfirmed = confirmText === "DELETE";
  const isAccountConfirmed = accountConfirmText === "DELETE";

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setDeleting(true);
    setErrorMsg("");
    try {
      const res = await apiFetch("/api/transactions", { method: "DELETE" });
      if (res.ok || res.status === 204) {
        setShowDialog(false);
        setConfirmText("");
        setSuccessMsg("All transactions deleted successfully.");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        const err = (await res.json()) as { error?: string };
        setErrorMsg(err.error ?? "Failed to delete transactions");
      }
    } catch {
      setErrorMsg("Failed to delete transactions");
    } finally {
      setDeleting(false);
    }
  };

  const handleAccountDelete = async () => {
    if (!isAccountConfirmed || !selectedAccount) return;
    setAccountDeleting(true);
    setAccountErrorMsg("");
    try {
      const res = await apiFetch(
        `/api/accounts/${selectedAccount.id}/transactions`,
        { method: "DELETE" },
      );
      if (res.ok) {
        const data = (await res.json()) as { deletedCount: number };
        setShowAccountDialog(false);
        setAccountConfirmText("");
        setSelectedAccountId("");
        setAccountSuccessMsg(
          `${data.deletedCount} transaction${data.deletedCount === 1 ? "" : "s"} deleted from ${selectedAccount.nickname}.`,
        );
        setTimeout(() => setAccountSuccessMsg(""), 4000);
      } else {
        const err = (await res.json()) as { error?: string };
        setAccountErrorMsg(err.error ?? "Failed to delete transactions");
      }
    } catch {
      setAccountErrorMsg("Failed to delete transactions");
    } finally {
      setAccountDeleting(false);
    }
  };

  return (
    <div
      className="card settings-section settings-danger-zone"
      data-testid="danger-zone-section"
    >
      <div className="settings-section-title settings-danger-title">
        Danger Zone
      </div>
      <div className="settings-section-sub">
        Permanently delete all your transaction data. Your accounts will be
        preserved but all transaction history will be gone.
      </div>

      {successMsg && (
        <div
          className="settings-danger-success"
          role="status"
          data-testid="danger-zone-success"
        >
          {successMsg}
        </div>
      )}

      {!showDialog ? (
        <div>
          <button
            type="button"
            className="btn-danger"
            onClick={() => setShowDialog(true)}
            data-testid="danger-zone-open-btn"
          >
            Delete all transactions
          </button>
        </div>
      ) : (
        <div
          className="settings-danger-confirm"
          data-testid="danger-zone-dialog"
        >
          <p className="settings-danger-prompt">
            Type <strong>DELETE</strong> to confirm:
          </p>
          <div className="settings-danger-confirm-row">
            <input
              type="text"
              className="settings-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              autoFocus
              data-testid="danger-zone-confirm-input"
              aria-label="Type DELETE to confirm"
            />
            <button
              type="button"
              className="btn-danger"
              disabled={!isConfirmed || deleting}
              onClick={() => void handleDelete()}
              data-testid="danger-zone-confirm-btn"
            >
              {deleting ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setShowDialog(false);
                setConfirmText("");
                setErrorMsg("");
              }}
              data-testid="danger-zone-cancel-btn"
            >
              Cancel
            </button>
          </div>
          {errorMsg && (
            <div
              className="settings-alert-error"
              role="alert"
              data-testid="danger-zone-error"
            >
              {errorMsg}
            </div>
          )}
        </div>
      )}

      <hr className="settings-danger-divider" />

      {/* Per-account deletion */}
      <div className="settings-section-sub">
        Clear one account's transactions:
      </div>

      {accountSuccessMsg && (
        <div
          className="settings-danger-success"
          role="status"
          data-testid="account-clear-success"
        >
          {accountSuccessMsg}
        </div>
      )}

      {!showAccountDialog ? (
        <div className="settings-danger-account-row">
          <select
            className="settings-input settings-danger-account-select"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            data-testid="account-select-dropdown"
            aria-label="Select account to clear"
          >
            <option value="">Select an account…</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nickname}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn-danger"
            disabled={!selectedAccountId}
            onClick={() => setShowAccountDialog(true)}
            data-testid="account-clear-btn"
          >
            Clear account data
          </button>
        </div>
      ) : (
        <div
          className="settings-danger-confirm"
          data-testid="account-clear-dialog"
        >
          <p className="settings-danger-prompt">
            Delete all transactions for{" "}
            <strong>{selectedAccount?.nickname}</strong>? Type{" "}
            <strong>DELETE</strong> to confirm:
          </p>
          <div className="settings-danger-confirm-row">
            <input
              type="text"
              className="settings-input"
              value={accountConfirmText}
              onChange={(e) => setAccountConfirmText(e.target.value)}
              placeholder="DELETE"
              autoFocus
              data-testid="account-clear-confirm-input"
              aria-label="Type DELETE to confirm"
            />
            <button
              type="button"
              className="btn-danger"
              disabled={!isAccountConfirmed || accountDeleting}
              onClick={() => void handleAccountDelete()}
              data-testid="account-clear-confirm-btn"
            >
              {accountDeleting ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setShowAccountDialog(false);
                setAccountConfirmText("");
                setAccountErrorMsg("");
              }}
              data-testid="account-clear-cancel-btn"
            >
              Cancel
            </button>
          </div>
          {accountErrorMsg && (
            <div
              className="settings-alert-error"
              role="alert"
              data-testid="account-clear-error"
            >
              {accountErrorMsg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── BankConnectionSection ─────────────────────────────────────────────────────
// Embedded in Settings page between Categories and Danger Zone.
// Credentials come from server env vars (#875) — no credential inputs here.

function AccountMappingRow({ link }: { link: ApiAkahuAccountLink }) {
  const { linkAccount, unlinkAccount } = useBankContext();
  const { accounts } = useAccount();

  function formatBalance(): string {
    if (link.lastBalance === null) return "—";
    return `NZD ${parseFloat(link.lastBalance).toFixed(2)}`;
  }

  function formatDate(iso: string | null): string {
    if (!iso) return "Not yet synced";
    return new Date(iso).toLocaleDateString("en-NZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  async function handleLinkChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value === "") {
      await unlinkAccount(link.akahuAccountId);
    } else {
      const selectedAccount = accounts.find((a) => a.id === value);
      const accountName = selectedAccount?.nickname ?? link.akahuAccountName;
      await linkAccount(link.akahuAccountId, value, accountName);
    }
  }

  const statusMap: Record<string, { className: string; label: string }> = {
    active: {
      className: "settings-bank-badge settings-bank-badge--active",
      label: "Active",
    },
    syncing: {
      className: "settings-bank-badge settings-bank-badge--syncing",
      label: "Syncing…",
    },
    error: {
      className: "settings-bank-badge settings-bank-badge--error",
      label: "Error",
    },
    disconnected: {
      className: "settings-bank-badge settings-bank-badge--disconnected",
      label: "Disconnected",
    },
  };
  const statusEntry = statusMap[link.syncStatus] ?? statusMap["active"]!;

  return (
    <tr className="settings-bank-mapping-row" data-testid="account-mapping-row">
      <td>
        <div
          className="settings-bank-mapping-name"
          data-testid="akahu-account-name"
        >
          {link.akahuAccountName}
        </div>
        <div className="settings-bank-mapping-type">
          {link.akahuAccountType ?? "—"}
        </div>
      </td>
      <td data-testid="akahu-balance">{formatBalance()}</td>
      <td data-testid="akahu-last-synced">
        {formatDate(link.lastTransactionSyncedAt)}
      </td>
      <td>
        <select
          className="settings-bank-select"
          value={link.financeAccountId ?? ""}
          onChange={(e) => void handleLinkChange(e)}
          data-testid="account-link-select"
        >
          <option value="">Not linked</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nickname}
            </option>
          ))}
        </select>
      </td>
      <td>
        <span className={statusEntry.className} data-testid="sync-status-badge">
          {statusEntry.label}
        </span>
        {link.syncStatus === "error" && link.syncError && (
          <div
            className="settings-bank-sync-error-text"
            data-testid="sync-error-text"
          >
            {link.syncError}
          </div>
        )}
      </td>
    </tr>
  );
}

export function BankConnectionSection() {
  const {
    connection,
    accountLinks,
    isLoading,
    isSyncing,
    lastSyncResult,
    error,
    connect,
    disconnect,
    syncNow,
  } = useBankContext();

  const [connectError, setConnectError] = useState<string | null>(null);

  function formatDate(iso: string | null): string {
    if (!iso) return "Never synced";
    return new Date(iso).toLocaleDateString("en-NZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  async function handleConnect() {
    setConnectError(null);
    const ok = await connect();
    if (!ok) {
      setConnectError(
        error ?? "Bank connection is not configured on the server",
      );
    }
  }

  async function handleDisconnect() {
    const confirmed = window.confirm(
      "Disconnect your Akahu account? This will remove all account links.",
    );
    if (confirmed) {
      await disconnect();
    }
  }

  return (
    <div
      className="card settings-section"
      data-testid="bank-connection-section"
    >
      <div className="settings-section-title">Bank Connection</div>
      <div className="settings-section-sub">
        Connect to Akahu to automatically sync your bank transactions.
        Credentials are held securely on the server — nothing is stored in your
        browser.
      </div>

      {/* Error from context (network / API errors) */}
      {error && !connectError && (
        <div className="settings-bank-error" data-testid="bank-error">
          {error}
        </div>
      )}

      {connection !== null ? (
        <>
          {/* Connected state */}
          <div
            className="settings-bank-status-row"
            data-testid="connection-status-card"
          >
            <span className="settings-bank-status-dot settings-bank-status-dot--connected" />
            <span className="settings-bank-status-label">
              Connected to Akahu
            </span>
          </div>
          <dl className="settings-bank-meta">
            <dt>Connected since</dt>
            <dd data-testid="connected-at">
              {formatDate(connection.connectedAt)}
            </dd>
            <dt>Last synced</dt>
            <dd data-testid="last-synced-at">
              {formatDate(connection.lastSyncedAt)}
            </dd>
          </dl>
          <div>
            <button
              type="button"
              className="btn-danger"
              onClick={() => void handleDisconnect()}
              disabled={isLoading}
              data-testid="disconnect-btn"
            >
              Disconnect
            </button>
          </div>

          {/* Account mapping */}
          <div data-testid="account-mapping-list">
            <div className="settings-section-sub" style={{ marginBottom: 6 }}>
              Your Akahu Accounts
            </div>
            {accountLinks.length === 0 ? (
              <p
                className="settings-bank-empty-state"
                data-testid="no-accounts-message"
              >
                No Akahu accounts found. Try syncing first.
              </p>
            ) : (
              <table className="settings-bank-mapping-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Balance</th>
                    <th>Last synced</th>
                    <th>Link to</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {accountLinks.map((link) => (
                    <AccountMappingRow key={link.akahuAccountId} link={link} />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Sync controls — only when there are linked accounts */}
          {accountLinks.length > 0 && (
            <div data-testid="sync-controls">
              <div className="settings-bank-sync-row">
                <button
                  type="button"
                  className="btn-accent"
                  onClick={() => void syncNow()}
                  disabled={isSyncing}
                  data-testid="sync-now-btn"
                >
                  {isSyncing ? (
                    <>
                      <span
                        className="settings-bank-spinner"
                        data-testid="sync-spinner"
                        aria-label="Syncing"
                      />
                      Syncing…
                    </>
                  ) : (
                    "Sync now"
                  )}
                </button>
              </div>

              {lastSyncResult !== null && (
                <div
                  className="settings-bank-sync-result"
                  data-testid="sync-result"
                >
                  {lastSyncResult.transactionsAdded > 0 ? (
                    <p data-testid="sync-result-text">
                      Synced {lastSyncResult.transactionsAdded} new transaction
                      {lastSyncResult.transactionsAdded !== 1
                        ? "s"
                        : ""} across {lastSyncResult.accountsSynced} account
                      {lastSyncResult.accountsSynced !== 1 ? "s" : ""}
                    </p>
                  ) : (
                    <p data-testid="sync-result-text">
                      No new transactions found
                    </p>
                  )}
                  {lastSyncResult.errors.length > 0 && (
                    <ul
                      className="settings-bank-sync-errors"
                      data-testid="sync-error-list"
                    >
                      {lastSyncResult.errors.map((e, i) => (
                        <li key={i}>
                          {e.accountId}: {e.error}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <p
                className="settings-bank-security-note"
                data-testid="security-note"
              >
                Finance Analyser connects to your bank via Akahu, New Zealand's
                regulated open finance platform. Your bank login credentials are
                never shared with or stored by Finance Analyser. You can
                disconnect at any time by clicking Disconnect above or by
                visiting my.akahu.nz.
              </p>
            </div>
          )}
        </>
      ) : (
        /* Disconnected state */
        <div
          className="settings-bank-connect-row"
          data-testid="connect-form-card"
        >
          {connectError && (
            <div className="settings-bank-error" data-testid="connect-error">
              {connectError}
            </div>
          )}
          <div>
            <button
              type="button"
              className="btn-accent"
              onClick={() => void handleConnect()}
              disabled={isLoading}
              data-testid="connect-submit-btn"
            >
              {isLoading ? "Connecting…" : "Connect to Akahu"}
            </button>
          </div>
          <p className="settings-bank-privacy-note" data-testid="privacy-note">
            Your bank credentials are never stored. The connection uses tokens
            held securely on the server.
          </p>
        </div>
      )}
    </div>
  );
}

// ── AccountConnectionsSection ─────────────────────────────────────────────────
// Read-only overview card: Finance Analyser accounts with their linked Akahu
// bank account name, balance, and linked/not-linked status.
// Only rendered when the user has at least one Finance Analyser account.

export function AccountConnectionsSection() {
  const { accounts } = useAccount();
  const { accountLinks } = useBankContext();

  if (accounts.length === 0) return null;

  const linkedCount = accounts.filter((account) =>
    accountLinks.some((link) => link.financeAccountId === account.id),
  ).length;

  const totalCount = accounts.length;

  function getLink(accountId: string): ApiAkahuAccountLink | undefined {
    return accountLinks.find((link) => link.financeAccountId === accountId);
  }

  function formatBalance(lastBalance: string | null): string {
    if (lastBalance === null) return "—";
    const n = parseFloat(lastBalance);
    return `NZD ${n.toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <div
      className="card settings-section"
      data-testid="account-connections-section"
    >
      <div className="settings-section-title">Account Connections</div>
      <div className="settings-section-sub">
        Your Finance Analyser accounts and their linked bank accounts.
      </div>

      <table className="settings-bank-mapping-table">
        <thead>
          <tr>
            <th>Your account</th>
            <th>Bank account</th>
            <th>Balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => {
            const link = getLink(account.id);
            const isLinked = link !== undefined;
            return (
              <tr
                key={account.id}
                className="settings-bank-mapping-row"
                data-testid="account-connection-row"
              >
                <td>
                  <div className="settings-bank-mapping-name">
                    {account.nickname}
                  </div>
                  <div className="settings-bank-mapping-type">
                    {account.accountType}
                  </div>
                </td>
                <td data-testid="connection-bank-account">
                  {isLinked ? link.akahuAccountName : "—"}
                </td>
                <td data-testid="connection-balance">
                  {isLinked ? formatBalance(link.lastBalance) : "—"}
                </td>
                <td>
                  {isLinked ? (
                    <span
                      className="settings-bank-badge settings-bank-badge--active"
                      data-testid="connection-linked-badge"
                    >
                      Linked
                    </span>
                  ) : (
                    <span
                      className="settings-bank-badge settings-bank-badge--disconnected"
                      data-testid="connection-not-linked-badge"
                    >
                      Not linked
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr data-testid="account-connections-summary">
            <td colSpan={4} className="settings-section-sub">
              {linkedCount} of {totalCount} account
              {totalCount !== 1 ? "s" : ""} linked — link accounts in Bank
              Connection above
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── SettingsPage ─────────────────────────────────────────────────────────────
// Layout (top to bottom): Alert Preferences → Categories → Bank Connection → Account Connections → Danger Zone.
// The top info card was removed per user decision (#769 UX brief, Option A).

export function SettingsPage() {
  return (
    <div className="settings-scroll">
      <h1 className="settings-title">Settings</h1>
      <AlertPreferencesSection />
      <CategoriesSection />
      <BankConnectionSection />
      <AccountConnectionsSection />
      <DangerZoneSection />
    </div>
  );
}
