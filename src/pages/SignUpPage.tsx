import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";
import "./auth.css";

export function SignUpPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
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
    if (!displayName.trim()) e.displayName = "Display name is required.";
    if (!email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Enter a valid email address.";
    if (!password) e.password = "Password is required.";
    else if (password.length < 8)
      e.password = "Password must be at least 8 characters.";
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
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setBanner({
          type: "error",
          msg: data.error ?? "Registration failed. Please try again.",
        });
        return;
      }
      navigate("/verify-email-sent", { state: { email: email.trim() } });
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
        <h1 className="auth-heading">Create your account</h1>
        <p className="auth-subheading">
          Start tracking your finances in minutes.
        </p>

        {banner && (
          <div className={`auth-banner auth-banner--${banner.type}`}>
            {banner.msg}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="displayName">
              Display name
            </label>
            <input
              id="displayName"
              className={`auth-input${errors.displayName ? " auth-input--error" : ""}`}
              type="text"
              placeholder="Your name"
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            {errors.displayName && (
              <span className="auth-field-error">{errors.displayName}</span>
            )}
          </div>

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
            <label className="auth-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className={`auth-input${errors.password ? " auth-input--error" : ""}`}
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && (
              <span className="auth-field-error">{errors.password}</span>
            )}
          </div>

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
