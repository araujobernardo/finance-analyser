import { useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE } from "../lib/api";
import "./auth.css";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  function validate() {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Enter a valid email address.";
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
      await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      // Always show the same message regardless of whether the email exists
      setSubmitted(true);
    } catch {
      setBanner("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
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
          <h1 className="auth-heading">Check your email</h1>
          <div className="auth-info-box">
            If <strong>{email}</strong> is registered, we've sent a password
            reset link. It expires in 1 hour.
          </div>
          <p className="auth-footer">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
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
        <h1 className="auth-heading">Forgot password?</h1>
        <p className="auth-subheading">
          Enter your email and we'll send you a reset link.
        </p>

        {banner && (
          <div className="auth-banner auth-banner--error">{banner}</div>
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

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
