# Tasks: UX/UI Overhaul — Realign to Prototype

**Input**: Design documents from `specs/002-ux-ui-overhaul/`
**Branch**: `002-ux-ui-overhaul`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅
**Primary Reference**: `docs/prototype.jsx`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1–US6)
- Exact file paths are included in every task description

---

## Phase 1: Foundational — Design Tokens + Base Styles

**Purpose**: CSS token foundation and font wiring. ALL subsequent phases depend on this.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 Update `index.html` — remove any Inter font `<link>`; add Google Fonts preconnect + stylesheet for Sora (wght 300–700) and JetBrains Mono (wght 400–500) using the URL from `docs/prototype.jsx` line 4
- [ ] T002 Rewrite `src/index.css` `:root` block with all 11 CSS custom properties matching the prototype C object exactly: `--bg:#060d1a`, `--surface:#0c1526`, `--card:#111e33`, `--border:#1a2d4a`, `--accent:#10b981`, `--accent-dim:#065f46`, `--text:#e2e8f0`, `--muted:#64748b`, `--subtle:#94a3b8`, `--red:#f87171`, `--amber:#fbbf24`; set `font-family:'Sora',sans-serif` on `body`; add `box-sizing:border-box; margin:0; padding:0` reset on `*`
- [ ] T003 Add global utility styles to `src/index.css`: custom scrollbar (`width:6px`, transparent track, `var(--border)` thumb, `border-radius:3px`); `@keyframes pulse` for chat typing indicator (`0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)}`); `select option` background `var(--card)` and colour `var(--text)` (ref: prototype lines 1108–1116)

**Checkpoint**: `npm run dev` loads with dark background (#060d1a), Sora font visible, scrollbars styled.

---

## Phase 2: Foundational — App Shell + Sidebar

**Purpose**: Replace React Router + NavBar with the sidebar-based tab shell. Delivers US1 and US3 together (both live in the Sidebar).

**⚠️ CRITICAL**: Must be complete before Dashboard, Transactions, Chat, or Settings phases.

- [ ] T004 [P] Remove `<BrowserRouter>` wrapper from `src/main.tsx`; keep `<StrictMode>` and `<App />`; remove `react-router-dom` imports
- [ ] T005 Create `src/components/Sidebar.tsx` — implement the prototype Sidebar component (ref: `docs/prototype.jsx` lines 206–283) with props: `tab: string`, `setTab: (t:string)=>void`, `onUpload: (files:File[])=>void`, `uploadStatus: {type:string,msg:string}|null`, `txnCount: number`, `accountList: {short:string,display:string}[]`, `onRenameAccount: (short:string,name:string)=>void`; sections: brand header ("Finance" label in accent uppercase + "Analyser" h1 + txnCount), accounts section with coloured dot + display name + pencil rename button (inline input on click — Enter/blur commits max 20 chars, Escape cancels), Upload CSV button (accent green, multiple `.csv`) + status message + helper text, nav tabs (Dashboard/Transactions/AI Chat/Settings — active tab uses `var(--accent)` bg tint), footer "ASB Bank · NZD"; use `ACCOUNT_COLORS` constant `["#10b981","#60a5fa","#f472b6","#fbbf24","#a78bfa","#fb923c"]` for account dots
- [ ] T006 Create `src/components/Sidebar.css` — sidebar `width:224px`, `background:var(--surface)`, `border-right:1px solid var(--border)`, `height:100vh`, `position:sticky`, `top:0`, `flex-shrink:0`; all colours via `var(--*)` tokens only; no hardcoded hex
- [ ] T007 Rewrite `src/App.tsx` — remove all React Router imports; add `useState<'dashboard'|'transactions'|'chat'|'settings'>` for `tab`; lift to App: `txns`, `mm`, `budgets`, `categories`, `accountAliases`, `selectedMonths: string[]`, `uploadStatus`, `chatMessages`; derive `accountList` by deduplicating txns on `accountShort`; implement `handleRenameAccount`, `handleUpload` (auto-sets `tab('dashboard')` on success), `handleBulkCategoryChange`, persisted setters for each state (localStorage keys: `pfa-v3-transactions`, `pfa-v3-merchants`, `pfa-v3-budgets`, `pfa-v3-accounts`, `pfa-v3-categories`); load all keys on mount; render `<Sidebar>` + conditional content panels; remove `<NavBar>` and `<ChatPanel>` imports. Ref: `docs/prototype.jsx` lines 989–1157.
- [ ] T008 [P] Update `src/App.css` — root container: `display:flex; height:100vh; font-family:'Sora',sans-serif; background:var(--bg); color:var(--text); overflow:hidden`; content area: `flex:1; display:flex; flex-direction:column; overflow:hidden`
- [ ] T009 Delete `src/components/NavBar.tsx` and `src/components/NavBar.css`
- [ ] T010 Delete `src/components/ChatPanel.tsx` and `src/components/ChatPanel.css`

**Checkpoint**: App renders with 224px sidebar. Nav tabs switch content area. No top navbar. No URL changes. Upload button visible. Account rename pencil appears when accounts exist.

---

## Phase 3: User Story 1 — First-time Upload & Auto-Navigation (P1)

**Goal**: User uploads CSVs via sidebar, sees loading status, and lands on Dashboard automatically.

**Independent Test**: Open app with no data → upload a valid ASB CSV via sidebar → confirm Dashboard tab becomes active with data visible.

**Prototype reference**: `docs/prototype.jsx` lines 1049–1090 (handleUpload), 259–270 (upload status)

- [ ] T011 [US1] In `src/App.tsx` `handleUpload`: wire CSV parsing + AI categorisation into the App-level handler — read each file as text, parse with existing `csvParser.ts`, detect duplicate ids, run `detectTransfers`, run AI categorisation for uncategorised transactions using `categorisation.ts`, persist combined txns to localStorage, update `selectedMonths` to the newest imported month's array, call `setTab('dashboard')` on success, set error status on failure; status auto-clears after 5 s via `setTimeout`. Ref: prototype lines 1049–1090.
- [ ] T012 [US1] Delete `src/pages/UploadPage.tsx` (upload is now a sidebar action); remove any import of `UploadPage` from `src/App.tsx`
- [ ] T013 [US1] Verify `src/components/Sidebar.tsx` upload status display: loading = "⟳ " prefix + `var(--muted)` colour; success = `var(--accent)` colour; error = `var(--red)` colour; helper text "Select multiple files to import all accounts at once" shown below in `var(--muted)`

**Checkpoint**: Sidebar button → parse → categorise → Dashboard auto-navigates. Duplicate detection prevents re-import. Non-ASB files show error message.

---

## Phase 4: User Story 2 — Dashboard Multi-Month View (P1)

**Goal**: Dashboard shows toggleable month pills, averages in stats, dimmed trends, donut, largest expenses, and budget vs actual.

**Independent Test**: Upload 3+ months → select two month pills → stats show averages → trend bars dim unselected months → donut updates.

**Prototype reference**: `docs/prototype.jsx` lines 286–525 (Dashboard component)

- [ ] T014 [US2] Rewrite `src/pages/DashboardPage.tsx` — implement the complete prototype Dashboard: props `txns`, `months: string[]`, `selectedMonths: string[]`, `setSelectedMonths`, `budgets`, `accountList`, `categories`; local `acctFilter` state; `toggleMonth` guard (min 1 month always selected); derive `selTxns`, `real`, `spend`, `income`, `net`, `transferAmt`; `catData` (non-Income categories, exclude isTransfer, sorted descending); `acctBreakdown` per account; `trendData` (all months, mark which are selected); `budgetData` (filter budgets > 0); `top5` (top 5 non-credit txns); render: month pills row, account filter pills (only when >1 account), 4-column summary grid (Income/Spent/Net/Count cards with avg sub-labels when multiMonth), transfer notice bar, per-account breakdown cards (when acctFilter==="all" && >1 account), 2-column chart grid (SpendByCategory donut `innerRadius:52 outerRadius:85` with legend + LargestExpenses), MonthlyTrends bar chart (Cell opacity 0.25 for unselected months — only when >1 month of data), Budget vs Actual progress bars (limit × n for multiMonth), empty state. Ref: prototype lines 286–525.
- [ ] T015 [US2] Rewrite `src/pages/DashboardPage.css` — grid layouts; pill styles; stat card sizing; chart container heights; all via `var(--*)` tokens; no hardcoded hex
- [ ] T016 [US2] Delete `src/pages/HistoryPage.tsx` — Trends chart now in DashboardPage; remove any import of HistoryPage from `src/App.tsx`
- [ ] T017 [US2] In `src/App.tsx` confirm `selectedMonths: string[]` is passed to DashboardPage and `setSelectedMonths` updates the array correctly; default to `[lastMonth]` on initial load when txns exist

**Checkpoint**: Multi-month toggle works. Stats show monthly averages. Unselected months dimmed in bar chart. Donut, largest expenses, budget vs actual all render correctly.

---

## Phase 5: User Story 3 — Account Renaming in Sidebar (P2)

**Goal**: Pencil icon in sidebar opens inline input; committing the name updates it retroactively across all transactions.

**Independent Test**: Import two CSVs → click pencil next to one account → type new name → Enter → confirm update in sidebar, Dashboard pills, and Transactions table.

**Prototype reference**: `docs/prototype.jsx` lines 217–256 (Sidebar account rename logic)

- [ ] T018 [US3] Verify `src/components/Sidebar.tsx` inline rename: `editingShort`/`editVal` local state; `startEdit(short, display)` sets both; `commitEdit(short)` trims to 20 chars, calls `onRenameAccount(short, trimmed)`, clears `editingShort`; Escape sets `editingShort(null)` without saving; input `autoFocus`; styled with `var(--card)` bg, `var(--accent)` border
- [ ] T019 [US3] Verify `src/App.tsx` `handleRenameAccount(short, newName)`: updates `accountAliases` state and persists to `pfa-v3-accounts`; maps all txns where `t.accountShort === short` to `{...t, account: newName}`; persists updated txns to `pfa-v3-transactions`. Ref: prototype lines 1041–1046.

**Checkpoint**: Rename persists across page reload. All transaction rows for renamed account show new display name immediately.

---

## Phase 6: User Story 4 — Transactions Page (P2)

**Goal**: Transactions page has all prototype filters, payee-match bulk category update with toast, and show-transfers toggle.

**Independent Test**: Navigate to Transactions → filter by month → change category on a payee with multiple occurrences → toast shows count → "Show transfers" checkbox → dimmed transfer rows appear.

**Prototype reference**: `docs/prototype.jsx` lines 528–651 (Transactions component)

- [ ] T020 [US4] Update `src/pages/TransactionsPage.tsx` — replace with prototype Transactions logic: props `txns`, `accountList`, `categories`, `onBulkCategoryChange`; local state `search`, `filterCat`, `filterMonth`, `filterAccount`, `showTransfers`, `toast`; derive `months` from txns (desc); filter chain: transfer gate → month → account → category → search; sort descending by date; `handleCategoryChange(id, cat)`: find source payee, update all txns where payee substrings overlap (excluding transfers), call `onBulkCategoryChange`, show toast with count if >1 affected (auto-clear 4 s); table columns: Date, Account (if >1 account), Payee/Memo, Amount (JetBrains Mono, credits green, debits red, ↔ for transfers), Category (dropdown for non-transfers, read-only `<Tag>` for transfers); transfer rows 65% opacity, excluded from count label unless showTransfers checked. Ref: prototype lines 528–651.
- [ ] T021 [US4] Update `src/pages/TransactionsPage.css` — filter row layout; table cell sizing; toast bar; monospace amounts; transfer opacity; all via `var(--*)` tokens

**Checkpoint**: Filters work. Toast fires and auto-dismisses. Show-transfers toggle shows/hides transfer rows. Transfers show Tag instead of dropdown.

---

## Phase 7: User Story 5 — AI Chat Full Page (P2)

**Goal**: "AI Chat" tab renders a full-height page — no floating overlay. History persists across tab switches.

**Independent Test**: Click AI Chat tab → full-page layout visible (no overlay) → send question → receive reply → switch tab → return → history preserved.

**Prototype reference**: `docs/prototype.jsx` lines 655–740 (Chat component)

- [ ] T022 [US5] Create `src/pages/ChatPage.tsx` — implement prototype Chat as full page: props `txns`, `budgets`, `categories`, `messages`, `setMessages`; local `input`, `loading`; `bottomRef` auto-scroll; `send(text?)`: append user message, call `claudeChat.ts` (reuse existing service — do not change it), append reply or error message; empty state when `!txns.length`; suggestion chips when `messages.length <= 1` (4 prompts: "How much did I spend last month across all accounts?", "Which account has the highest expenses?", "What is my biggest spending category?", "Where can I save $200/month?"); user bubbles right-aligned (accent border bg), assistant bubbles left-aligned (card bg); 32px avatar circles; typing indicator 3 dots with `pulse` animation; input + send button (disabled when empty/loading, Enter to send). Ref: prototype lines 655–740.
- [ ] T023 [US5] Create `src/pages/ChatPage.css` — `flex:1; display:flex; flex-direction:column; height:100%; overflow:hidden`; message area `flex:1; overflow-y:auto`; bubble max-width 75%; suggestion chips as pill buttons; input footer `border-top:1px solid var(--border)`; all via `var(--*)` tokens
- [ ] T024 [US5] In `src/App.tsx` confirm `chatMessages` (lifted in T007) is passed to `ChatPage` and persists across tab switches; confirm `ChatPanel` is fully absent from render tree and DOM

**Checkpoint**: No floating panel on any tab. Full-page chat renders. Suggestions on first load. History survives tab switching.

---

## Phase 8: User Story 6 — Settings: Categories & Budgets CRUD (P3)

**Goal**: Settings shows four sections. Categories support full CRUD with delete-reassignment and retroactive rename propagation.

**Independent Test**: Open Settings → add "Test" category → rename "Groceries" to "Food" → delete "Food" with reassign to "Other" → save → verify in Transactions → Clear All Data → empty Dashboard.

**Prototype reference**: `docs/prototype.jsx` lines 743–986 (Settings component)

- [ ] T025 [US6] Rewrite `src/pages/SettingsPage.tsx` — implement prototype Settings: props `categories`, `setCategories`, `budgets`, `setBudgets`, `txns`, `setTxns`, `accountList`, `onRenameAccount`; local `catEdits`, `budgetEdits`, `newCatName`, `deleteTarget`, `reassignTo`, `acctEdits`, `flash`; Section 1: No-API notice card (accent border); Section 2: Your Data stat grid (txns count, unique months count, accountList length, isTransfer count) + "Clear All Data" button with `confirm()` dialog → `setTxns([])`; Section 3: Accounts — input per account + "Save Account Names" calls `onRenameAccount` for changed entries; Section 4: Categories & Budgets — column headers, rows with `<input type="color">` + name input + budget number input + × delete button; delete: click × → set `deleteTarget({name, count})` → show confirmation panel with optional reassign dropdown + "Confirm Remove" → update txns retroactively → remove from catEdits; add new: name input + "Add" button (picks next `EXTRA_COLORS` colour); "Save Categories & Budgets": validate no duplicate names, build `nameMap` for renames, update all txns with old category names, carry budgets through renames, persist categories + budgets + txns; flash `var(--accent)` on success, `var(--amber)` on warning. Ref: prototype lines 743–986.
- [ ] T026 [US6] Rewrite `src/pages/SettingsPage.css` — section card layout; stat grid; category row flex; delete confirmation panel; flash bar; colour picker sizing; all via `var(--*)` tokens

**Checkpoint**: All four sections visible. Category rename updates Transactions retroactively. Delete reassignment works. Clear-all returns to empty state.

---

## Phase 9: Polish — Token Audit & CSS Cleanup

**Purpose**: Eliminate any remaining hardcoded hex colours from all component CSS/TSX files; verify font inheritance.

- [ ] T027 [P] Audit all `src/components/*.css` — replace any hardcoded hex with `var(--*)` tokens; verify font-family inherits from body
- [ ] T028 [P] Audit all `src/pages/*.css` — same as T027; confirm `font-family:'JetBrains Mono',monospace` used only on amount/numeric elements
- [ ] T029 [P] Update `src/pages/NotFoundPage.tsx` — replace any hardcoded colours with `var(--*)` tokens
- [ ] T030 Run `grep -r "#[0-9a-fA-F]\{3,6\}" src/ --include="*.css" --include="*.tsx"` — confirm zero hits outside of `src/index.css` token definitions; fix any remaining raw hex values

**Checkpoint**: Token audit clean. All colours via CSS vars. Sora everywhere, JetBrains Mono on amounts.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Tokens) ──► Phase 2 (App Shell)
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    Phase 3 (US1)    Phase 4 (US2)    Phase 5 (US3)
    Upload flow      Dashboard        Acct rename
          │                │                │
          └────────────────┼────────────────┘
                           ▼
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    Phase 6 (US4)    Phase 7 (US5)    Phase 8 (US6)
    Transactions     Chat page        Settings
          │                │                │
          └────────────────┴────────────────┘
                           ▼
                     Phase 9 (Polish)
```

### User Story Dependencies

- **US1 (P1)**: Needs Phase 2 complete. No dependency on US2.
- **US2 (P1)**: Needs Phase 2 complete. Can use existing localStorage data — independent of US1.
- **US3 (P2)**: Embedded in Phase 2 Sidebar (T005). Verify once sidebar renders.
- **US4 (P2)**: Needs Phase 2 (tab routing). Independent of US1/US2.
- **US5 (P2)**: Needs Phase 2 (chatMessages lifted). Independent of US1–US4.
- **US6 (P3)**: Needs Phase 2 (tab routing). Independent of US1–US5.

### Parallel Opportunities

- T004, T006, T008 can run in parallel (different files)
- T014 (DashboardPage) and T020 (TransactionsPage) parallel after Phase 2
- T022 (ChatPage) and T025 (SettingsPage) parallel after Phase 2
- T027, T028, T029 parallel (different CSS file sets)

---

## Implementation Strategy

### MVP (US1 + US2 — Phases 1–4)

1. Phase 1: Tokens + fonts
2. Phase 2: Sidebar + App shell (delivers US3 inline)
3. Phase 3: Upload flow (US1)
4. Phase 4: Dashboard rewrite (US2)
5. **VALIDATE**: Upload → Dashboard auto-nav → multi-month toggle → donut + trends

### Full Delivery (all phases in order)

Phases 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

### Notes

- No test tasks — spec does not request TDD; existing service/hook tests stay passing (services untouched)
- `docs/prototype.jsx` line numbers cited per task for exact reference
- `ACCOUNT_COLORS = ["#10b981","#60a5fa","#f472b6","#fbbf24","#a78bfa","#fb923c"]`
- `isTransfer` flag (not category name) is the sole transfer-exclusion driver
- localStorage keys: `pfa-v3-transactions`, `pfa-v3-merchants`, `pfa-v3-budgets`, `pfa-v3-accounts`, `pfa-v3-categories`
