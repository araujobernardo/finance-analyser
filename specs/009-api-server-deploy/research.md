# Research: Backend API Server Deployment

**Branch**: `009-api-server-deploy` | **Date**: 2026-05-06

---

## Decision 1 — Express as HTTP Framework

**Decision**: Express 5.x with TypeScript.

**Rationale**: User specified Express explicitly and ruled out NestJS, Fastify, and all other frameworks. Express is the lightest-weight option, has zero opinion on project structure, and adds no abstractions that would conflict with adding future routes. Express 5 (stable as of late 2024) drops callback-based error handling in favour of async/await, matching the project's TypeScript-first style.

**Alternatives considered**: NestJS (excluded by user), Fastify (excluded by user), Hono (not specified), Koa (not specified). None considered further.

---

## Decision 2 — tsx for Both Dev and Production

**Decision**: `tsx` runs the server in both local development (`tsx watch`) and Railway production (`tsx src/server/index.ts`). No separate compile step.

**Rationale**: User specified tsx for local development. Extending tsx to production avoids a `tsc` build step in the Railway deploy pipeline, which reduces Railway build minutes and eliminates a class of "it compiled but didn't work" bugs. tsx has negligible startup overhead (<1s) well within the 10-second readiness requirement. The server is not performance-critical at startup — it is a long-running process. tsx is already installed in the project as a dev dependency (added in feature 008).

**Alternatives considered**:

- `tsc` + `node` for production — would require a build step and an `outDir` in `tsconfig.server.json`. Adds complexity for no measurable benefit at this stage.
- `ts-node` — older, slower startup than tsx, deprecated in favour of tsx.

---

## Decision 3 — Separate `tsconfig.server.json`

**Decision**: Create `tsconfig.server.json` targeting `src/server/` with Node.js settings; add `"exclude": ["src/server"]` to `tsconfig.app.json`.

**Rationale**: `tsconfig.app.json` currently includes `src/` which would pull `src/server/` into the browser bundle's type check. The server imports `express` and `cors` which use Node.js built-ins — browser lib settings (`DOM`, `DOM.Iterable`) would produce false errors. A dedicated server tsconfig with `"types": ["node"]` and no `DOM` lib correctly scopes the server types. `tsconfig.server.json` is added as a project reference in the root `tsconfig.json` so `tsc -b` (used in CI) checks the server code too.

**Alternatives considered**:

- Adding server to `tsconfig.node.json` — that file only covers `vite.config.ts`; mixing purposes makes it harder to reason about what each config covers.
- Single `tsconfig.json` for everything — cannot simultaneously have DOM and Node types without polluting each other's scopes.

---

## Decision 4 — CORS Fail-Safe: Deny All When CORS_ORIGIN Unset

**Decision**: If `CORS_ORIGIN` environment variable is missing at startup, the server logs a warning and passes `origin: false` to the `cors` middleware, denying all cross-origin requests.

**Rationale**: The spec (FR-005) requires failing safe: an unconfigured server must not accidentally allow all origins. `cors({ origin: false })` rejects all CORS requests. A missing env var is a deployment misconfiguration, not a reason to open up access. The server continues to run (health checks must still pass for Railway) but no browser client from any origin can call it.

**Alternatives considered**:

- Crash on missing CORS_ORIGIN — would fail Railway health checks; too aggressive for a config warning.
- Default to `origin: true` (allow all) — explicitly prohibited by FR-005.

---

## Decision 5 — railway.toml Configuration

**Decision**: `railway.toml` at project root with `startCommand = "npm run server:start"`, `healthcheckPath = "/health"`, `healthcheckTimeout = 300` (5 minutes — Railway's default is 300s; suitable for cold start).

**Rationale**: Using `npm run server:start` rather than the raw `tsx` command means the start command stays in `package.json` as the single source of truth. Railway picks up `railway.toml` automatically on deploy; no Railway-specific configuration is needed in the dashboard beyond environment variables. 300s healthcheck timeout is Railway's own default and safely covers any slow cold start on the free tier.

**Alternatives considered**:

- `railway.json` — TOML is Railway's preferred format; JSON is also supported but less common in Railway docs.
- `Dockerfile` — adds container management overhead unnecessary for a simple Node.js server; Railway's Nixpacks buildpack handles Node.js apps natively without a Dockerfile.

---

## Decision 6 — PORT Default: 3001

**Decision**: Server defaults to port `3001` when `PORT` environment variable is not set.

**Rationale**: User specified 3001 explicitly to avoid clashing with Vite's default port 5173. On Railway, `PORT` is always injected automatically — the default only applies in local development without `.env` set, which is an edge case anyway.

**Alternatives considered**: Port 3000 (common default but clashes with many other dev tools), port 8080 (common in containers but unnecessary since PORT is always set on Railway).

---

## Decision 7 — Global JSON Error Handler Shape

**Decision**: All errors return `{ error: string; status: number }` with the HTTP status matching the `status` field.

**Rationale**: User specified this shape exactly. The Express global error handler catches: (1) explicit `next(err)` calls, (2) sync throws in route handlers (Express 5 auto-catches these), (3) `express.json()` parse errors. A 404 handler is registered before the error handler to catch unknown routes and forward a structured 404 error object. The `status` field in the body is redundant with the HTTP status code but is included per the user's specification for client convenience.

**Alternatives considered**: `{ message: string }` only — excluded by user spec. Including a `stack` field in development — excluded to avoid leaking internals; the spec says "never a raw stack trace."

---

## Decision 8 — No Data Model

**Decision**: No `data-model.md` generated for this feature.

**Rationale**: This feature has no persistent entities, no database queries, and no schema changes. The server scaffold (routes, middleware, config) has no data model in the traditional sense. The one "entity" is the health check response shape (`{ status: "ok", timestamp: string }`), which is fully defined in the API contract.
