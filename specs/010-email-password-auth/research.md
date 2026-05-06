# Research: Email and Password Authentication

**Branch**: `010-email-password-auth` | **Date**: 2026-05-06

---

## Decision 1 — Password Hashing: bcrypt via the `bcrypt` npm package

**Decision**: Use `bcrypt` (native bindings) at cost factor 12, with `@types/bcrypt` for TypeScript.

**Rationale**: Cost factor 12 is the user-specified value and sits at the industry-recommended balance between security (resistant to brute-force at modern GPU speeds) and server latency (~250–400ms per hash on commodity hardware, acceptable for a login/register flow). Railway builds in a Linux container with `node-gyp` available, so native `bcrypt` compiles cleanly. The `@types/bcrypt` package provides full TypeScript types with no extra configuration.

**Alternatives considered**:

- `bcryptjs` (pure JS) — avoids native compilation but is ~3× slower than the native binding. Unnecessary overhead given Railway's build environment supports native modules.
- `argon2` — more modern algorithm, OWASP-recommended for new projects. Rejected to honour the user's explicit bcrypt specification.

---

## Decision 2 — JWT: `jsonwebtoken` with access-token-only pattern

**Decision**: Use `jsonwebtoken` + `@types/jsonwebtoken`. Access token only, 15-minute expiry, HS256 signing with `JWT_SECRET` env var. No refresh token in this feature.

**Rationale**: User-specified library and expiry. Access-token-only avoids the complexity of refresh token rotation (storage, revocation, rotation logic) which is explicitly out of scope per the spec assumptions. HS256 (symmetric HMAC-SHA256) is appropriate for a single-service deployment — no need for RS256 (asymmetric) until the API and frontend are separate trust domains with different key owners.

**Token storage on client**: sessionStorage. Safer than localStorage against XSS (sessionStorage is cleared on tab close). Since there is no refresh token, the user re-authenticates when the session expires — acceptable for an MVP.

**Alternatives considered**:

- Refresh tokens — deferred to a future session management feature (per spec assumptions).
- RS256 (asymmetric) — overkill for single-service deployment.
- Cookies with `HttpOnly` flag — more XSS-safe than sessionStorage, but requires CSRF protection and complicates the React client-side logout flow. Deferred to a future hardening pass.

---

## Decision 3 — Email Sending: Resend via the `resend` npm package

**Decision**: Use the `resend` npm package. Configured via `RESEND_API_KEY` and `RESEND_FROM_EMAIL` env vars. An additional `APP_URL` env var is required to construct the verification and reset link URLs (e.g., `https://app.example.com/verify-email?token=XXX`).

**Rationale**: User-specified provider. Resend has a clean TypeScript-first API with a single `resend.emails.send()` call and a generous free tier (100 emails/day). The `APP_URL` env var is necessary at runtime to build absolute URLs for the email links — it is not hardcoded.

**Alternatives considered**:

- Nodemailer — more complex setup (SMTP config, transport objects). No advantage here given Resend's simplicity.
- SendGrid — valid alternative but not user-specified.

---

## Decision 4 — Token Storage Pattern: UUID + SHA-256 hash in the database

**Decision**: Generate a raw UUID v4 token using Node's built-in `crypto.randomUUID()`. Send the raw token to the user (in the email link). Store a SHA-256 hex digest of the raw token in the database. On incoming verification/reset requests, hash the submitted token with SHA-256 and compare against the stored hash.

**Rationale**: SHA-256 is appropriate for single-use, randomly generated tokens (unlike passwords, which require a slow adaptive hash like bcrypt). UUID v4 tokens have 122 bits of entropy — immune to brute-force enumeration. Storing only the hash means a database breach does not expose usable tokens. `crypto.randomUUID()` is available in Node.js ≥ 14.17 with no external package.

**Why not bcrypt for tokens**: bcrypt's computational cost is designed to protect low-entropy secrets (passwords). High-entropy random tokens do not need this; bcrypt would add unnecessary latency and complexity with no security benefit.

**Alternatives considered**:

- `uuid` npm package — not needed; `crypto.randomUUID()` is built into Node.
- Random bytes via `crypto.randomBytes()` + hex — equivalent entropy, but UUID is more conventional and produces a predictable string format.

---

## Decision 5 — React Router Migration (v7, already installed)

**Decision**: `react-router-dom` v7 is already installed. The existing App.tsx uses a state-based tab switcher (no URL routing). This feature migrates App.tsx to `<Routes>` + `<Route>` components and wraps `main.tsx` with `<BrowserRouter>`. Existing app tabs become URL routes (`/dashboard`, `/transactions`, `/chat`, `/settings`). Auth pages live at `/signup`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password`.

**Rationale**: URL-based routing is required for auth pages to work independently (deep-linking, email links pointing to `/verify-email?token=...`, `/reset-password?token=...`). The state-based tab switcher cannot handle these flows. The migration is a prerequisite for US2 and US4.

**ProtectedRoute pattern**: A `<ProtectedRoute>` component reads the auth state from `AuthContext`. If no token is present, it renders `<Navigate to="/login" replace />`. All existing app tabs are wrapped in `<ProtectedRoute>`. Auth pages are outside the wrapper.

---

## Decision 6 — Auth Context: in-memory + sessionStorage hybrid

**Decision**: Create `src/context/AuthContext.tsx` that stores the JWT in React state (primary) and syncs to `sessionStorage` for persistence across page refreshes within the same browser session. On mount, reads from `sessionStorage`. On login, writes to both state and `sessionStorage`. On logout, clears both.

**Rationale**: Pure in-memory storage is lost on page refresh (poor UX). `sessionStorage` persists across refreshes within a tab but is cleared when the tab closes — appropriate for a 15-minute access token with no refresh flow.

**Alternatives considered**:

- `localStorage` — persists across tabs and browser restarts, but increases XSS exposure surface. Not appropriate for a 15-minute access token.
- `HttpOnly` cookie — most secure, but requires server-side session handling and CSRF protection. Out of scope for this feature.

---

## Decision 7 — New API Route: POST /api/auth/resend-verification

**Decision**: Add a 6th auth route `POST /api/auth/resend-verification` beyond the 5 specified by the user, because FR-011 and FR-016 require it.

**Rationale**: FR-011 states "the system MUST allow users to request a new verification email." FR-016 states the login response for unverified accounts must "offer a link to resend the verification email." This requires a server endpoint to generate a new token, invalidate the old one, and send a new email. The user's 5-route list was a baseline; this 6th route is a spec requirement, not scope creep.

**Endpoint**: `POST /api/auth/resend-verification` — body `{ email }`. Always returns 200 with a generic message (privacy: does not confirm whether the email is registered or already verified).

---

## Decision 8 — Drizzle Migration: additive ALTER TABLE via migration 0001

**Decision**: Update `src/db/schema.ts` to add the 5 new columns to the `users` table definition, then run `npm run db:generate` to produce `src/db/migrations/0001_auth_tokens.sql`. The SQL will contain `ALTER TABLE users ADD COLUMN ...` statements, one per new column.

**Rationale**: Additive migrations are safe on a table with existing rows — new nullable columns default to NULL, and the boolean `email_verified` column defaults to `false`. No data loss, no destructive changes. The migration runner (`npm run db:migrate`) applies it idempotently.

**Migration number**: `0001` (following `0000_initial_schema.sql` from feature 008).
