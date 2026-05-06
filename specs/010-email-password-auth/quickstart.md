# Quickstart: Email and Password Authentication

**Branch**: `010-email-password-auth` | **Date**: 2026-05-06

**Prerequisites**: Features 008 (Drizzle + PostgreSQL) and 009 (Express server) must be merged and their `.env` values already configured.

---

## Local Development Setup

### Step 1 — Install new dependencies

```bash
npm install bcrypt jsonwebtoken resend
npm install -D @types/bcrypt @types/jsonwebtoken
```

### Step 2 — Configure environment variables

Add these entries to your `.env` file (copy from `.env.example`):

```env
# Feature 010 — Authentication
JWT_SECRET=your-secret-key-minimum-32-characters-long
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=auth@yourdomain.com
APP_URL=http://localhost:5173
```

**JWT_SECRET**: Generate a secure value with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**RESEND_API_KEY**: Obtain from [resend.com](https://resend.com) → API Keys. The free tier allows 100 emails/day.

**RESEND_FROM_EMAIL**: Must be a verified sender address in your Resend account. For local testing, use [Resend's test address](https://resend.com/docs/dashboard/emails/send-test-emails) to avoid sending real emails.

**APP_URL**: Set to `http://localhost:5173` for local development (the Vite dev server). The server uses this to build the verification and reset links in emails.

### Step 3 — Apply the database migration

This feature adds 5 new columns to the `users` table. Apply the migration before starting the server:

```bash
npm run db:migrate
```

Confirm success: the `users` table in your Supabase project should now have `email_verified`, `verification_token`, `verification_token_expires_at`, `reset_token`, `reset_token_expires_at` columns.

### Step 4 — Start the development servers

In one terminal (Express API server):

```bash
npm run server:dev
```

In another terminal (Vite React frontend):

```bash
npm run dev
```

### Step 5 — Smoke test the auth endpoints

```bash
# Register a new account
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","displayName":"Test User","password":"password123"}'
# → 201 { "message": "Registration successful. Please check your email..." }

# Attempt login before verifying email
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# → 403 { "error": "Please verify your email...", "code": "EMAIL_NOT_VERIFIED" }

# Attempt login with wrong password
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrongpassword"}'
# → 401 { "error": "Invalid email or password." }

# Forgot password (registered email)
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
# → 200 { "message": "If this email is registered..." }

# Forgot password (unregistered email — same response)
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"notregistered@example.com"}'
# → 200 { "message": "If this email is registered..." }
```

### Step 6 — Test the full registration + verification flow

1. Submit the sign-up form at `http://localhost:5173/signup`
2. Check the inbox for the configured email address — the verification email should arrive
3. Click the verification link (points to `http://localhost:5173/verify-email?token=<UUID>`)
4. You should be redirected to `/login` with a success message
5. Sign in with the registered email and password
6. You should land on the dashboard

---

## Full Reset Flow Test

1. Navigate to `http://localhost:5173/login` → click "Forgot password?"
2. Enter your registered email and submit
3. Check your inbox for the reset email
4. Click the reset link (`http://localhost:5173/reset-password?token=<UUID>`)
5. Enter a new password (minimum 8 characters), confirm it, and submit
6. You should be redirected to `/login` with a success message
7. Sign in with the new password — confirm it works

---

## Resend Email Testing Tips

- **No real domain needed for local dev**: Resend allows sending to any email when using your own API key. During development, send to your own email inbox.
- **Resend test mode**: To avoid using email quota during automated testing, set `RESEND_API_KEY=re_test_xxxx` (a fake key) and check server logs — the `resend.emails.send()` call will fail silently or with a log error, but the token is still written to the database. You can copy the token directly from the database to test verification without a real email.
- **Check Resend logs**: The Resend dashboard at [resend.com](https://resend.com) shows all sent emails, delivery status, and bounce details.

---

## TypeScript Type-Check

After making code changes:

```bash
# Check server-side code
tsc -p tsconfig.server.json --noEmit

# Check browser-side code (confirm no server imports leaked in)
tsc -b
```

Both must report zero errors before opening a PR.
