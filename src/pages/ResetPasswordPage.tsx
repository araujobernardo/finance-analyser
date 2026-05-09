import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE } from "../lib/api";
import "./auth.css";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{
    type: "error" | "success";
    msg: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
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
          <h1 className="auth-heading">Invalid link</h1>
          <div className="auth-banner auth-banner--error">
            This reset link is invalid or has expired. Please request a new one.
          </div>
          <p className="auth-footer">
            <Link to="/forgot-password">Request a new link</Link>
          </p>
        </div>
      </div>
    );
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!password) e.password = "Password is required.";
    else if (password.length < 8)
      e.password = "Password must be at least 8 characters.";
    if (!confirm) e.confirm = "Please confirm your password.";
    else if (password !== confirm) e.confirm = "Passwords do not match.";
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
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setBanner({
          type: "error",
          msg: data.error ?? "Reset failed. Please try again.",
        });
        return;
      }
      setBanner({
        type: "success",
        msg: data.message ?? "Password reset successfully.",
      });
      setTimeout(() => navigate("/login"), 2000);
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
        <h1 className="auth-heading">Reset password</h1>
        <p className="auth-subheading">
          Choose a new password for your account.
        </p>

        {banner && (
          <div className={`auth-banner auth-banner--${banner.type}`}>
            {banner.msg}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="password">
              New password
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

          <div className="auth-field">
            <label className="auth-label" htmlFor="confirm">
              Confirm password
            </label>
            <input
              id="confirm"
              className={`auth-input${errors.confirm ? " auth-input--error" : ""}`}
              type="password"
              placeholder="Repeat your new password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {errors.confirm && (
              <span className="auth-field-error">{errors.confirm}</span>
            )}
          </div>

          <button
            className="auth-submit"
            type="submit"
            disabled={loading || banner?.type === "success"}
          >
            {loading ? "Resetting…" : "Reset password"}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
