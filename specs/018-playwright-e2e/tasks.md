# Tasks: FA-E2E-001 — Playwright End-to-End Test Suite

**Input**: Design documents from `specs/018-playwright-e2e/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, quickstart.md ✓

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install Playwright and wire up package scripts and env-var scaffolding.

- [ ] T001 Install `@playwright/test` as a dev dependency: run `npm install --save-dev @playwright/test` from project root
- [ ] T002 [P] Add `"e2e": "playwright test"` script to `package.json`
- [ ] T003 [P] Add `E2E_BASE_URL`, `E2E_EMAIL`, and `E2E_PASSWORD` placeholder entries to `.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Playwright config must exist before any test can run. Blocks all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Create `playwright.config.ts` at the project root with: `testDir: "./e2e"`, `timeout: 30_000`, `retries: process.env.CI ? 1 : 0`, `baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173"`, `headless: !!process.env.CI`, single Chromium project using `devices["Desktop Chrome"]`

**Checkpoint**: Config exists — `npx playwright test --list` should run without errors.

---

## Phase 3: User Story 1 — Sign-in and Account Load (Priority: P1) 🎯 MVP

**Goal**: A single test navigates to `/login`, signs in with env-var credentials, and asserts the sidebar shows at least one account name with no error message.

**Independent Test**: Run `npm run e2e` locally against the dev server with valid `.env` — test passes. Remove API connectivity (stop the server) — test fails.

### Implementation for User Story 1

- [ ] T005 [US1] Inspect the sidebar component in `src/components/` to identify the DOM element that renders each account name, and confirm whether a `data-testid` attribute exists on those elements
- [ ] T006 [US1] If no `data-testid="account-item"` exists on account list items in the sidebar component (`src/components/`), add `data-testid="account-item"` to the repeating account element
- [ ] T007 [US1] Create `e2e/auth.spec.ts` with test `"sign-in and account load"`: navigate to `/login`, fill `getByLabel(/email/i)` from `process.env.E2E_EMAIL`, fill `getByLabel(/password/i)` from `process.env.E2E_PASSWORD`, click `getByRole("button", { name: /sign in/i })`, wait for URL to leave `/login` (timeout 15 000 ms), assert `getByText("Failed to load accounts")` is NOT visible, assert `locator("[data-testid='account-item']").first()` is visible (timeout 15 000 ms)

**Checkpoint**: `npm run e2e` passes locally with valid credentials against the running dev server.

---

## Phase 4: User Story 2 — Configurable Target Environment (Priority: P1)

**Goal**: Switching `E2E_BASE_URL` from local to production URL (and back) requires no code changes.

**Independent Test**: Set `E2E_BASE_URL=http://localhost:5173` — test targets local. Set `E2E_BASE_URL=https://finance-analyser-seven.vercel.app` — test targets production. Unset `E2E_BASE_URL` — test defaults to `http://localhost:5173`.

### Implementation for User Story 2

- [ ] T008 [US2] Verify `playwright.config.ts` `baseURL` logic: confirm the config reads `process.env.E2E_BASE_URL` and falls back to `"http://localhost:5173"` when the variable is absent — no code change needed if T004 is correctly implemented; update if the fallback is missing

**Checkpoint**: `E2E_BASE_URL=https://finance-analyser-seven.vercel.app npm run e2e` passes against the live production deployment.

---

## Phase 5: User Story 3 — CI Pipeline Integration (Priority: P2)

**Goal**: The E2E test runs automatically on every push to `main` and on every pull request, blocking merges on failure.

**Independent Test**: Open a pull request and verify the `e2e` CI job appears in the checks list after `quality` completes, and turns green on a healthy branch.

### Implementation for User Story 3

- [ ] T009 [US3] Add `e2e` job to `.github/workflows/ci.yml` with: `needs: [quality]`, `runs-on: ubuntu-latest`, Node 20 setup with npm cache, `npm ci`, `npx playwright install --with-deps chromium`, `npm run e2e` with env `E2E_BASE_URL=https://finance-analyser-seven.vercel.app` and `E2E_EMAIL`/`E2E_PASSWORD` from `${{ secrets.E2E_EMAIL }}` / `${{ secrets.E2E_PASSWORD }}`, upload `playwright-report/` artifact on failure (retention 7 days)

**Checkpoint**: PR CI shows `e2e` check after `quality` completes; check is green on a clean branch.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T010 [P] Verify `npx playwright show-report` opens an HTML report after a local test run (confirms artifact upload will work in CI)
- [ ] T011 Confirm `.gitignore` excludes `playwright-report/` and `test-results/` directories — add entries if missing

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 — primary MVP deliverable
- **Phase 4 (US2)**: Depends on Phase 2 — can start in parallel with US1 (different files)
- **Phase 5 (US3)**: Depends on Phase 3 being green (CI needs a passing test to verify)
- **Phase 6 (Polish)**: Depends on all user story phases

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — no story dependencies
- **US2 (P1)**: Depends on Foundational only — inherently satisfied by the same `playwright.config.ts` as US1
- **US3 (P2)**: Depends on US1 being green — CI job is pointless without a working test

### Parallel Opportunities

- T002 and T003 can run in parallel (different files)
- T005 and T008 can run in parallel (US1 research and US2 config verification)
- T010 and T011 can run in parallel (polish tasks, different files)

---

## Parallel Example: Phase 1 Setup

```
# Launch in parallel:
Task T002: "Add e2e script to package.json"
Task T003: "Add E2E vars to .env.example"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004) — **blocks everything**
3. Complete Phase 3: User Story 1 (T005–T007)
4. **STOP and VALIDATE**: `npm run e2e` passes locally
5. Proceed to US2 verification (T008) and US3 CI job (T009)

### Incremental Delivery

1. T001–T004 → Playwright installed and configured
2. T005–T007 → E2E test written and passing locally (MVP)
3. T008 → Env-var switching confirmed
4. T009 → CI wired up and green
5. T010–T011 → Polish done

---

## Notes

- `[P]` tasks touch different files and have no inter-task dependencies
- T006 (adding `data-testid`) requires a frontend code change — confirm selector in T005 first
- GitHub Secrets `E2E_EMAIL` and `E2E_PASSWORD` must be set in repo **Settings → Secrets → Actions** before T009 can be verified in CI (user action — not a code task)
- Never hardcode credentials in any source file
