// Fix #734 / FA-BUDG-003 T006 — In-app budget alert banner (Option A)
// Inline status bar with category chips.
// Dismissal is local React state only — no sessionStorage or localStorage.

import { useState, useEffect } from "react";
import { useApi } from "../lib/api";
import type { AlertedCategory, ApiUserPreferences } from "../types/api";
import "./AlertBanner.css";

export function AlertBanner() {
  const { apiFetch } = useApi();
  const [alerts, setAlerts] = useState<AlertedCategory[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchAlerts() {
      try {
        const [prefRes, alertsRes] = await Promise.all([
          apiFetch("/api/preferences"),
          apiFetch("/api/budgets/alerts"),
        ]);

        if (cancelled) return;

        const prefs = prefRes.ok
          ? ((await prefRes.json()) as ApiUserPreferences)
          : null;
        const threshold = prefs?.alertThreshold ?? 80;

        const raw = alertsRes.ok
          ? ((await alertsRes.json()) as AlertedCategory[])
          : [];

        if (!cancelled) {
          // Apply threshold client-side as safety net (API should already filter)
          const filtered = Array.isArray(raw)
            ? raw.filter((a) => a.percentageUsed >= threshold)
            : [];
          setAlerts(filtered);
        }
      } catch {
        // Silent failure — alert banner is non-critical
      }
    }

    void fetchAlerts();

    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  if (dismissed || alerts.length === 0) return null;

  return (
    <div className="alert-banner" role="alert" data-testid="alert-banner">
      {/* Left zone — icon + label */}
      <span className="alert-banner__icon" aria-hidden="true">
        &#9888;
      </span>
      <span className="alert-banner__label">Budget alert</span>

      {/* Middle zone — category chips */}
      <div className="alert-banner__chips">
        {alerts.map((a) => {
          const pct = Math.round(a.percentageUsed);
          const isCritical = a.percentageUsed > 100;
          return (
            <span
              key={a.categoryName}
              className={[
                "alert-banner__chip",
                isCritical ? "alert-banner__chip--critical" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-testid="alert-banner-chip"
            >
              {a.categoryName} {pct}%
            </span>
          );
        })}
      </div>

      {/* Right zone — dismiss button */}
      <button
        className="alert-banner__dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss budget alert"
        data-testid="alert-banner-dismiss"
      >
        Dismiss
      </button>
    </div>
  );
}
