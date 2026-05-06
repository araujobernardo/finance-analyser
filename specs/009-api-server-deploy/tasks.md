# Tasks: Backend API Server Deployment

**Branch**: `009-api-server-deploy`
**Input**: `specs/009-api-server-deploy/` — plan.md, spec.md, contracts/api.md, research.md, quickstart.md
**Format**: `[ID] [P?] [Story?] Description with file path`

- **[P]** — parallelisable (different files, no dependency on incomplete tasks)
- **[USn]** — maps to user story n from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and add npm scripts before any server files can be written or type-checked.

- [ ] T001 Install runtime and type dependencies: `npm install express cors` and `npm install -D @types/express @types/cors` (tsx already installed from feature 008)
- [ ] T002 [P] Add `server:dev` and `server:start` scripts to `package.json` (see plan.md Task 3)
- [ ] T003 [P] Update `.env.example` — add `PORT=3001` and `CORS_ORIGIN=http://localhost:5173` entries

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: TypeScript configuration must be split before any server source file can be type-checked correctly. `tsconfig.app.json` currently includes `src/` which would pull `src/server/` into the browser type-check, causing false DOM vs Node errors.

**⚠️ CRITICAL**: T004–T006 must complete before T011 (type-check) can run.

- [ ] T004 [P] Create `tsconfig.server.json` at project root — `"lib": ["ES2023"]`, `"types": ["node"]`, `"moduleResolution": "Bundler"`, `"noEmit": true`, strict settings, `"include": ["src/server"]` (see plan.md Task 2)
- [ ] T005 [P] Update `tsconfig.app.json` — add `"exclude": ["src/server"]` to prevent browser lib settings from type-checking server code
- [ ] T006 [P] Update `tsconfig.json` (root) — add `{ "path": "./tsconfig.server.json" }` to the `references` array so `tsc -b` covers the server

**Checkpoint**: TypeScript project split complete — server and browser code can now be type-checked independently.

---

## Phase 3: User Story 1 — Server Runs Healthy on Railway (Priority: P1) 🎯 MVP

**Goal**: A single Railway deployment produces a service that passes the health check and stays Active indefinitely. No manual intervention after environment variables are set.

**Independent Test**: Deploy to Railway with `CORS_ORIGIN` set → Railway dashboard shows "Active" → `curl https://<service>.railway.app/health` → HTTP 200 `{ "status": "ok", "timestamp": "<ISO>" }` → redeploy → service recovers and passes health check again within 30 seconds.

- [ ] T007 [US1] Create `src/server/routes/health.ts` — export Express Router with `GET /health` returning `{ status: "ok", timestamp: new Date().toISOString() }` (see plan.md Task 4)
- [ ] T008 [P] [US1] Create `src/server/middleware/errorHandler.ts` — export `errorHandler: ErrorRequestHandler` returning `{ error: string, status: number }` JSON; never exposes stack traces (see plan.md Task 5)
- [ ] T009 [US1] Create `src/server/index.ts` — Express app with cors middleware (CORS_ORIGIN env var, fail-safe deny when unset), `express.json()`, health router, 404 handler, errorHandler, `app.listen(PORT)` defaulting to 3001; log warning when CORS_ORIGIN is absent (see plan.md Task 6; depends on T007, T008)
- [ ] T010 [P] [US1] Create `railway.toml` at project root — `startCommand = "npm run server:start"`, `healthcheckPath = "/health"`, `healthcheckTimeout = 300`, `restartPolicyType = "ON_FAILURE"` (see plan.md Task 7)
- [ ] T011 [US1] Run `tsc -p tsconfig.server.json --noEmit` — confirm zero TypeScript errors in `src/server/`; run `tsc -b` from project root — confirm browser bundle type-check still passes with the new exclude
- [ ] T012 [US1] Deploy to Railway: set `CORS_ORIGIN` in Railway Variables dashboard; push branch; watch deployment logs for `Server running on port <PORT>`; confirm service marked **Active**; `curl https://<service>.railway.app/health` → 200 `{ "status": "ok", "timestamp": "..." }`; redeploy and confirm recovery within 30 seconds

**Checkpoint**: US1 complete — Railway deployment healthy and self-recovering. ✅

---

## Phase 4: User Story 2 — Developer Starts Local Server with One Command (Priority: P2)

**Goal**: A developer on a clean machine can run a single command and immediately have the server available on localhost, with automatic hot-reload on file changes.

**Independent Test**: `cp .env.example .env` → fill in values → `npm run server:dev` → server ready in <10s → `curl http://localhost:3001/health` → 200 JSON → edit `src/server/routes/health.ts` → server reloads automatically without restart.

- [ ] T013 [US2] Start server locally: with `.env` containing `PORT=3001` and `CORS_ORIGIN=http://localhost:5173`, run `npm run server:dev`; confirm server logs `Server running on port 3001` within 10 seconds; `curl http://localhost:3001/health` → HTTP 200 `{ "status": "ok", "timestamp": "..." }`
- [ ] T014 [US2] Verify hot-reload: with `server:dev` still running, edit `src/server/routes/health.ts` (e.g. add an `uptime` field to the response); confirm the server reloads automatically without a manual restart; confirm the updated response is returned on the next `curl`

**Checkpoint**: US2 complete — local development loop verified end-to-end. ✅

---

## Phase 5: User Story 3 — CORS Enforcement and JSON Errors (Priority: P3)

**Goal**: Requests from unlisted origins are always rejected. Every error condition — unknown route, bad JSON, unhandled exception, missing CORS config — returns a machine-readable JSON response; HTML is never returned under any condition.

**Independent Test**: `curl -H "Origin: http://evil.example.com" http://localhost:3001/health` → no `Access-Control-Allow-Origin` header → `curl http://localhost:3001/doesnotexist` → HTTP 404 `{ "error": "Not Found", "status": 404 }` not HTML → `curl -X POST http://localhost:3001/health -H "Content-Type: application/json" -d "notjson"` → HTTP 400 JSON error, no stack trace.

- [ ] T015 [US3] Verify CORS enforcement: with server running, `curl -v -H "Origin: http://evil.example.com" http://localhost:3001/health` — confirm no `Access-Control-Allow-Origin` header in response; `curl -v -H "Origin: http://localhost:5173" http://localhost:3001/health` — confirm `Access-Control-Allow-Origin: http://localhost:5173` present
- [ ] T016 [US3] Verify 404 JSON: `curl -v http://localhost:3001/doesnotexist` → HTTP 404, `Content-Type: application/json`, body `{ "error": "Not Found", "status": 404 }` — confirm response is not HTML
- [ ] T017 [US3] Verify malformed JSON body: `curl -v -X POST http://localhost:3001/health -H "Content-Type: application/json" -d "notvalidjson{{{"` → HTTP 400, JSON error body — confirm no HTML error page, no stack trace in response body
- [ ] T018 [US3] Verify CORS fail-safe: stop server; remove `CORS_ORIGIN` from `.env`; run `npm run server:dev`; confirm startup logs warning `CORS_ORIGIN is not set`; confirm `curl http://localhost:3001/health` → 200 (health check unaffected); confirm cross-origin request is denied

**Checkpoint**: US3 complete — CORS enforced, all errors return JSON. ✅

---

## Phase 6: User Story 4 — Future Routes Can Be Added Without Restructuring (Priority: P4)

**Goal**: Prove that the routing structure allows a new route to be added with one new file and one registration line, with zero changes to middleware, CORS, or error handling.

**Independent Test**: Create `src/server/routes/ping.ts` → register in `src/server/index.ts` → `GET /api/ping` returns 200 → confirm no changes to CORS config, errorHandler.ts, or any existing middleware were required → remove stub.

- [ ] T019 [US4] Add stub route `src/server/routes/ping.ts` exporting an Express Router with `GET /api/ping → { pong: true }`; add `app.use(pingRouter)` as a single line in `src/server/index.ts`; verify `curl http://localhost:3001/api/ping` → 200 `{ "pong": true }`; confirm CORS enforcement and JSON error handling work on the new route without any changes to `middleware/errorHandler.ts` or the CORS setup; then remove `src/server/routes/ping.ts` and the registration line from `src/server/index.ts` — the stub was proof-of-concept only

**Checkpoint**: US4 complete — extensibility pattern proven and documented. ✅

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T020 [P] Update `docs/architecture.md` — add Express + Node.js to the tech stack table; add note that `src/server/` is server-side only and must not be imported from React components or the Vite browser bundle; add available server commands (`server:dev`, `server:start`)
- [ ] T021 Final commit — `src/server/`, `railway.toml`, `tsconfig.server.json`, updated `tsconfig.app.json`, `tsconfig.json`, `package.json`, `.env.example`, `docs/architecture.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Requires Phase 1 complete (scripts and packages must be installed before tsconfig references can be validated)
- **Phase 3 (US1)**: Requires Phase 2 complete (tsconfig.server.json must exist before T011 type-check runs)
- **Phase 4 (US2)**: Requires Phase 3 complete (server files must exist before local smoke test)
- **Phase 5 (US3)**: Requires Phase 3 complete (server must be running for CORS/error tests); can run in parallel with Phase 4
- **Phase 6 (US4)**: Requires Phase 3 complete (server must exist to add stub route); can run in parallel with Phase 4 and Phase 5
- **Phase 7 (Polish)**: Requires all phases complete

### Within Phase 3

- T007 (`routes/health.ts`) and T008 (`middleware/errorHandler.ts`) can run in parallel — different files
- T009 (`index.ts`) depends on T007 + T008
- T010 (`railway.toml`) can run in parallel with T007–T009 — independent file
- T011 (type-check) depends on T004–T006 (Phase 2) + T007–T009
- T012 (Railway deploy) depends on T010 + T011

### Parallel Opportunities

```
# Phase 1 — T002 and T003 can run in parallel:
Task T002: Add npm scripts to package.json
Task T003: Update .env.example

# Phase 2 — T004, T005, T006 can all run in parallel:
Task T004: Create tsconfig.server.json
Task T005: Update tsconfig.app.json
Task T006: Update tsconfig.json

# Phase 3 — T007 and T008 can run in parallel (before T009):
Task T007: Create src/server/routes/health.ts
Task T008: Create src/server/middleware/errorHandler.ts

# Phase 3 — T010 can run in parallel with T007-T009:
Task T010: Create railway.toml

# Phase 4/5/6 — can all start independently once Phase 3 is done:
Task T013+T014 (US2): Local dev verification
Task T015–T018 (US3): CORS + error verification
Task T019 (US4): Stub route proof

# Phase 5 — T015, T016, T017, T018 can all run in parallel:
Task T015: CORS deny/allow verification
Task T016: 404 JSON verification
Task T017: Malformed JSON verification
Task T018: CORS fail-safe verification
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (TypeScript config split)
3. Complete Phase 3: US1 (T007 → T008 parallel → T009 → T010 parallel → T011 → T012)
4. **STOP and VALIDATE**: Railway service shows Active; health check passes
5. All other user stories validate the same implementation — no new code required

### Full Delivery

1. MVP above → Railway deployment proven
2. Phase 4 (US2): Local dev loop verified with hot-reload
3. Phase 5 (US3): CORS enforcement and JSON error responses confirmed under all conditions
4. Phase 6 (US4): Extensibility pattern proven with stub route
5. Phase 7: Docs + final commit

---

## Summary

| Phase          | Story          | Tasks     | Parallelisable         |
| -------------- | -------------- | --------- | ---------------------- |
| 1 Setup        | —              | T001–T003 | T002, T003             |
| 2 Foundational | —              | T004–T006 | T004, T005, T006       |
| 3 US1 (P1) 🎯  | Railway health | T007–T012 | T007+T008, T010        |
| 4 US2 (P2)     | Local dev      | T013–T014 | —                      |
| 5 US3 (P3)     | CORS + errors  | T015–T018 | T015, T016, T017, T018 |
| 6 US4 (P4)     | Extensibility  | T019      | —                      |
| 7 Polish       | —              | T020–T021 | T020                   |

**Total**: 21 tasks across 7 phases
