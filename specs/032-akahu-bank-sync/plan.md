# Implementation Plan: Akahu Bank Sync — Connection Management & Transaction Sync

**Branch**: `772-akahu-bank-sync` | **Date**: 2026-05-31 | **Spec**: [spec.md](spec.md)
**Feature ID**: FA-BANK-002

## Summary

Add a backend sync service and six API endpoints that allow the owner to
connect their Akahu integration, link individual bank accounts, and trigger
a manual transaction sync. The sync pulls live balances and transaction
history from Akahu, deduplicates against existing records, and stores new
transactions directly into the existing `transactions` table. No UI is
included — FA-BANK-003 covers the UI layer.

## Technical Context

**Language/Version**: TypeScript (Node.js 20, ESM)
**Primary Dependencies**: Express, Drizzle ORM, Zod, `akahu` v2.5.1 (new package), Node.js built-in `crypto` (via FA-BANK-001 encryption utility)
**Storage**: PostgreSQL — reads/writes `akahu_connections`, `akahu_account_links`, `transactions`
**Testing**: Vitest — unit tests for `akahuSync.ts` service; route-level tests follow existing pattern
**Target Platform**: Render Web Service (Express / Node.js server)
**Project Type**: Web application — backend service + API routes only
**Performance Goals**: Sync completes synchronously per request; no background workers
**Constraints**: Token must never appear in any API response. Sync failures per account must not affect other accounts.
**Scale/Scope**: Single-user app; one connection, multiple linked accounts.

**Note on `src/server/services/`**: This directory already exists (`authService.ts`, `emailService.ts`). No directory creation needed.

## Constitution Check

| Rule                              | Status  | Notes                                                                                                          |
| --------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| GR-1 (no silent assumptions)      | ✅ Pass | Akahu SDK package confirmed: `akahu` v2.5.1; all decisions in research.md                                      |
| GR-2 (no secrets in files/output) | ✅ Pass | `encryptedUserToken` excluded from all responses; `ENCRYPTION_KEY` and `AKAHU_APP_TOKEN` sourced from env only |
| GR-3 (no localStorage changes)    | ✅ Pass | Backend-only feature                                                                                           |
| GR-4 (DoR before implementation)  | ✅ Pass | Spec and plan complete; tasks pending                                                                          |
| GR-5 (DoD before merge)           | ✅ Pass | QA agent enforces                                                                                              |
| GR-6 (do less, ask more)          | ✅ Pass | Manual sync only; no background jobs; no UI                                                                    |
| GR-7 (one story per PR)           | ✅ Pass | Each task delivered as individual PR                                                                           |

**Prerequisite**: FA-BANK-001 must be merged and deployed before any FA-BANK-002 story can be implemented — the `akahu_connections` and `akahu_account_links` tables must exist.

## Project Structure

### Documentation (this feature)

```text
specs/032-akahu-bank-sync/
├── plan.md          ← this file
├── research.md      ← Phase 0 output
├── data-model.md    ← Phase 1 output
├── contracts/       ← Phase 1 output (6 REST endpoints)
└── tasks.md         ← Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
package.json                                  ← add "akahu" dependency
src/
  server/
    services/
      akahuSync.ts                            ← new: syncUserAccounts() service function
    routes/
      akahuSync.ts                            ← new: 6 endpoints mounted at /api/bank
    index.ts                                  ← edit: mount akahuSyncRouter at /api/bank
```

**Structure Decision**: All new code goes into the existing single-project
`src/server/` layout. Two new files created (`services/akahuSync.ts`,
`routes/akahuSync.ts`), two files edited (`index.ts`, `package.json`).
No new directories needed.
