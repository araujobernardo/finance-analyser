import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { AuthUser } from "../context/AuthContext";
import { API_BASE } from "../lib/api";
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
      void navigate("/dashboard");
    } catch {
      setBanner({ type: "error", msg: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      {/* Option C — pill-badge logo chip: dot + wordmark */}
      <div className="auth-logo">
        <div className="auth-logo-dot" />
        <span className="auth-logo-text">
          FINANCE <span>Analyser</span>
        </span>
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
            <div className="auth-label-row">
              <label className="auth-label" htmlFor="password">
                Password
              </label>
              <Link to="/forgot-password" className="auth-forgot-link">
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
