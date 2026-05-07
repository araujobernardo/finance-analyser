import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import "./auth.css";

function SentConfirmation({ email }: { email?: string }) {
  const [resendStatus, setResendStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  async function handleResend() {
    if (!email) return;
    setResendStatus("sending");
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResendStatus("sent");
    } catch {
      setResendStatus("error");
    }
  }

  return (
    <div className="auth-card">
      <h1 className="auth-heading">Check your email</h1>
      <p className="auth-subheading">
        We've sent a verification link to your inbox.
      </p>

      <div className="auth-info-box">
        {email ? (
          <>
            We sent a link to <strong>{email}</strong>. Click it to verify your
            address and activate your account.
          </>
        ) : (
          <>Click the link in the email we sent you to verify your address.</>
        )}{" "}
        The link expires in 24 hours.
      </div>

      {resendStatus === "sent" && (
        <div className="auth-banner auth-banner--success">
          A new link has been sent.
        </div>
      )}
      {resendStatus === "error" && (
        <div className="auth-banner auth-banner--error">
          Something went wrong. Please try again.
        </div>
      )}

      <p className="auth-footer">
        Didn't receive it?{" "}
        <button
          className="auth-link"
          onClick={handleResend}
          disabled={resendStatus === "sending" || resendStatus === "sent"}
        >
          {resendStatus === "sending" ? "Sending…" : "Resend email"}
        </button>
      </p>
      <p className="auth-footer" style={{ marginTop: 8 }}>
        <Link to="/login">Back to sign in</Link>
      </p>
    </div>
  );
}

function TokenVerification({ token }: { token: string }) {
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function verify() {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as { message?: string; error?: string };
        if (res.ok) {
          setStatus("success");
          setMessage(data.message ?? "Email verified.");
        } else {
          setStatus("error");
          setMessage(
            data.error ?? "The verification link is invalid or has expired.",
          );
        }
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    }
    verify();
  }, [token]);

  return (
    <div className="auth-card">
      <h1 className="auth-heading">Email verification</h1>

      {status === "verifying" && (
        <p className="auth-subheading">Verifying your email address…</p>
      )}
      {status === "success" && (
        <>
          <div className="auth-banner auth-banner--success">{message}</div>
          <Link
            to="/login"
            className="auth-submit"
            style={{
              display: "block",
              textAlign: "center",
              textDecoration: "none",
              marginTop: 4,
            }}
          >
            Sign in
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <div className="auth-banner auth-banner--error">{message}</div>
          <p className="auth-footer">
            <Link to="/login">Back to sign in</Link>
          </p>
        </>
      )}
    </div>
  );
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const token = searchParams.get("token");
  const emailFromNav = (location.state as { email?: string } | null)?.email;

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

      {token ? (
        <TokenVerification token={token} />
      ) : (
        <SentConfirmation email={emailFromNav} />
      )}
    </div>
  );
}
