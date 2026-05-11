# Research: FA-E2E-001 — Playwright End-to-End Test Suite

## Playwright vs Alternatives

- **Decision**: Playwright with TypeScript
- **Rationale**: First-class TypeScript support, Chromium bundled, works headless out-of-the-box, `@playwright/test` is the test runner (no separate Jest/Vitest integration needed), widely supported in GitHub Actions via `microsoft/playwright-github-action` or direct `npx playwright install`
- **Alternatives considered**: Cypress (heavier, browser install separate, slower CI), Selenium (verbose Java-era API, poor TS ergonomics), Puppeteer (no built-in test runner, assertions are manual)

## CI Strategy — Local server vs deployed app

- **Decision**: Run E2E tests against the live production deployment (`https://finance-analyser-seven.vercel.app`) in CI — no local dev server spun up
- **Rationale**: Spinning up a full-stack app in CI (Vite frontend + Express API + Supabase) requires complex service orchestration and environment secrets. Running against the already-deployed Vercel app is simpler, faster, and tests the real production path
- **Trade-off**: E2E tests in CI now depend on production uptime. Acceptable for a single-test suite at this stage
- **Alternatives considered**: `vite preview` + mock API (doesn't test real API), full docker-compose stack (too complex for current team size)

## Test credentials management

- **Decision**: `E2E_EMAIL` and `E2E_PASSWORD` as GitHub Actions secrets, injected as env vars at CI runtime; locally read from `.env` via `dotenv` or direct shell export
- **Rationale**: Credentials must never be in source code. GitHub Secrets are the standard mechanism; `.env` for local dev is already the project pattern
- **The test user**: Must be a real account in the production Supabase database with at least one linked bank account — the test asserts account visibility

## Playwright config key decisions

| Setting    | Value                                                 | Reason                                                         |
| ---------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| `testDir`  | `e2e/`                                                | Keeps E2E tests separate from Vitest unit tests in `src/`      |
| Browser    | Chromium only                                         | Minimal scope for initial suite; multi-browser is out of scope |
| `headless` | `!!process.env.CI`                                    | Headed locally for debugging, headless in CI                   |
| `baseURL`  | `process.env.E2E_BASE_URL ?? 'http://localhost:5173'` | Single env var to switch targets                               |
| `timeout`  | 30 000ms per test                                     | Allows for cold API start on production                        |
| Retries    | 1 in CI, 0 locally                                    | Handles transient network flakes without masking real failures |

## CI job placement

- **Decision**: New `e2e` job that `needs: [quality]` — runs after the existing quality job passes
- **Rationale**: No point running E2E if unit tests/typecheck/build already failed; keeps fast feedback for code quality separate from slower browser tests
- **Artifact**: Upload Playwright HTML report on failure (`if: failure()`) so developers can inspect screenshots and traces

## Existing CI file

Single job `quality` on `ubuntu-latest`, Node 20, runs: typecheck → lint → test → build → publish test results. The E2E job will be added alongside it, not nested inside it.
