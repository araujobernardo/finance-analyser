import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../context/AuthContext";
import { API_BASE } from "../lib/api";
import { getAccounts } from "../services/storage";
import "./auth.css";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{
    type: "error" | "success";
    msg: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  function validate() {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = "Email is required.";
    if (!password) e.password = "Password is required.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json()) as {
        token?: string;
        user?: AuthUser;
        error?: string;
      };
      if (!res.ok) {
        setBanner({
          type: "error",
          msg: data.error ?? "Sign in failed. Please try again.",
        });
        return;
      }
      login(data.token!, data.user!);

      // Migration detection: decide whether to route to /migrate or /dashboard.
      // Cloud account presence is the source of truth — the fa-migration-complete
      // flag alone is not trusted, because it may have been set without the data
      // actually being transferred (bug #680).
      try {
        const cloudRes = await fetch(`${API_BASE}/api/accounts`, {
          headers: { Authorization: `Bearer ${data.token!}` },
        });
        if (cloudRes.ok) {
          const json = (await cloudRes.json()) as { accounts: unknown[] };
          if (json.accounts.length > 0) {
            // Cloud has data — genuinely migrated, go to dashboard
            void navigate("/dashboard");
            return;
          }
        }
        // Cloud is empty: check whether there is anything in localStorage to migrate
        const localAccounts = getAccounts();
        if (localAccounts.length === 0) {
          // No local data either — new user, go to dashboard
          void navigate("/dashboard");
          return;
        }
        // Local data exists but cloud is empty — migration is required,
        // regardless of whether fa-migration-complete was previously set
        void navigate("/migrate");
      } catch {
        void navigate("/dashboard");
      }
      return;
    } catch {
      setBanner({ type: "error", msg: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-logo">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        Finance Analyser
      </div>

      <div className="auth-card">
        <h1 className="auth-heading">Sign in</h1>
        <p className="auth-subheading">Welcome back.</p>

        {banner && (
          <div className={`auth-banner auth-banner--${banner.type}`}>
            {banner.msg}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={`auth-input${errors.email ? " auth-input--error" : ""}`}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && (
              <span className="auth-field-error">{errors.email}</span>
            )}
          </div>

          <div className="auth-field">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <label className="auth-label" htmlFor="password">
                Password
              </label>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  textDecoration: "none",
                }}
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              className={`auth-input${errors.password ? " auth-input--error" : ""}`}
              type="password"
              placeholder="Your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && (
              <span className="auth-field-error">{errors.password}</span>
            )}
          </div>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}
