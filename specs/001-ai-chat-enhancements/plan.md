# Implementation Plan: AI Chat Enhancements

**Branch**: `001-ai-chat-enhancements` | **Date**: 2026-04-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-ai-chat-enhancements/spec.md`

## Summary

Wire up the existing but disconnected `chatStorage` service to `ChatPanel` so messages survive reloads, and upgrade `buildFinanceContext` to include all accounts rather than only the default one. Streaming and suggested prompts are already fully implemented and require no changes.

## Technical Context

**Language/Version**: TypeScript (strict mode), React 18  
**Primary Dependencies**: React hooks, Anthropic SDK (`@anthropic-ai/sdk`)  
**Storage**: Browser `localStorage` via `src/services/chatStorage.ts` (already exists)  
**Testing**: Vitest + React Testing Library  
**Target Platform**: Browser (SPA, Vite build)  
**Project Type**: Web application (frontend-only, no backend)  
**Performance Goals**: First chat token visible within 2 s; history load imperceptible (<50 ms)  
**Constraints**: localStorage only; no server; no auth; single user  
**Scale/Scope**: Single-user, 1–10 accounts, up to 100 persisted messages per chat store

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Rule                                          | Status      | Notes                                                                                                                                                                                                                                              |
| --------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. No silent product assumptions              | ✅          | All 4 features explicitly specified in GitHub issue #53                                                                                                                                                                                            |
| 2. No credentials exposed                     | ✅          | API key read from `.env` via `import.meta.env` — existing pattern                                                                                                                                                                                  |
| 3. localStorage schema change must be flagged | ⚠️ **FLAG** | `chatStorage.ts` already exists with key `"finance-analyser-chat"`. The schema (`PersistedMessage[]` per account) is unchanged — ChatPanel just needs to read/write it. No schema migration needed. Flagging for user awareness per Golden Rule 3. |
| 4. DoR check before implementation            | ✅          | Will be enforced by QA agent                                                                                                                                                                                                                       |
| 5. DoD check before merging                   | ✅          | Will be enforced by QA agent                                                                                                                                                                                                                       |
| 6. Do less when in doubt                      | ✅          | Streaming and SuggestedPrompts already done — we implement only the missing wiring                                                                                                                                                                 |

**Schema flag resolution**: `chatStorage.ts` schema (`finance-analyser-chat` → `Record<accountId, PersistedMessage[]>`) was introduced in a prior story and is already live. This story adds no new keys or structural changes — it only begins writing to the existing structure. No migration needed.

## Current State Analysis (from codebase audit)

| Feature               | Spec Requirement | Current State                                                                                                  | Gap                                                                                             |
| --------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Streaming responses   | FR-007–009       | ✅ Already implemented in `claudeChat.ts` + `ChatPanel.tsx`                                                    | None                                                                                            |
| Suggested prompts     | FR-004–006       | ✅ Already implemented — `SuggestedPrompts.tsx` + `SUGGESTED_PROMPTS` constant                                 | Prompts are static (not contextual); acceptable for v1                                          |
| Persistent history    | FR-001–003       | ❌ `chatStorage.ts` exists but `ChatPanel` never calls `loadChatHistory` / `saveChatHistory`                   | Wire ChatPanel to chatStorage                                                                   |
| Multi-account context | FR-010–011       | ⚠️ Partial — `buildFinanceContext()` uses deprecated `getStoredMonths()` which reads only `DEFAULT_ACCOUNT_ID` | Update to iterate all accounts via `getAccounts()` + `getAccountMonths()` + `getTransactions()` |

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-chat-enhancements/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit-tasks command)
```

### Source Code (affected files)

```text
src/
├── components/
│   ├── ChatPanel.tsx           ← add history persistence wiring
│   └── ChatPanel.test.tsx      ← add persistence tests
├── services/
│   ├── chatStorage.ts          ← no changes (already complete)
│   ├── chatStorage.test.ts     ← new: unit tests for storage service
│   └── claudeChat.ts           ← update buildFinanceContext for multi-account
│   └── claudeChat.test.ts      ← extend: add multi-account context tests
└── hooks/
    └── useChatHistory.ts       ← new: extracted hook for load/save logic
    └── useChatHistory.test.ts  ← new: hook tests
```
