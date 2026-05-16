# Feature Specification: Migrate Deployment from Vercel to Render

**Feature Branch**: `020-migrate-vercel-to-render`  
**Created**: 2026-05-16  
**Status**: Complete  
**Input**: User description: "Migrate deployment from Vercel to Render"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - App is reachable and functional after migration (Priority: P1)

The owner navigates to the Finance Analyser on Render and uses it exactly as before. The frontend loads from the Render Static Site and all API calls reach the Render Web Service without errors.

**Why this priority**: Without a working deployment the app is inaccessible. Everything else depends on this.

**Independent Test**: Can be fully tested by opening the Render Static Site URL in a browser and completing a login — delivers a working, live application.

**Acceptance Scenarios**:

1. **Given** the Render Static Site is deployed, **When** the owner opens the app URL, **Then** the login page loads with no console errors.
2. **Given** the Render Web Service is running, **When** the owner sends a GET request to `/health`, **Then** the response is `{"status":"ok", ...}` with HTTP 200.
3. **Given** the owner is on the login page, **When** they submit valid credentials, **Then** they are authenticated and reach the dashboard.

---

### User Story 2 - Login works end-to-end on Render (Priority: P2)

The owner logs in through the frontend hosted on the Render Static Site, which calls the API on the Render Web Service. Authentication succeeds despite the two services being on different subdomains.

**Why this priority**: Cross-origin requests between the static site and the API are the main new failure mode introduced by the split deployment; verifying login confirms CORS is correctly configured.

**Independent Test**: Can be tested by performing a full login flow and confirming a JWT is returned and a protected route is accessible.

**Acceptance Scenarios**:

1. **Given** the static site and API are on different subdomains, **When** the frontend makes a login request, **Then** the API accepts the request (no CORS error in the browser console).
2. **Given** a successful login, **When** the owner accesses a protected page, **Then** data loads correctly from the API.
3. **Given** the API cold-starts after being idle, **When** the owner attempts to log in within 60 seconds, **Then** the login succeeds (E2E tests allow for the spin-down delay).

---

### User Story 3 - All Vercel and Railway artefacts are removed from the codebase (Priority: P3)

There are no Vercel or Railway configuration files, directories, or scripts in the repository. The codebase contains only what is needed for a Render deployment.

**Why this priority**: Removing dead artefacts prevents future confusion but does not affect the live app — the deployment can work before this clean-up is verified.

**Independent Test**: Can be tested by scanning the repository for `vercel.json`, `api/`, `railway.toml`, `.vercel/`, and `vercel-build` script — none should be found.

**Acceptance Scenarios**:

1. **Given** the migration is complete, **When** the repository is scanned for Vercel/Railway files, **Then** none are found (`vercel.json`, `api/index.ts`, `api/index.js`, `api/` directory, `railway.toml`, `.vercel/` directory are all absent).
2. **Given** the `package.json` is inspected, **When** checking for the `vercel-build` script, **Then** it is not present.
3. **Given** `.env.example` is inspected, **When** checking for Vercel-specific variables or comments, **Then** none are found.

---

### Edge Cases

- What happens when the Render Web Service is in a cold-start spin-down state and the owner tries to log in? The free-tier service resumes within ~30 s; E2E tests must allow up to 60 s before declaring failure.
- What happens if `CORS_ORIGIN` is not set on the Web Service? Requests from the Static Site are rejected with a CORS error; the missing variable must be documented in `.env.example`.
- What happens if `tsx` is accidentally left in `devDependencies`? Render's production `npm install` skips dev dependencies and the server fails to start; `tsx` must be in `dependencies`.
- What happens if the `app.listen()` Vercel guard is still present? The Express server never binds to a port on Render and health checks fail; the guard must be removed.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The deployment platform for the Express API MUST be Render Web Service (Node runtime).
- **FR-002**: The deployment platform for the frontend MUST be Render Static Site (built from the Vite `dist/` output).
- **FR-003**: The Express API MUST always start its HTTP server on boot, without any platform-specific guards.
- **FR-004**: The Express API MUST apply CORS middleware that allows cross-origin requests from the origin specified by the `CORS_ORIGIN` environment variable.
- **FR-005**: The `cors` package MUST be listed as a production dependency.
- **FR-006**: The `tsx` runtime MUST be listed as a production dependency so it is available when Render installs packages in production mode.
- **FR-007**: The `vercel-build` script MUST be removed from `package.json`.
- **FR-008**: The files `vercel.json`, `api/index.ts`, `api/index.js`, `railway.toml` and the directories `api/` and `.vercel/` MUST be deleted from the repository.
- **FR-009**: The Playwright E2E configuration MUST use a 60-second default timeout to accommodate API cold-start delays on Render's free tier.
- **FR-010**: The Playwright E2E configuration MUST NOT include the `VERCEL_AUTOMATION_BYPASS_SECRET` HTTP header.
- **FR-011**: `.env.example` MUST document `CORS_ORIGIN` and `VITE_API_URL` without any Vercel-specific comments or variables.
- **FR-012**: `DATABASE_URL` in `.env.example` MUST reference the Supabase direct-connection port (5432) rather than the pooler port (6543).
- **FR-013**: The Render Static Site MUST receive `VITE_API_URL` as an environment variable pointing to the Render Web Service URL at build time.
- **FR-014**: The Render Web Service MUST receive all required runtime environment variables: `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL`, `CORS_ORIGIN`, `NODE_ENV`.

### Key Entities

- **Render Static Site**: Hosts the compiled frontend. Always-on. Receives `VITE_API_URL` at build time so the frontend knows where to send API requests.
- **Render Web Service**: Hosts the Express API. Free tier spins down after 15 min of inactivity; resumes on first request. Receives all runtime secrets as environment variables.
- **CORS configuration**: Middleware in the Express app that permits cross-origin requests from the Render Static Site subdomain, controlled via `CORS_ORIGIN`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: After migration, the owner can open the Finance Analyser in a browser and reach the dashboard in under 60 seconds (accounting for a potential cold start).
- **SC-002**: A GET request to the `/health` endpoint on the deployed API returns `{"status":"ok", ...}` with HTTP 200, with no manual workarounds required.
- **SC-003**: The owner can log in end-to-end — frontend to API — with no CORS errors in the browser console.
- **SC-004**: All existing E2E tests pass on the Render environment within the 60-second timeout budget.
- **SC-005**: Zero Vercel or Railway artefacts remain in the repository after migration (verified by automated scan or manual check).

## Assumptions

- The Render dashboard setup (Static Site and Web Service creation, environment variable configuration) is done manually by the owner and is not automated by code changes in this feature.
- The Supabase database already exists and the direct-connection string (port 5432) is available to the owner.
- The existing `npm run server:start` script correctly starts the Express server; no changes to that script are needed.
- The existing `npm run build` script correctly outputs a production Vite build to `dist/`; no changes to that script are needed.
- The free-tier Render Web Service spin-down behaviour (up to ~30 s cold start) is acceptable for a single-user personal finance app.
- No changes to the database schema or API routes are required as part of this migration; only platform configuration changes are in scope.
- The `cors` npm package will be installed; no custom CORS implementation is needed.
