# Research: AI Chat Enhancements

**Branch**: `001-ai-chat-enhancements` | **Date**: 2026-04-19

## Unknowns Resolved

### 1. How to key chat history when the panel spans all accounts?

**Decision**: Use a single constant key `"global"` as the `accountId` for `loadChatHistory` / `saveChatHistory`.

**Rationale**: The chat panel is app-wide — it can answer questions about any or all loaded accounts. Tying history to `activeAccountId` would cause conversations to disappear when the user switches accounts, which is confusing. A single global history is simpler and matches user expectation for a cross-account assistant.

**Alternatives considered**:

- Per `activeAccountId`: Rejected — switching accounts erases visible history.
- Separate localStorage key (bypass `chatStorage`): Rejected — `chatStorage.ts` already exists with the right abstraction; duplication adds no value.

---

### 2. How should `buildFinanceContext` load all accounts?

**Decision**: Replace calls to deprecated `getStoredMonths()` / `loadTransactions()` with `getAccounts()` + `getAccountMonths(id)` + `getTransactions(id, monthKey)`, iterating every account and grouping the output under each account's name.

**Rationale**: `getStoredMonths()` / `loadTransactions()` are documented as deprecated wrappers that only read `DEFAULT_ACCOUNT_ID`. Using the proper multi-account API ensures users with multiple accounts get full context in AI responses.

**Alternatives considered**:

- Keep deprecated wrappers: Rejected — spec explicitly requires multi-account context.
- Pass account data as a parameter from a React component: Rejected — `buildFinanceContext` is a pure service function; keeping it self-contained is cleaner and avoids threading account state through the call stack.

---

### 3. Should history hydration use a custom hook or inline `useEffect`?

**Decision**: Extract a `useChatHistory` hook in `src/hooks/useChatHistory.ts`.

**Rationale**: `ChatPanel.tsx` is already near the 150-line limit (176 lines). Adding inline `useEffect` + save logic would push it well over. A hook keeps ChatPanel clean, keeps storage logic testable in isolation, and is consistent with the existing `useFileUpload` pattern.

**Alternatives considered**:

- Inline `useEffect` in ChatPanel: Rejected — component size limit would be violated.
- Context-level persistence: Rejected — overkill for a single panel; adds unnecessary coupling.

---

### 4. When should history be saved?

**Decision**: Save after every completed exchange (after the streaming `onDone` callback fires), not after every chunk.

**Rationale**: Saving per-chunk would cause ~50–100 localStorage writes per response. Saving only on `onDone` means at most 1 write per message pair while still satisfying FR-003 ("save immediately after sent or received").

**Alternatives considered**:

- Save on every streaming chunk: Rejected — excessive writes, no user-visible benefit.
- Save only when panel closes: Rejected — a browser crash before panel close would lose the last message.

---

### 5. How to handle the case where no accounts are loaded?

**Decision**: `buildFinanceContext` already returns `"The user has not uploaded any financial data yet."` when `months.length === 0`. After the multi-account update, the same guard applies when zero accounts are stored.

**Rationale**: No new UI needed — the AI's response naturally conveys the empty state.
