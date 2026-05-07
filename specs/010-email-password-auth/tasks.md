# Tasks: Email and Password Sign-Up and Sign-In

**Branch**: `010-email-password-auth`
**Input**: `specs/010-email-password-auth/` — plan.md, spec.md, data-model.md, contracts/api.md, research.md, quickstart.md
**Format**: `[ID] [P?] [Story?] Description with file path`

- **[P]** — parallelisable (different files, no dependency on incomplete tasks)
- **[USn]** — maps to user story n from spec.md

> **Sequencing note**: The existing `src/App.tsx` uses a state-based tab switcher with no URL routing. React Router migration (`src/main.tsx` + `src/App.tsx` + `src/components/Sidebar.tsx`) is placed in Phase 2 (Foundational) because every auth page depends on URL-based routing. No auth page component may be built until T006–T008 are complete.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install runtime dependencies and update environment variable documentation before any source files are written.

- [ ] T001 Install runtime and type dependencies: `npm install bcrypt jsonwebtoken resend` and `npm install -D @types/bcrypt @types/jsonwebtoken` (resend ships its own types)
- [ ] T002 [P] Update `.env.example` — add `JWT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL` entries with placeholder values and inline comments (see plan.md Task 5 for exact content)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema changes and React Router migration must both be complete before any user story phase can begin. DB migration because all auth API routes query the updated `users` table. React Router migration because every auth page requires URL-based routing and `useSearchParams`.

**⚠️ CRITICAL**: T003–T011 must all complete before Phase 3 can begin. T006–T008 are the React Router migration sequence and must complete in order.

- [ ] T003 [P] Update `src/db/schema.ts` — add 5 new columns to the `users` table definition: `emailVerified` (boolean NOT NULL DEFAULT false), `verificationToken` (text nullable), `verificationTokenExpiresAt` (timestamptz nullable), `resetToken` (text nullable), `resetTokenExpiresAt` (timestamptz nullable); see data-model.md for full Drizzle schema syntax
- [ ] T004 Run `npm run db:generate` — diffs updated `src/db/schema.ts` against the migration snapshot and writes `src/db/migrations/0001_auth_tokens.sql`; review the generated SQL to confirm exactly 5 ADD COLUMN statements and no destructive changes (depends on T003)
- [ ] T005 Run `npm run db:migrate` — applies `0001_auth_tokens.sql` to Supabase; verify in the Supabase Table Editor that the `users` table now has all 5 new columns; run `npm run db:migrate` a second time to confirm idempotency (depends on T004)
- [ ] T006 [P] Update `src/main.tsx` — import `BrowserRouter` from `react-router-dom` and wrap `<App />` with `<BrowserRouter>` inside `StrictMode`
- [ ] T007 Update `src/App.tsx` — replace the `type Tab` type and `const [tab, setTab]` useState with React Router `<Routes>` and `<Route>` components; import `Routes`, `Route`, `Navigate` from `react-router-dom`; existing pages become: `<Route path="/dashboard" element={<DashboardPage .../>}/>`, `/transactions`, `/chat`, `/settings`; add `<Route path="/" element={<Navigate to="/dashboard" replace />}/>` as root redirect; remove `tab` and `setTab` from the `<Sidebar>` JSX props (keep all other props: `onUpload`, `uploadStatus`, `txnCount`, `accountList`, `onRenameAccount`); retain all existing state (txns, mm, budgets, categories, accountAliases, selectedMonths, chatMessages, uploadStatus) and all handlers (handleUpload, handleBulkCategoryChange, handleRenameAccount) unchanged (depends on T006)
- [ ] T008 Update `src/components/Sidebar.tsx` — remove `tab: Tab` and `setTab: (t: string) => void` from the component's props interface; replace each `onClick={() => setTab("dashboard")}` (and equivalent tab calls) with `<NavLink to="/dashboard">` from `react-router-dom`; use `NavLink`'s `className` or `isActive` callback to replicate the active-tab styling that previously relied on `tab === "dashboard"` comparisons (depends on T007)
- [ ] T009 [P] Create `src/context/AuthContext.tsx` — define `AuthState` interface `{ token: string | null; user: { id: string; email: string; displayName: string } | null }`; implement `AuthContext` with `login(token, user)` (writes state + sessionStorage key `"fa-auth-token"` as JSON) and `logout()` (clears state + sessionStorage); `AuthProvider` reads from sessionStorage on mount; export `useAuth` hook; wrap nothing in this file — the Provider is added to `src/App.tsx` in T025
- [ ] T010 [P] Create `src/server/services/authService.ts` — export: `hashPassword(password)` (bcrypt cost 12), `verifyPassword(password, hash)`, `generateAccessToken(userId)` (jwt.sign sub=userId HS256 15m JWT_SECRET), `verifyAccessToken(token)` (returns `{ sub: string }`), `generateRawToken()` (crypto.randomUUID()), `hashToken(raw)` (SHA-256 hex via crypto.createHash), `verificationExpiresAt()` (now + 24h), `resetExpiresAt()` (now + 1h); see plan.md Task 6 for full code
- [ ] T011 [P] Create `src/server/services/emailService.ts` — import `Resend` from `"resend"`; read `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL` from `process.env`; export `sendVerificationEmail(to, rawToken)` (builds link `${APP_URL}/verify-email?token=${rawToken}`, calls `resend.emails.send`) and `sendPasswordResetEmail(to, rawToken)` (builds link `${APP_URL}/reset-password?token=${rawToken}`); see plan.md Task 7 for full code

**Checkpoint**: DB migration applied, React Router wired up with existing app pages at URL routes, shared services ready. No auth pages yet. ✅

---

## Phase 3: User Story 1 — New User Creates an Account (Priority: P1) 🎯 MVP

**Goal**: A visitor can submit the sign-up form, receive a "check your email" confirmation, and have an unverified account created in the database. The system sends a verification email with a time-limited link.

**Independent Test**: `POST http://localhost:3001/api/auth/register` with valid body → 201 confirmation; same email again → 409; password under 8 chars → 400; navigate to `http://localhost:5173/signup`, fill form → "check your email" page appears; check database: user row exists with `email_verified = false` and `verification_token` populated.

- [ ] T012 [US1] Create `src/server/routes/auth.ts` with `POST /api/auth/register` route — validate: email (valid format, required), displayName (non-empty, max 100 chars), password (min 8 chars); normalise email to `email.toLowerCase().trim()`; query DB to check uniqueness (case-insensitive via normalised email); if duplicate: 409 `{ error: "An account with this email address already exists.", status: 409 }`; call `hashPassword`, `generateRawToken`, `hashToken`; insert user into `users` table with `emailVerified: false`, `verificationToken: hashedToken`, `verificationTokenExpiresAt: verificationExpiresAt()`; call `sendVerificationEmail(email, rawToken)`; return 201 `{ message: "Registration successful. Please check your email to verify your account." }`
- [ ] T013 [US1] Register auth router in `src/server/index.ts` — add `import authRouter from "./routes/auth.ts"` at top of imports; add `app.use("/api/auth", authRouter)` after `app.use(express.json())` and before the 404 handler (depends on T012)
- [ ] T014 [US1] Create `src/pages/SignUpPage.tsx` — form with email, displayName, password fields; client-side validation before any network call (required fields, email format, password ≥ 8 chars); on submit: `POST /api/auth/register`; on 201: replace form with "check your email" confirmation message (no redirect); on 409: show "An account with this email already exists" inline error near email field; on 400: show API error message; include link to `/login`; add `<Route path="/signup" element={<SignUpPage />}/>` to `src/App.tsx`

**Checkpoint**: US1 complete — registration API works, sign-up page functional, verification email sent. ✅

---

## Phase 4: User Story 2 — User Verifies Their Email Address (Priority: P2)

**Goal**: A user can click the verification link in their email and have their account marked verified. Expired links surface an error with a resend option. Already-used links show an appropriate message.

**Independent Test**: Register a new account via API; retrieve raw token from DB (`verification_token` column stores the hash, so use the token received in the email or extract raw token from email link); navigate to `http://localhost:5173/verify-email?token=<TOKEN>` → success state shown → user is redirected to `/login`; repeat with same token → "invalid or already used" state; create account, let token expire (or manually set `verification_token_expires_at` to the past in DB) → navigate to verify link → "expired" state with resend option.

- [ ] T015 [US2] Add `POST /api/auth/verify-email` to `src/server/routes/auth.ts` — call `hashToken(body.token)`; query `users` where `verificationToken = hash`; if row found but `verificationTokenExpiresAt < now()`: return 400 `{ error: "...", status: 400, code: "TOKEN_EXPIRED" }`; if no row found: return 400 `{ error: "...", status: 400, code: "TOKEN_INVALID" }`; update user: set `emailVerified = true`, `verificationToken = null`, `verificationTokenExpiresAt = null`; return 200 `{ message: "Email verified successfully. You can now sign in." }`
- [ ] T016 [US2] Add `POST /api/auth/resend-verification` to `src/server/routes/auth.ts` — normalise `body.email` to lowercase; always return 200 `{ message: "If your account exists and is not yet verified, a new verification email has been sent." }`; in the same handler, after the response is sent (or before, since it's fast): if user found with `emailVerified = false`: call `generateRawToken`, `hashToken`, update `verificationToken` and `verificationTokenExpiresAt`, call `sendVerificationEmail` (depends on T015)
- [ ] T017 [US2] Create `src/pages/VerifyEmailPage.tsx` — call `useSearchParams()` to read `token`; on mount call `POST /api/auth/verify-email` with the token; render four distinct states: loading ("Verifying..."), success ("Email verified! You can now sign in." + `<Link to="/login">`), TOKEN_EXPIRED ("This verification link has expired" + email input + Resend button that calls `POST /api/auth/resend-verification`), TOKEN_INVALID ("This link is invalid or has already been used" + `<Link to="/login">`); add `<Route path="/verify-email" element={<VerifyEmailPage />}/>` to `src/App.tsx`

**Checkpoint**: US2 complete — verification flow works end-to-end, expired and used links handled gracefully. ✅

---

## Phase 5: User Story 3 — Registered User Signs In (Priority: P3)

**Goal**: A verified user can sign in and reach the dashboard. Wrong credentials receive a generic error that does not reveal which field was wrong. Unverified accounts are blocked with a prompt to resend the verification email.

**Independent Test**: With a verified account: `POST /api/auth/login` correct creds → 200 + `accessToken`; wrong password → 401 generic (same message as for unregistered email); unverified account correct creds → 403 `code: EMAIL_NOT_VERIFIED`; navigate to `http://localhost:5173/login`, submit correct creds → lands on `/dashboard`.

- [ ] T018 [US3] Add `POST /api/auth/login` to `src/server/routes/auth.ts` — normalise email to lowercase; query `users` by email; if no user found: return 401 `{ error: "Invalid email or password.", status: 401 }` (do not reveal "email not found"); call `verifyPassword(body.password, user.hashedPassword)`; if mismatch: return same 401 (identical message); if `!user.emailVerified`: return 403 `{ error: "Please verify your email address before signing in.", status: 403, code: "EMAIL_NOT_VERIFIED" }`; call `generateAccessToken(user.id)`; return 200 `{ accessToken, user: { id, email, displayName } }`
- [ ] T019 [US3] Create `src/pages/LoginPage.tsx` — email + password fields; client-side empty-field validation only (do not pre-validate format — server is authoritative for auth errors); on submit: `POST /api/auth/login`; on 200: call `login(accessToken, user)` from `useAuth()` then `navigate("/dashboard")`; on 401: show "Invalid email or password." inline error; on 403 `EMAIL_NOT_VERIFIED`: show "Please verify your email" message + email input (pre-filled with submitted email) + "Resend verification email" button calling `POST /api/auth/resend-verification`; include links to `/signup` and `/forgot-password`; add `<Route path="/login" element={<LoginPage />}/>` to `src/App.tsx`

**Checkpoint**: US3 complete — sign-in works, generic errors enforced, unverified accounts handled. ✅

---

## Phase 6: User Story 4 — User Resets a Forgotten Password (Priority: P4)

**Goal**: A user who cannot remember their password can request a reset link via email, set a new password, and sign in with it. The forgot-password page never reveals whether the email is registered.

**Independent Test**: `POST /api/auth/forgot-password` with registered email → 200 generic; same call with unregistered email → identical 200 generic (responses must be byte-for-byte identical); follow the reset link in the email → ResetPasswordPage shows the form; submit a new password → 200; sign in with new password → 200; attempt to reuse the same reset link → 400 (already consumed).

- [ ] T020 [US4] Add `POST /api/auth/forgot-password` to `src/server/routes/auth.ts` — normalise email to lowercase; return 200 `{ message: "If this email is registered, you will receive a password reset link shortly." }` unconditionally (response sent before or simultaneously with side-effect); look up user by email; if found: call `generateRawToken`, `hashToken`, update user `resetToken = hashedToken`, `resetTokenExpiresAt = resetExpiresAt()` (invalidating any prior token in the same update), call `sendPasswordResetEmail(email, rawToken)`; if not found: do nothing further
- [ ] T021 [US4] Add `POST /api/auth/reset-password` to `src/server/routes/auth.ts` — validate `body.password` min 8 chars (400 if short); call `hashToken(body.token)`; query `users` where `resetToken = hash`; if no row found: 400 `{ error: "This reset link is invalid or has expired. Please request a new one.", status: 400 }`; if row found but `resetTokenExpiresAt < now()`: same 400; call `hashPassword(body.password)`; update user: `hashedPassword = newHash`, `resetToken = null`, `resetTokenExpiresAt = null`; return 200 `{ message: "Password reset successfully. You can now sign in with your new password." }` (depends on T020)
- [ ] T022 [US4] Create `src/pages/ForgotPasswordPage.tsx` — single email field; on submit: `POST /api/auth/forgot-password`; always show the same generic confirmation after submit regardless of the API response content ("If this email is registered, you will receive a reset link") — do not conditionally show different messages based on HTTP status; include link to `/login`; add `<Route path="/forgot-password" element={<ForgotPasswordPage />}/>` to `src/App.tsx`
- [ ] T023 [US4] Create `src/pages/ResetPasswordPage.tsx` — read `?token=` from `useSearchParams()`; two fields: new password + confirm password; client-side validation: both fields required, password ≥ 8 chars, both fields match (show "Passwords do not match" if they differ); on submit: `POST /api/auth/reset-password` with `{ token, password }`; on 200: show success message + `<Link to="/login">`; on 400: show "This link is invalid or has expired" + `<Link to="/forgot-password">`; add `<Route path="/reset-password" element={<ResetPasswordPage />}/>` to `src/App.tsx`

**Checkpoint**: US4 complete — full password reset flow works; forgot-password page reveals nothing about registered emails. ✅

---

## Phase 7: User Story 5 — Unauthenticated User Is Redirected to Sign-In (Priority: P5)

**Goal**: All application pages redirect unauthenticated users to `/login`. All authentication pages remain accessible without being signed in.

**Independent Test**: Without a token in sessionStorage, navigate directly to `http://localhost:5173/dashboard` → redirected to `/login`; navigate to `http://localhost:5173/transactions` → redirected to `/login`; navigate to `http://localhost:5173/signup` → page loads normally; navigate to `http://localhost:5173/forgot-password` → page loads normally.

- [ ] T024 [US5] Create `src/components/ProtectedRoute.tsx` — import `useAuth` from `../context/AuthContext.tsx` and `Navigate` from `react-router-dom`; if `useAuth().token` is null: return `<Navigate to="/login" replace />`; otherwise return `<>{children}</>` (typed as `{ children: React.ReactNode }`)
- [ ] T025 [US5] Update `src/App.tsx` — import `AuthProvider` from `src/context/AuthContext.tsx` and `ProtectedRoute` from `src/components/ProtectedRoute.tsx`; wrap the `<Routes>` element with `<AuthContext.Provider>` (via `<AuthProvider>`); wrap each of the four app-page routes (`/dashboard`, `/transactions`, `/chat`, `/settings`) in `<ProtectedRoute>`; confirm the five auth routes (`/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password`) remain outside `<ProtectedRoute>`; update the root redirect from `<Navigate to="/dashboard">` to `<Navigate to="/login">` so unauthenticated users who visit `/` land on the login page directly (depends on T024)
- [ ] T026 [US5] Create `src/server/middleware/requireAuth.ts` — reads `Authorization: Bearer <token>` header; calls `verifyAccessToken`; attaches `userId` to `req` as `(req as Request & { userId: string }).userId`; returns 401 `{ error: "Unauthorised", status: 401 }` if header is missing, malformed, or token is invalid/expired; this middleware is NOT applied to any route in this feature — it is forward-compatibility infrastructure for future data API routes (see plan.md Task 9)

**Checkpoint**: US5 complete — all protected routes redirect to `/login`, all auth pages accessible without credentials. ✅

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Run `tsc -p tsconfig.server.json --noEmit` — confirm zero TypeScript errors in `src/server/`; fix any type errors before opening PR
- [ ] T028 [P] Run `tsc -b` — confirm browser bundle type-check clean; confirm no imports from `src/server/` appear in any React component or `src/` file
- [ ] T029 Update `docs/architecture.md` — add `bcrypt` (password hashing, cost 12), `jsonwebtoken` (access token, 15min HS256), `resend` (transactional email) to the tech stack table; add `JWT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL` to the environment variables section; add a note that `src/server/services/` is server-side only and must not be imported from React components or the Vite browser bundle

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Requires Phase 1 complete (deps installed before services can import them)
- **Phase 3 (US1)**: Requires Phase 2 complete (needs schema migration + React Router + authService + emailService)
- **Phase 4 (US2)**: Requires Phase 3 complete (auth router created in T012; T015 and T016 extend it)
- **Phase 5 (US3)**: Requires Phase 4 complete (T018 further extends the auth router)
- **Phase 6 (US4)**: Requires Phase 3 complete (extends auth router); can run in parallel with Phase 5 in theory, but sequential by default (single developer, shared auth router file)
- **Phase 7 (US5)**: Requires Phases 3–6 complete (all auth pages must exist before ProtectedRoute is meaningful)
- **Phase 8 (Polish)**: Requires all phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only
- **US2 (P2)**: Depends on US1 (extends `src/server/routes/auth.ts` created in T012)
- **US3 (P3)**: Depends on US2 complete (login route extends the same auth router; login page needs resend-verification route from T016)
- **US4 (P4)**: Depends on US1 (extends auth router); can overlap with US2/US3 in theory since it adds new routes only
- **US5 (P5)**: Depends on all auth pages existing (US1–US4)

### Within Phase 2

```
# Can start simultaneously (different files, no shared dependencies):
T003 [P]  — src/db/schema.ts
T006 [P]  — src/main.tsx
T009 [P]  — src/context/AuthContext.tsx
T010 [P]  — src/server/services/authService.ts
T011 [P]  — src/server/services/emailService.ts

# Sequential DB chain (after T003):
T003 → T004 → T005

# Sequential routing chain (after T006):
T006 → T007 → T008
```

### Within Phase 3

```
T012  — auth.ts register route
T013  — index.ts router registration (after T012)
T014  — SignUpPage.tsx (can start alongside T012/T013 — different file)
```

### Parallel Opportunities

```
# Phase 2 — initial parallel group:
T003 (schema.ts), T006 (main.tsx), T009 (AuthContext.tsx),
T010 (authService.ts), T011 (emailService.ts)

# Phase 6 — pages are independent files (but both touch App.tsx for route registration):
T022 (ForgotPasswordPage.tsx) and T023 (ResetPasswordPage.tsx) should be sequential
to avoid App.tsx edit conflicts

# Phase 8:
T027 (tsc server) and T028 (tsc browser) can run in parallel
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (React Router migration + DB migration + shared services)
3. Complete Phase 3: US1 (registration API + sign-up page)
4. **STOP and VALIDATE**: Register via form → email received → user in DB with `email_verified = false`
5. Ship or demo with registration only — sign-in is blocked until US2 verified

### Full Delivery

1. MVP above → Registration proven
2. Phase 4 (US2): Email verification flow end-to-end
3. Phase 5 (US3): Sign-in working → users can now reach the dashboard
4. Phase 6 (US4): Password reset self-service
5. Phase 7 (US5): Route protection locked in
6. Phase 8: Docs + type-check pass

---

## Summary

| Phase          | Story          | Tasks     | Parallelisable                      |
| -------------- | -------------- | --------- | ----------------------------------- |
| 1 Setup        | —              | T001–T002 | T002                                |
| 2 Foundational | —              | T003–T011 | T003, T006, T009, T010, T011        |
| 3 US1 (P1) 🎯  | Registration   | T012–T014 | T014 alongside T012–T013            |
| 4 US2 (P2)     | Verification   | T015–T017 | —                                   |
| 5 US3 (P3)     | Sign-In        | T018–T019 | —                                   |
| 6 US4 (P4)     | Password Reset | T020–T023 | T022+T023 pages (not App.tsx edits) |
| 7 US5 (P5)     | Route Guard    | T024–T026 | T026 alongside T024–T025            |
| 8 Polish       | —              | T027–T029 | T027, T028                          |

**Total**: 29 tasks across 8 phases
