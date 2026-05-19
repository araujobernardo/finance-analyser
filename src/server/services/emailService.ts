import { Resend } from "resend";

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  return new Resend(apiKey);
}

export function fromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) throw new Error("RESEND_FROM_EMAIL is not set");
  return from;
}

export function appUrl(): string {
  return process.env.APP_URL ?? "http://localhost:5173";
}

export async function sendVerificationEmail(
  email: string,
  rawToken: string,
): Promise<void> {
  const resend = getResendClient();
  const link = `${appUrl()}/verify-email?token=${rawToken}`;
  await resend.emails.send({
    from: fromAddress(),
    to: email,
    subject: "Verify your Finance Analyser email",
    html: `<p>Click the link below to verify your email address. The link expires in 24 hours.</p>
<p><a href="${link}">${link}</a></p>`,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  rawToken: string,
): Promise<void> {
  const resend = getResendClient();
  const link = `${appUrl()}/reset-password?token=${rawToken}`;
  await resend.emails.send({
    from: fromAddress(),
    to: email,
    subject: "Reset your Finance Analyser password",
    html: `<p>Click the link below to reset your password. The link expires in 1 hour.</p>
<p><a href="${link}">${link}</a></p>
<p>If you did not request a password reset, you can ignore this email.</p>`,
  });
}
