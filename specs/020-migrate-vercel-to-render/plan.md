# Implementation Plan: Migrate Deployment from Vercel to Render

**Branch**: `020-migrate-vercel-to-render` | **Date**: 2026-05-16 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/020-migrate-vercel-to-render/spec.md`

## Summary

Migrate the Finance Analyser from Vercel (serverless functions + static hosting) to Render (Web Service for the Express API + Static Site for the Vite frontend). The key code changes are: remove the Vercel-specific `app.listen()` guard, add CORS middleware, promote `cors` and `tsx` to production dependencies, remove all Vercel/Railway artefacts, and update the Playwright config to use a 60-second timeout and drop the Vercel bypass header.

## Technical Context

**Language/Version**: TypeScript 5.9, Node.js 20+  
**Primary Dependencies**: Express 5, Vite 8, Playwright, Vitest, Drizzle ORM  
**Storage**: Supabase PostgreSQL (direct connection port 5432 on Render)  
**Testing**: Vitest (unit), Playwright (E2E)  
**Target Platform**: Render — Web Service (Node runtime) + Static Site  
**Project Type**: Web application (React SPA frontend + Express REST API)  
**Performance Goals**: Sub-60 s login flow (accommodating Render free-tier cold start)  
**Constraints**: Free-tier Render Web Service spins down after 15 min; E2E must allow 60 s  
**Scale/Scope**: Single-user personal finance tool

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Rule                                              | Status | Notes                                                            |
| ------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| No assumptions about product requirements         | PASS   | Spec is fully specified; Render URLs provided by user            |
| No credentials exposed                            | PASS   | No secrets in code; `.env.example` uses placeholders             |
| No localStorage schema changes                    | PASS   | No frontend data model changes                                   |
| Definition of Ready checked before implementation | PASS   | Spec has acceptance criteria, technical notes, success criteria  |
| Definition of Done check before merging           | PASS   | QA agent enforces this                                           |
| Do less and ask more                              | PASS   | All decisions explicit in spec; Render dashboard setup is manual |

No constitution violations found. No complexity tracking required.

## Phase 0: Research

### R-001: CORS in Express 5

**Decision**: Use the `cors` npm package (already has `@types/cors` in devDependencies).  
**Rationale**: Industry-standard, well-maintained, works with Express 5. The `@types/cors` type package already present confirms the team was already aware of it.  
**Alternatives considered**: Manual `Access-Control-Allow-Origin` headers — rejected as error-prone and incomplete.

### R-002: Render Static Site SPA routing

**Decision**: Add a `render.yaml` rewrite rule (or configure in dashboard) so all non-asset paths serve `index.html`. Alternatively, add a `_redirects` file in `public/` (Render supports this for static sites).  
**Rationale**: The Vite SPA uses React Router with browser history; direct URL access to any route (e.g., `/dashboard`) must return `index.html`.  
**Alternatives considered**: `render.yaml` IaC — the spec does not ask us to automate Render dashboard setup, so a `_redirects` file in `public/` is the simplest code-only approach.

### R-003: `tsx` in production

**Decision**: Move `tsx` from `devDependencies` to `dependencies`.  
**Rationale**: Render runs `npm install --omit=dev` in production; `tsx` is needed by `npm run server:start` (`tsx src/server/index.ts`).  
**Alternatives considered**: Compile TS to JS at build time — heavier change, out of scope.

### R-004: `cors` package

**Decision**: Add `cors` to `dependencies` (currently absent from both sections).  
**Rationale**: Required by FR-005. The `@types/cors` in devDependencies is only types; the runtime package is missing.  
**Alternatives considered**: None — explicit requirement.

### R-005: Vercel `app.listen()` guard removal

**Decision**: Remove the `if (!process.env.VERCEL)` guard so `app.listen()` always runs.  
**Rationale**: Required by FR-003. Render is a long-running process, not a serverless function.  
**Alternatives considered**: Keep guard, add `RENDER=true` env — needlessly complex.

### R-006: Playwright timeout

**Decision**: Raise the global `timeout` in `playwright.config.ts` to `60_000` ms.  
**Rationale**: Render free tier cold-start can take ~30 s. FR-009 mandates 60-second budget.  
**Alternatives considered**: Per-test timeouts — less maintainable.

### R-007: SPA `_redirects` for Render Static Site

**Decision**: Add `public/_redirects` containing `/* /index.html 200`.  
**Rationale**: Render Static Sites natively support a `_redirects` file (Netlify-compatible format) to serve `index.html` for all SPA routes. Zero dashboard config needed.  
**Alternatives considered**: `render.yaml` — would automate infrastructure the spec says is done manually.

## Phase 1: Design & Contracts

### Data Model

No new entities or schema changes. This feature is purely a deployment platform migration.

See [data-model.md](./data-model.md).

### API Contracts

The existing REST API contracts do not change. All endpoints remain the same.

See [contracts/api.md](./contracts/api.md).

## Project Structure

### Documentation (this feature)

```text
specs/020-migrate-vercel-to-render/
├── plan.md              ← this file
├── research.md          ← consolidated in plan Phase 0
├── data-model.md        ← no changes
├── contracts/
│   └── api.md           ← no changes to endpoints
└── tasks.md             ← generated by /speckit-tasks
```

### Source Code (files touched by this feature)

```text
src/server/index.ts          # Remove VERCEL guard; add CORS middleware
package.json                 # Remove vercel-build; move tsx+cors to deps
playwright.config.ts         # 60 s timeout; remove VERCEL bypass header
.env.example                 # Remove Vercel vars; add Render-correct values
public/_redirects            # NEW: SPA fallback for Render Static Site

# DELETED:
vercel.json
api/index.ts
api/index.js                 # (if present)
railway.toml
.vercel/                     # directory
```

**Structure Decision**: Single-project monorepo — frontend (`src/`) and backend (`src/server/`) co-located at repo root. Unchanged by this feature.

## Stories (preview — full list in tasks.md)

| #   | Story                                                                | Type   |
| --- | -------------------------------------------------------------------- | ------ |
| 1   | Remove Vercel/Railway artefacts from repository                      | Non-UI |
| 2   | Update Express server to always start HTTP server and add CORS       | Non-UI |
| 3   | Move `cors` and `tsx` to production dependencies                     | Non-UI |
| 4   | Update Playwright config for Render (60 s timeout, no Vercel header) | Non-UI |
| 5   | Update `.env.example` for Render deployment                          | Non-UI |
| 6   | Add `public/_redirects` for Render Static Site SPA routing           | Non-UI |
