# Tasks: AI Chat Enhancements

**Input**: Design documents from `specs/001-ai-chat-enhancements/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅

**Format**: `[ID] [P?] [Story?] Description with file path`

- **[P]**: Parallelizable (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1, US4)

---

## Status of User Stories

| Story                         | Priority | Status                            |
| ----------------------------- | -------- | --------------------------------- |
| US1 — Persistent Chat History | P1       | ❌ Not wired — tasks below        |
| US2 — Suggested Prompts       | P2       | ✅ Already implemented — no tasks |
| US3 — Streaming Responses     | P3       | ✅ Already implemented — no tasks |
| US4 — Multi-Account Context   | P4       | ⚠️ Partial — tasks below          |

US2 and US3 have no tasks: `SuggestedPrompts.tsx`, `SUGGESTED_PROMPTS`, and `streamChatResponse` are fully working. Implementation effort is concentrated on US1 (persistence wiring) and US4 (multi-account context fix).

---

## Phase 1: Setup

No new dependencies, frameworks, or project structure changes required. All files slot into the existing `src/hooks/`, `src/services/`, and `src/components/` directories per the architecture.

_No tasks — proceed directly to foundational phase._

---

## Phase 2: Foundational (Blocking Prerequisite for US1)

**Purpose**: Create the `useChatHistory` hook that encapsulates all load/save logic. ChatPanel (US1) depends on this. US4 is independent and can start in parallel.

**⚠️ CRITICAL**: T001 and T002 must complete before T003 (ChatPanel wiring).

- [ ] T001 Create `src/hooks/useChatHistory.ts` — hook that loads from `chatStorage.loadChatHistory("global")` on mount, exposes `displayMessages`, `apiHistory`, `appendUserMessage`, `setStreamingMessage`, `markStreamingDone`, `setError` (see data-model.md for full interface)
- [ ] T002 Create `src/hooks/useChatHistory.test.ts` — unit tests covering: initial load from localStorage, `appendUserMessage` persists immediately, `markStreamingDone` persists completed assistant message, `setError` does not persist, messages trimmed to 100 per MAX_MESSAGES

**Checkpoint**: `useChatHistory` is importable and all tests pass before proceeding to US1.

---

## Phase 3: User Story 1 — Persistent Chat History (Priority: P1) 🎯 MVP

**Goal**: Chat messages survive page reloads and browser restarts.

**Independent Test**: Open ChatPanel, send 2 messages, reload the page — both messages (user + assistant) reappear in correct order.

### Implementation for User Story 1

- [ ] T003 [US1] Refactor `src/components/ChatPanel.tsx` — replace inline `messages`/`history` useState with `useChatHistory` hook; remove local state; wire `appendUserMessage`, `setStreamingMessage`, `markStreamingDone`, `setError` into `streamChatResponse` callbacks
- [ ] T004 [US1] Update `src/components/ChatPanel.test.tsx` — add tests: history loads on mount (mock chatStorage), new messages are persisted after send, streaming error does not corrupt history, empty state shows when no history

**Checkpoint**: Reload the app after a conversation — history is visible. ChatPanel test suite passes.

---

## Phase 4: User Story 2 — Suggested Prompts (Priority: P2)

**Already implemented.** No tasks. Components: `src/components/SuggestedPrompts.tsx`, `src/constants/suggestedPrompts.ts`. Behaviour verified: prompts shown when `messages.length === 0`, hidden after first message.

---

## Phase 5: User Story 3 — Streaming Responses (Priority: P3)

**Already implemented.** No tasks. `streamChatResponse` in `src/services/claudeChat.ts` streams token-by-token; `ChatPanel.tsx` renders progressively with `isStreaming` flag and typing indicator.

---

## Phase 6: User Story 4 — Multi-Account Context (Priority: P4)

**Goal**: AI responses draw on data from all loaded accounts, not just the default one.

**Independent Test**: Load two accounts, ask "What is my total balance?" — the response references both accounts.

**Note**: Independent of US1 — can be implemented in parallel with Phase 2/3.

- [ ] T005 [P] [US4] Update `buildFinanceContext()` in `src/services/claudeChat.ts` — replace `getStoredMonths()` / `loadTransactions()` (deprecated, DEFAULT_ACCOUNT_ID only) with `getAccounts()` + `getAccountMonths(id)` + `getTransactions(id, monthKey)`, grouping output under each account's `name` field; preserve existing empty-state guard
- [ ] T006 [P] [US4] Update `src/services/claudeChat.test.ts` — add tests: `buildFinanceContext` includes data from two accounts, `buildFinanceContext` includes account names as section headers, empty-state string returned when no accounts exist

**Checkpoint**: `buildFinanceContext` unit tests pass with two-account fixture. Manual test with two loaded accounts confirms cross-account data in AI response.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T007 [P] Create `src/services/chatStorage.test.ts` — unit tests for `loadChatHistory` (empty default), `saveChatHistory` (persists and trims to 100), `clearChatHistory` (removes key), storage error handled gracefully

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No tasks
- **Phase 2 (Foundational)**: Start immediately — blocks T003/T004 (US1)
- **Phase 3 (US1)**: Depends on T001, T002
- **Phase 4 (US2)**: Already done
- **Phase 5 (US3)**: Already done
- **Phase 6 (US4)**: Independent of Phase 2/3 — can start immediately in parallel
- **Phase 7 (Polish)**: After all story phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational (T001, T002)
- **US4 (P4)**: No dependencies on US1 — fully independent

### Within Each Story

- T001 → T002 → T003 → T004 (US1 chain)
- T005 → T006 (US4 chain, parallel to US1)

### Parallel Opportunities

- T005 and T006 (US4) can run in parallel with T001–T004 (US1 + foundational)
- T007 (chatStorage tests) can run in parallel with anything after T001

---

## Parallel Execution Example

```text
# Stream A — US1 Persistence:
T001: Create useChatHistory.ts
T002: Create useChatHistory.test.ts   (after T001)
T003: Refactor ChatPanel.tsx          (after T002)
T004: Update ChatPanel.test.tsx       (after T003)

# Stream B — US4 Multi-Account (parallel to Stream A):
T005: Update buildFinanceContext()
T006: Update claudeChat.test.ts       (after T005)

# Stream C — Polish (after both streams):
T007: Create chatStorage.test.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Create `useChatHistory` hook (T001, T002)
2. Complete Phase 3: Wire ChatPanel (T003, T004)
3. **STOP and VALIDATE**: Reload page — history persists. Tests pass.
4. Ship US1 independently.

### Incremental Delivery

1. T001–T004 → US1 (Persistent History) ✅
2. T005–T006 → US4 (Multi-Account Context) ✅
3. T007 → Polish ✅

Total: **7 tasks** across 2 active stories (US2 and US3 already shipped).

---

## Notes

- US2 (Suggested Prompts) and US3 (Streaming) are **already implemented** — verify they remain working after ChatPanel refactor (T003)
- `chatStorage.ts` uses key `"global"` for the chat panel (per research.md decision 1)
- Golden Rule 3: localStorage schema is unchanged — `chatStorage.ts` already defines `finance-analyser-chat` key; this story only begins writing to it
- `ChatPanel.tsx` is 176 lines — T003 must not push it over 150 lines; extract helpers to `useChatHistory` if needed
- All file paths relative to `src/` as per `docs/architecture.md`
