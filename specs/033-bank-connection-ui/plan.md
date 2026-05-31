# Implementation Plan: Bank Connection and Sync Interface

**Branch**: `773-bank-connection-ui` | **Date**: 2026-05-31 | **Spec**: [spec.md](spec.md)
**Feature ID**: FA-BANK-003

## Summary

Add a `/settings/bank` page to Finance Analyser that lets the owner connect
their Akahu integration, map bank accounts to Finance Analyser accounts, and
trigger a manual transaction sync. Implemented as a new `BankContext`,
`BankConnectionPage`, and five sub-components, wired into the existing provider
tree and sidebar navigation. Frontend only — all API endpoints are provided
by FA-BANK-002.

## Technical Context

**Language/Version**: TypeScript + React 18 (Vite, ESM)
**Primary Dependencies**: React Router v6, existing `useApi`/`apiFetch` from `src/lib/api.ts`, `useToast`/`addToast` from `src/hooks/useToast`, `useAccount` from existing `AccountContext`
**Storage**: No new client-side storage; context state only
**Testing**: Vitest + React Testing Library (existing pattern); Playwright for E2E (QA agent)
**Target Platform**: Browser (Render Static Site)
**Project Type**: Web application — frontend UI only
**Performance Goals**: Page load follows existing SPA patterns; sync progress shown optimistically
**Constraints**: `encryptedUserToken` must never be rendered or logged client-side; BankProvider must be placed inside the existing `AccountProvider` tree so `useAccount()` is accessible to `AccountMappingRow`

**Prerequisite**: FA-BANK-001 and FA-BANK-002 must be merged and deployed before this feature is functional end-to-end. The page renders in a not-connected state if the API returns 404.

## Constitution Check

| Rule                              | Status  | Notes                                                                                                            |
| --------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------- |
| GR-1 (no silent assumptions)      | ✅ Pass | Pattern confirmed from AccountContext.tsx; sidebar NAV array pattern confirmed                                   |
| GR-2 (no secrets in files/output) | ✅ Pass | `encryptedUserToken` is absent from `ApiAkahuConnection`; tokens submitted via POST only, not stored client-side |
| GR-3 (no localStorage changes)    | ✅ Pass | No localStorage reads/writes introduced by this feature                                                          |
| GR-4 (DoR before implementation)  | ✅ Pass | Spec and plan complete; tasks pending                                                                            |
| GR-5 (DoD before merge)           | ✅ Pass | QA agent enforces                                                                                                |
| GR-6 (do less, ask more)          | ✅ Pass | Strictly scoped to the settings page; no changes to dashboard or existing pages                                  |
| GR-7 (one story per PR)           | ✅ Pass | Each task delivered as individual PR                                                                             |

## Project Structure

### Documentation (this feature)

```text
specs/033-bank-connection-ui/
├── plan.md          ← this file
├── research.md      ← Phase 0 output
├── data-model.md    ← Phase 1 output (component tree + context interface)
└── tasks.md         ← Phase 2 output (/speckit-tasks)
```

No `contracts/` — this feature consumes the FA-BANK-002 API; contracts are in
`specs/032-akahu-bank-sync/contracts/api-bank.md`.

### Source Code (repository root)

```text
src/
  types/
    api.ts                              ← edit: add ApiAkahuConnection, ApiAkahuAccountLink, SyncResult
  context/
    BankContext.tsx                     ← new: BankProvider + useBankContext hook
  pages/
    BankConnectionPage.tsx              ← new: page + 5 sub-components
  components/
    Sidebar.tsx                         ← edit: add Bank Connection nav item to NAV array
  App.tsx                               ← edit: add BankProvider + /settings/bank route
```

**Structure Decision**: All new code in existing directories. Five files touched
total — two new, three edited. No new directories.
