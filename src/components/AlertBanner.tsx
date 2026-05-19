// FA-BUDG-003 T006 — In-app budget alert banner
// Self-contained — no context dependency. Uses sessionStorage for dismissal.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../lib/api";
import type { AlertedCategory } from "../types/api";
import "./AlertBanner.css";

export function AlertBanner() {
  const { apiFetch } = useApi();
  const [alerts, setAlerts] = useState<AlertedCategory[] | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const todayISO = new Date().toISOString().slice(0, 10);

    // Skip fetch if already dismissed today
    if (sessionStorage.getItem("fa-budget-alert-dismissed") === todayISO) {
      return;
    }

    let cancelled = false;

    apiFetch("/api/budgets/alerts")
      .then((res) => (res.ok ? res.json() : Promise.resolve([])))
      .then((data: AlertedCategory[]) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setAlerts(data);
        }
      })
      .catch(() => {
        // Silent failure — alert banner is non-critical
      });

    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  const handleDismiss = () => {
    const todayISO = new Date().toISOString().slice(0, 10);
    sessionStorage.setItem("fa-budget-alert-dismissed", todayISO);
    setDismissed(true);
  };

  if (dismissed || !alerts || alerts.length === 0) return null;

  const categoryList = alerts
    .map((a) => `${a.categoryName}: ${Math.round(a.percentageUsed)}%`)
    .join(" · ");

  return (
    <div className="alert-banner" role="alert" data-testid="alert-banner">
      <span className="alert-banner__icon" aria-hidden="true">
        &#9888;
      </span>
      <span className="alert-banner__label">Budget alert</span>
      <span className="alert-banner__categories">{categoryList}</span>
      <Link to="/budget" className="alert-banner__cta">
        View Budget
      </Link>
      <button
        className="alert-banner__dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss budget alert"
        data-testid="alert-banner-dismiss"
      >
        &times;
      </button>
    </div>
  );
}
