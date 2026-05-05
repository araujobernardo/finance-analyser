# Feature Specification: Backend API Server Deployment

**Feature Branch**: `009-api-server-deploy`
**Created**: 2026-05-06
**Status**: Draft
**Input**: User description: "FA-INFRA-002 — Backend API server deployment"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Server Runs Healthy on Railway (Priority: P1)

A developer deploys the API server to Railway for the first time. Railway detects the server is running, marks the service as healthy, and keeps it live. Any restart or redeploy also passes the health check automatically — Railway never shows the service as crashed due to a missing health endpoint.

**Why this priority**: Without a passing health check, Railway will cycle-restart the container and the server will never be reachable. This is the minimum viable deployment. Every other story depends on the server being alive.

**Independent Test**: Deploy the server to Railway with the required environment variables set → Railway dashboard shows the service as "Active" → send a GET request to `/health` → receive HTTP 200 with a JSON body confirming the server is healthy → redeploy → Railway recovers and passes health check again within 30 seconds.

**Acceptance Scenarios**:

1. **Given** a Railway service is configured with the required environment variables, **When** the server starts, **Then** a GET request to `/health` returns HTTP 200 with a JSON body (e.g., `{ "status": "ok" }`) within 30 seconds.
2. **Given** the server is already running, **When** Railway polls the health check endpoint, **Then** the response is consistently HTTP 200 — never a timeout or non-200 status.
3. **Given** the server is redeployed, **When** the new container starts, **Then** it passes the health check within 30 seconds of start.

---

### User Story 2 — Developer Starts Local Server with One Command (Priority: P2)

A developer clones the repository, sets the required environment variables in a `.env` file, runs a single command, and the API server is immediately available on their local machine. They can test the health endpoint and verify CORS behaviour without deploying to Railway.

**Why this priority**: Developer velocity depends on a fast local feedback loop. If starting the server locally requires multiple steps or manual setup beyond env vars, iteration slows and bugs go undetected before deployment.

**Independent Test**: Clone the repo on a clean machine → create `.env` from `.env.example` → run `npm run dev` → server starts on the configured port → GET `/health` returns 200 → no additional commands required.

**Acceptance Scenarios**:

1. **Given** a developer has set the required environment variables, **When** they run the single start command, **Then** the server starts and is ready to accept requests within 10 seconds.
2. **Given** the server is running locally, **When** a developer sends a GET request to `/health`, **Then** they receive HTTP 200 with a JSON body.
3. **Given** the server is running locally, **When** a developer makes a change to a source file, **Then** the server automatically reloads without requiring a manual restart (hot-reload / watch mode).

---

### User Story 3 — Server Enforces CORS and Returns JSON Errors (Priority: P3)

Any frontend application trying to call the API must come from the configured allowed domain. Requests from other origins are rejected. When the server encounters any error — unknown route, unhandled exception, bad input — it returns a structured JSON error response, never an HTML page or raw stack trace.

**Why this priority**: CORS enforcement is a security gate that prevents unauthorised browser clients from calling the API. Consistent JSON errors are essential for the React frontend to handle failures gracefully instead of crashing on an HTML string. Both are correctness requirements, but the server can function in P1 and P2 without them being validated.

**Independent Test**: Send a request from an unlisted origin → receive a CORS-rejected response → send a request to an unknown route from the allowed origin → receive a JSON 404 error (not an HTML page) → trigger an internal error → receive a JSON 500 error (not a stack trace).

**Acceptance Scenarios**:

1. **Given** the server has a configured allowed origin, **When** a browser sends a request from a different origin, **Then** the server rejects the request with a CORS error — not a successful response.
2. **Given** the server has a configured allowed origin, **When** a browser sends a request from the allowed origin, **Then** the server processes the request normally.
3. **Given** a client requests a route that does not exist, **When** the server receives the request, **Then** it responds with HTTP 404 and a JSON body containing a machine-readable error (e.g., `{ "error": "Not Found" }`) — never an HTML page.
4. **Given** an unhandled exception occurs inside the server, **When** the error propagates to the error handler, **Then** the server responds with HTTP 500 and a JSON body — never a raw stack trace or HTML error page.

---

### User Story 4 — Future Routes Can Be Added Without Restructuring (Priority: P4)

A developer adding a new REST route (e.g., `GET /api/accounts`) can do so by adding a single new file or registering a new module, without touching the server's core configuration, middleware, or entry point beyond a one-line registration.

**Why this priority**: Extensibility is not required for this feature's MVP, but if the structure is wrong from the start, every future route addition will require rework. Defining the extension contract now avoids structural debt.

**Independent Test**: Add a stub route handler for `GET /api/ping` → register it following the documented pattern → the route responds correctly → no changes were required to server entry point middleware, CORS config, or error handling.

**Acceptance Scenarios**:

1. **Given** the server is running, **When** a developer adds a new route module following the project's routing pattern, **Then** the route is reachable without modifying the server entry point or any existing middleware.
2. **Given** the server has a documented route extension pattern, **When** a developer follows it, **Then** the new route automatically benefits from CORS enforcement and JSON error handling.

---

### Edge Cases

- What happens if `PORT` is not set in the environment? The server must fall back to a safe default port and log a warning.
- What happens if `CORS_ORIGIN` is not set? The server must reject all cross-origin requests (fail-safe: deny by default, not permit all).
- What happens if the Railway health check fires during server startup before the HTTP listener is ready? The server must be ready fast enough that this does not cause a startup loop (target: ready within 10 seconds).
- What if a request body is malformed JSON? The server must return a JSON 400 error, not crash or return HTML.
- What if an environment variable contains an invalid value (e.g., `PORT=abc`)? The server must fail fast at startup with a clear error message rather than silently misbehaving.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The server MUST expose a `GET /health` endpoint that returns HTTP 200 and a JSON body confirming the server is operational.
- **FR-002**: The server MUST read its listening port from an environment variable (`PORT`); if unset, it MUST fall back to a default and log a warning.
- **FR-003**: The server MUST read all configuration (port, database connection string, allowed origin, any secrets) from environment variables — no values may be hardcoded in source code.
- **FR-004**: The server MUST enforce CORS using a configurable allowed origin read from an environment variable; requests from any other origin MUST be rejected.
- **FR-005**: If `CORS_ORIGIN` is not set, the server MUST deny all cross-origin requests — it MUST NOT default to allowing all origins.
- **FR-006**: The server MUST return all error responses as JSON — including 404 Not Found, 500 Internal Server Error, and request parsing errors — never as HTML pages or raw stack traces.
- **FR-007**: The server MUST be startable in local development mode with a single command — no manual multi-step startup procedure.
- **FR-008**: In local development mode, the server MUST automatically reload when source files change, without requiring a manual restart.
- **FR-009**: The server MUST be deployable to Railway by setting environment variables in the Railway dashboard and triggering a deploy — no manual server provisioning required.
- **FR-010**: The server MUST include Railway deployment configuration (health check path, start command) so Railway can verify liveness automatically.
- **FR-011**: The server MUST be structured so that new REST API route modules can be added without modifying the server's core configuration, CORS setup, or global error handling.
- **FR-012**: The server MUST start and be ready to accept requests within 10 seconds of process start (local and deployed).

### Key Entities

- **Server Instance**: The running HTTP process — listens on a configured port, applies middleware (CORS, JSON parsing, error handling), and routes requests.
- **Health Check**: A lightweight endpoint whose sole purpose is to confirm the server process is alive and accepting connections. Contains no business logic or data access.
- **Route Module**: A self-contained unit of routing logic that can be registered with the server without coupling to other route modules or core configuration.
- **Environment Configuration**: The set of environment variables that control all runtime behaviour — port, allowed origin, database URL, and any secrets.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The server is live on Railway and Railway marks the service as "Active" within 30 seconds of a fresh deployment — with no manual intervention after environment variables are set.
- **SC-002**: A developer on a clean machine can have the API server running locally within 5 minutes of cloning the repo, using only the documented setup steps.
- **SC-003**: 100% of error responses under all tested error conditions (404, 500, invalid JSON, CORS rejection) are machine-readable JSON — zero HTML error pages returned.
- **SC-004**: Requests from unlisted origins are rejected 100% of the time; requests from the configured origin succeed 100% of the time under normal conditions.
- **SC-005**: Adding a new stub route to the server takes under 5 minutes and requires changing only one file (the new route module) plus one registration line — no changes to core server configuration.

## Assumptions

- The Finance Analyser frontend will be deployed to a known, stable domain that can be set as `CORS_ORIGIN` in Railway's environment variables before the first real API call.
- Railway free tier is sufficient for the initial deployment — no multi-region, autoscaling, or custom domain SSL configuration is required for this feature.
- The React frontend and the API server are separate deployments — this feature does not add server-side rendering or serving of static frontend assets.
- A single Railway service hosts the entire API (no microservices or separate services per domain).
- The server process is the only process in its container — no reverse proxy (nginx) is required in front of it for Railway deployment.
- Database connectivity (`DATABASE_URL`) is configured as an environment variable at deploy time but is not actively used by any endpoint in this feature — the server starts successfully whether or not a database is reachable.
- `.env.example` in the repo documents every required environment variable; developers copy it to `.env` for local setup.
