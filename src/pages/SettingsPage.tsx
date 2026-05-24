import { useState, useEffect, useCallback } from "react";
import { useApi } from "../lib/api";
import "./SettingsPage.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  userId: string;
  name: string;
  colour: string;
  createdAt: string;
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
  const [showDialog, setShowDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const isConfirmed = confirmText === "DELETE";

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
    </div>
  );
}

// ── SettingsPage ─────────────────────────────────────────────────────────────
// Layout (top to bottom): Alert Preferences → Categories → Danger Zone.
// The top info card was removed per user decision (#769 UX brief, Option A).

export function SettingsPage() {
  return (
    <div className="settings-scroll">
      <h1 className="settings-title">Settings</h1>
      <AlertPreferencesSection />
      <CategoriesSection />
      <DangerZoneSection />
    </div>
  );
}
