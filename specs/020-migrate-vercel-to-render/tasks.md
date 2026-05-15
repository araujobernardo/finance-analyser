# Tasks: Migrate Deployment from Vercel to Render

**Input**: Design documents from `specs/020-migrate-vercel-to-render/`  
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: No test-specific tasks — spec does not request TDD approach. QA agent writes tests per `testing-strategy.md`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Remove the legacy platform artefacts that conflict with Render before any new configuration is introduced.

- [ ] T001 Delete `vercel.json` from repository root
- [ ] T002 Delete `api/index.ts` from repository root
- [ ] T003 Delete `api/index.js` from repository root (if present)
- [ ] T004 Delete `railway.toml` from repository root
- [ ] T005 Delete `.vercel/` directory from repository root
- [ ] T006 Remove `vercel-build` script from `package.json`

**Checkpoint**: No Vercel or Railway artefacts remain; `package.json` has no `vercel-build` script.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure changes that MUST be complete before any user story can be verified. These changes make the Express server runnable on Render and enable cross-origin requests from the static site.

- [ ] T007 Move `tsx` from `devDependencies` to `dependencies` in `package.json` (run `npm install` after)
- [ ] T008 Add `cors` package to `dependencies` in `package.json` and install `@types/cors` if not already in `devDependencies` (run `npm install` after)
- [ ] T009 Remove the `if (!process.env.VERCEL)` guard from `src/server/index.ts` so `app.listen()` always runs on boot
- [ ] T010 Add `cors` middleware to `src/server/index.ts`, configured via `process.env.CORS_ORIGIN`; log a warning if `CORS_ORIGIN` is not set

**Checkpoint**: `npm run server:start` starts the HTTP server unconditionally and accepts cross-origin requests when `CORS_ORIGIN` is set.

---

## Phase 3: User Story 1 — App is reachable and functional after migration (P1) 🎯 MVP

**Goal**: The frontend loads from the Render Static Site and all API calls reach the Render Web Service without errors.

**Independent Test**: Open `https://finance-analyser-dmff.onrender.com` in a browser — the login page loads with no console errors. Send `GET /health` to the Render Web Service — response is `{"status":"ok", ...}` with HTTP 200.

### Implementation for User Story 1

- [ ] T011 [US1] Add `public/_redirects` file containing `/* /index.html 200` so Render Static Site serves `index.html` for all React Router routes
- [ ] T012 [US1] Update `.env.example`: remove all Vercel-specific variables (`VERCEL_AUTOMATION_BYPASS_SECRET`, Vercel-specific comments) and update `DATABASE_URL` comment to reference direct-connection port 5432 instead of pooler port 6543; add `CORS_ORIGIN` and update `APP_URL` / `E2E_BASE_URL` examples to reflect Render URLs

**Checkpoint**: User Story 1 is fully implementable — the SPA route fallback is in place and `.env.example` documents the correct Render variables.

---

## Phase 4: User Story 2 — Login works end-to-end on Render (P2)

**Goal**: Authentication succeeds despite the static site and API being on different subdomains; no CORS errors in the browser console.

**Independent Test**: Perform a full login flow on `https://finance-analyser-dmff.onrender.com` — confirm a JWT is returned and a protected route loads data.

### Implementation for User Story 2

- [ ] T013 [US2] Update `playwright.config.ts`: raise global `timeout` to `60_000` ms; remove the `VERCEL_AUTOMATION_BYPASS_SECRET` conditional `extraHTTPHeaders` block entirely; update default `baseURL` comment/example to use `https://finance-analyser-dmff.onrender.com`

**Checkpoint**: Playwright E2E tests run with a 60-second timeout and no Vercel headers; the login flow test can be aimed at the Render deployment.

---

## Phase 5: User Story 3 — All Vercel and Railway artefacts removed (P3)

**Goal**: Zero Vercel or Railway artefacts remain in the repository.

**Independent Test**: Scan the repository for `vercel.json`, `api/`, `railway.toml`, `.vercel/`, and `vercel-build` — none found. Inspect `.env.example` — no Vercel-specific variables or comments.

### Implementation for User Story 3

All artefact deletions were handled in Phase 1 (T001–T005) and `package.json` cleanup in T006. The `.env.example` cleanup is handled in T012. This phase contains the final verification sweep.

- [ ] T014 [US3] Verify `package.json` does not contain `vercel-build` script, `esbuild` is still present in `devDependencies` (needed for potential future use), and `tsx` is in `dependencies`
- [ ] T015 [US3] Run `npm run lint` and `npm run typecheck` to confirm no TypeScript or lint errors after all changes

**Checkpoint**: All acceptance criteria for User Story 3 are satisfied — automated scan passes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final integration check across all stories.

- [ ] T016 [P] Run `npm run build` and confirm Vite builds successfully with the updated `package.json`
- [ ] T017 [P] Run `npm test` (Vitest unit tests) and confirm all existing tests pass
- [ ] T018 Run `npm run server:start` locally (with `.env` populated) and confirm the server starts and `/health` responds with HTTP 200

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (artefacts deleted, `vercel-build` gone)
- **Phase 3 (US1)**: Depends on Phase 2 (`cors` middleware + `app.listen()` always on)
- **Phase 4 (US2)**: Depends on Phase 2 (CORS config must be complete before E2E tests can pass login flow)
- **Phase 5 (US3)**: Depends on Phase 1 and T012 (artefacts gone, `.env.example` clean)
- **Phase 6 (Polish)**: Depends on all prior phases

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 complete
- **US2 (P2)**: Depends on Phase 2 complete; US1 and US2 can proceed in parallel after Phase 2
- **US3 (P3)**: Depends on Phase 1 + T012 from Phase 3; can proceed independently of US2

### Within Each Phase

- T007 and T008 can run in parallel (different sections of `package.json`)
- T009 and T010 must run sequentially (T010 adds middleware after T009 removes the guard)
- T011 and T012 can run in parallel (different files)
- T013 is independent of T011/T012

---

## Parallel Execution Examples

### Phase 2

```
T007: Move tsx to dependencies
T008: Add cors to dependencies   ← parallel with T007 (different dep sections)
```

### Phase 3 + 4 (after Phase 2 complete)

```
T011: Add public/_redirects       ← parallel with T012, T013
T012: Update .env.example         ← parallel with T011, T013
T013: Update playwright.config.ts ← parallel with T011, T012
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Remove artefacts (T001–T006)
2. Complete Phase 2: Foundation (T007–T010)
3. Complete Phase 3: US1 (T011–T012)
4. **STOP and VALIDATE**: Confirm Render Static Site loads and `/health` returns 200
5. Deploy to Render and verify live

### Incremental Delivery

1. Phase 1 + 2 → Render-compatible server ready
2. Phase 3 → SPA routing + correct env docs → US1 complete
3. Phase 4 → Playwright config updated → US2 (login E2E) verifiable
4. Phase 5 + 6 → Clean repo + all checks pass → US3 complete

---

## Notes

- [P] tasks = different files, no dependencies on each other
- No new source files are created — all changes are edits, deletions, or a single new `public/_redirects`
- `esbuild` stays in `devDependencies` — it was used only for `vercel-build` but may be useful in future; removing it is out of scope unless specified
- After T008, run `npm install` to update `package-lock.json`
- Commit after each phase or logical group using Conventional Commit messages
