import { useState, useEffect } from "react";
import { useApi } from "../lib/api";
import "./SettingsPage.css";

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
      .then((data: unknown) => {
        const prefs = data as {
          alertThreshold?: number | null;
          emailAlertsEnabled?: boolean | null;
        };
        const val = prefs.alertThreshold ?? 80;
        setThreshold(val);
        setInputValue(String(val));
        // Default true if not explicitly disabled
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
      const updated = (await apiFetch("/api/preferences", {
        method: "PATCH",
        body: JSON.stringify({ alertThreshold: newVal }),
      })) as { alertThreshold?: number };
      setThreshold(updated.alertThreshold ?? newVal);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
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

// ── SettingsPage ─────────────────────────────────────────────────────────────
// Zero-prop component — all localStorage-backed props and UI removed (T011).
// Category and budget management is on the Budget page (/budget).
// Alert preferences are managed by AlertPreferencesSection above.

export function SettingsPage() {
  return (
    <div className="settings-scroll">
      <h1 className="settings-title">Settings</h1>

      {/* Section 1: App info */}
      <div className="card settings-api-notice">
        <div className="settings-api-label">◎ Finance Analyser</div>
        <div className="settings-api-body">
          Manage your budget categories and monthly targets on the{" "}
          <a href="/budget" style={{ color: "var(--accent)" }}>
            Budget page
          </a>
          . AI categorisation requires a <code>VITE_ANTHROPIC_API_KEY</code>{" "}
          environment variable.
        </div>
      </div>

      {/* Section 2: Alert Preferences */}
      <AlertPreferencesSection />
    </div>
  );
}
