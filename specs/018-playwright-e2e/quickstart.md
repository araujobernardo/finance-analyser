# Quickstart: FA-E2E-001 — Playwright End-to-End Test Suite

## Prerequisites

- Node 20+ installed
- A test user exists in the production Supabase database with at least one linked account
- Test credentials available (email + password for that user)

## Local setup

Add to `.env`:

```
E2E_BASE_URL=http://localhost:5173
E2E_EMAIL=your-test-user@example.com
E2E_PASSWORD=your-test-password
```

## Step 1 — Run against local dev server

In terminal 1:

```bash
npm run dev          # start Vite on :5173
```

In terminal 2:

```bash
npm run server:dev   # start Express API on :3001
```

In terminal 3:

```bash
npm run e2e          # run Playwright tests
```

Expected: 1 test passes (`auth.spec.ts > sign-in and account load`)

## Step 2 — Run against production

```bash
E2E_BASE_URL=https://finance-analyser-seven.vercel.app \
E2E_EMAIL=your-test-user@example.com \
E2E_PASSWORD=your-test-password \
npm run e2e
```

Expected: same test passes against the live deployment

## Step 3 — Verify CI integration

Open a pull request. Confirm:

- The `e2e` job appears in the GitHub Actions checks list
- It runs after `quality` completes
- It passes on a healthy branch

## Step 4 — Debug a failing test

```bash
npm run e2e -- --headed        # watch the browser
npm run e2e -- --debug         # step through with Playwright Inspector
npx playwright show-report     # open the HTML report from the last run
```

## GitHub Actions secrets required

Add these in the repo Settings → Secrets → Actions:

- `E2E_EMAIL` — the test user's email address
- `E2E_PASSWORD` — the test user's password

`E2E_BASE_URL` is hardcoded in the CI job to `https://finance-analyser-seven.vercel.app` and does not need to be a secret.
