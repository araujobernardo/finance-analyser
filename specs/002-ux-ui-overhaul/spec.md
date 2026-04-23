# Feature Specification: UX/UI Overhaul — Realign to Prototype

**Feature Branch**: `002-ux-ui-overhaul`  
**Created**: 2026-04-23  
**Status**: Draft  
**Primary Reference**: `docs/prototype.jsx` (authoritative UX reference for all layout, interaction, and design decisions)

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — First-time Upload & Auto-Navigation (Priority: P1)

A user opens the app for the first time (no data), sees the sidebar with an "Upload CSV" button and an empty Dashboard. They click "Upload CSV" in the sidebar, select one or more ASB CSV files, and — after parsing and AI categorisation complete — are automatically taken to the Dashboard showing their transactions summarised.

**Why this priority**: This is the core entry flow. Without it, the app has no data to show.

**Independent Test**: Open app with no data; upload a CSV via the sidebar button; confirm the Dashboard becomes visible automatically with transaction data.

**Acceptance Scenarios**:

1. **Given** no transactions exist, **When** the app loads, **Then** the Dashboard shows the "No data yet" empty state with instructions to upload via the sidebar.
2. **Given** one or more CSVs are selected via the sidebar upload button, **When** parsing and categorisation complete, **Then** the active tab automatically switches to Dashboard.
3. **Given** upload is in progress, **When** the sidebar status area is visible, **Then** it shows a loading message (e.g., "Parsing 2 files…" / "Categorising N transactions with AI…").
4. **Given** upload succeeds, **When** the status message appears, **Then** it shows the import count and detected transfer count; status clears after ~5 s.
5. **Given** a CSV is already imported, **When** the same file is uploaded again, **Then** no duplicate transactions are added and an appropriate message is shown.

---

### User Story 2 — Dashboard Multi-Month View (Priority: P1)

A user with several months of data wants to compare spending across multiple months. They click additional month pills to extend the selection, see summary stats show monthly averages, and observe unselected months dimmed in the trend chart.

**Why this priority**: Multi-month selection is a core differentiator called out in the prototype and currently broken.

**Independent Test**: Upload 3+ months of data; select two months; confirm stats show averages and trends dim non-selected months.

**Acceptance Scenarios**:

1. **Given** multiple months of data, **When** the Dashboard loads, **Then** month pills are shown and the most-recent month is pre-selected.
2. **Given** one month selected, **When** a second month pill is clicked, **Then** both are highlighted and summary stats show total values plus per-month averages.
3. **Given** two months selected, **When** one pill is clicked to deselect, **Then** it removes that month — but if only one month remains, deselect is prevented.
4. **Given** multi-month selected, **When** the Trends chart renders, **Then** bars for unselected months are rendered at 25% opacity.
5. **Given** budgets exist and multi-month is selected, **When** Budget vs Actual renders, **Then** budget limit is multiplied by the number of selected months.

---

### User Story 3 — Account Renaming in Sidebar (Priority: P2)

A user with multiple accounts wants to give them friendly names. They click the pencil icon next to an account in the sidebar, type a new name, and press Enter (or blur). The new name is applied immediately across all transactions.

**Why this priority**: Account renaming is an important personalisation feature surfaced directly in the sidebar.

**Independent Test**: Import two CSVs; rename one account; confirm the new name appears in the sidebar, Dashboard, and Transactions table.

**Acceptance Scenarios**:

1. **Given** at least one account exists, **When** the sidebar renders, **Then** the Accounts section shows coloured dot + display name + pencil button for each account.
2. **Given** pencil is clicked, **When** the inline input appears, **Then** pressing Enter commits the name; pressing Escape cancels; blurring commits.
3. **Given** a name is committed, **When** checking any transaction, **Then** the account display name is updated retroactively.
4. **Given** a rename is typed with >20 characters, **When** the input is committed, **Then** only the first 20 characters are saved.

---

### User Story 4 — Transactions Full-Page with Filters (Priority: P2)

A user navigates to Transactions via the sidebar and uses the filters to narrow by month, account, and category. They change a category on one transaction and see a toast confirming how many transactions were bulk-updated.

**Why this priority**: Transactions is the primary data-browsing experience.

**Independent Test**: Navigate to Transactions; filter by month and category; change a category on a payee that appears multiple times; confirm toast and count.

**Acceptance Scenarios**:

1. **Given** the Transactions sidebar tab is clicked, **Then** the full-page transaction list is shown (no floating panel).
2. **Given** transactions exist, **When** a month filter is selected, **Then** only that month's transactions are shown.
3. **Given** a category is changed on one transaction, **When** the payee matches other transactions, **Then** all matching transactions are updated and a toast appears for 4 s showing the count.
4. **Given** "Show transfers" is unchecked (default), **Then** transfer rows are hidden; when checked, they appear dimmed at 65% opacity.
5. **Given** a transfer row is visible, **Then** it shows a read-only "Transfer" tag instead of a category dropdown.

---

### User Story 5 — AI Chat as Full Page (Priority: P2)

A user clicks "AI Chat" in the sidebar and sees a full-page chat interface (not a floating panel). They type a question about their spending and receive a contextual response.

**Why this priority**: The floating panel conflicts with page content; the prototype uses a full page.

**Independent Test**: Click AI Chat tab; confirm the page is a full-height chat layout; send a question; receive a reply.

**Acceptance Scenarios**:

1. **Given** the AI Chat tab is clicked, **Then** the content area shows a full-page chat — no floating overlay is visible.
2. **Given** no transactions exist, **Then** the chat shows an empty state ("Upload transactions first.").
3. **Given** transactions exist, **When** a suggestion chip is clicked, **Then** it populates and sends that question.
4. **Given** a question is sent, **When** a response is loading, **Then** a typing indicator (3 animated dots) is shown.
5. **Given** chat history exists, **When** switching tabs and returning to AI Chat, **Then** conversation history is preserved (session-level).

---

### User Story 6 — Settings: Categories & Budgets CRUD (Priority: P3)

A user manages their spending categories and monthly budget targets in Settings. They can add, rename, recolour, set a budget, and delete categories. Deleting a category prompts for reassignment of affected transactions.

**Why this priority**: Category management is important but not blocking core financial workflows.

**Independent Test**: Open Settings; add a category; rename an existing one; delete one with >0 transactions; confirm reassignment works; save and verify changes appear in Transactions.

**Acceptance Scenarios**:

1. **Given** the Settings page renders, **Then** it shows four sections: No-API notice, Your Data, Accounts, and Categories & Budgets.
2. **Given** a category is renamed and saved, **Then** all transactions previously in that category are retroactively re-categorised.
3. **Given** a category with existing transactions is deleted, **When** "Confirm Remove" is clicked, **Then** the transactions are reassigned to the selected category (or left uncategorised if none chosen).
4. **Given** "Clear All Data" is clicked, **When** the user confirms the dialog, **Then** all transaction data is removed and the app returns to the empty state.
5. **Given** account rename inputs are changed and "Save Account Names" is clicked, **Then** account display names are updated retroactively across all transactions.

---

### Edge Cases

- What happens when only one month of data exists? Month pills are still shown (single pill, cannot be deselected).
- What happens when a user tries to deselect the last remaining month? The toggle is blocked — must always keep ≥1 month.
- What happens if a CSV from a non-ASB bank is uploaded? The parser returns an error message shown in the sidebar status area.
- What happens when the AI API call fails during upload categorisation? Transactions are imported with null categories; user can manually categorise later.
- What happens when two CSVs from the same account are uploaded? Duplicate transaction IDs are detected and skipped.
- What happens when a category name is left blank? Blank-name rows are filtered out before saving.
- What happens when duplicate category names are entered? Validation rejects the save with a warning message.

---

## Requirements _(mandatory)_

### Functional Requirements

**Design System**

- **FR-001**: The app MUST use Sora as the primary font (weights 300–700) loaded from Google Fonts.
- **FR-002**: The app MUST use JetBrains Mono for all monetary amounts and numeric figures.
- **FR-003**: All colours MUST be defined as CSS custom properties matching the prototype C object exactly: `--bg: #060d1a`, `--surface: #0c1526`, `--card: #111e33`, `--border: #1a2d4a`, `--accent: #10b981`, `--accent-dim: #065f46`, `--text: #e2e8f0`, `--muted: #64748b`, `--subtle: #94a3b8`, `--red: #f87171`, `--amber: #fbbf24`.
- **FR-004**: No hardcoded hex colours may appear in component files — all colour references MUST use the defined CSS custom properties.

**App Shell**

- **FR-005**: The app shell MUST render a fixed 224 px sidebar on the left and a scrollable content area filling the remaining viewport width.
- **FR-006**: The app MUST use tab-based navigation (dashboard / transactions / chat / settings) — no URL routing is required for this overhaul.
- **FR-007**: There MUST be no dedicated Upload Page; upload MUST be a sidebar action only.
- **FR-008**: The top NavBar component MUST be removed; it is fully replaced by the sidebar.
- **FR-009**: The floating ChatPanel overlay MUST be removed; AI Chat MUST be rendered as a full-page content area.

**Sidebar**

- **FR-010**: The sidebar MUST display the brand header ("Finance" / "Analyser" / transaction count) at the top.
- **FR-011**: The sidebar MUST show an Accounts section (coloured dot + display name + pencil rename button) only when at least one account exists.
- **FR-012**: Clicking the pencil icon MUST trigger an inline text input for renaming; Enter or blur commits; Escape cancels. Name is capped at 20 characters.
- **FR-013**: The sidebar MUST contain an "Upload CSV" button accepting multiple `.csv` files simultaneously.
- **FR-014**: Upload status (loading / success / error) MUST be displayed in the sidebar below the upload button.
- **FR-015**: After a successful upload, the app MUST automatically switch to the Dashboard tab.
- **FR-016**: Navigation tabs (Dashboard, Transactions, AI Chat, Settings) MUST be shown below the upload area; active tab uses accent background highlight.
- **FR-017**: A footer "ASB Bank · NZD" MUST appear at the bottom of the sidebar.

**Dashboard**

- **FR-018**: The Dashboard MUST show a pill row for all available months; pills are togglable and at least one must always remain selected.
- **FR-019**: The Dashboard MUST show an account filter pill row (only when >1 account exists): "All Accounts" + one per account.
- **FR-020**: Summary stats MUST show Income, Spent, Net, and Transaction count in a 4-column card grid.
- **FR-021**: When multiple months are selected, summary stat cards MUST show a per-month average sub-label.
- **FR-022**: If inter-account transfers are detected and excluded, a subtle notice bar MUST be shown with the total transfer amount.
- **FR-023**: When "All Accounts" is the active filter and >1 account exists, per-account income/spend breakdown cards MUST be shown.
- **FR-024**: The Dashboard MUST include a Spending by Category donut chart (innerRadius 52, outerRadius 85) with legend below showing category name and amount.
- **FR-025**: The Dashboard MUST include a Largest Expenses panel showing the top 5 non-credit transactions with payee, date, account (if multi-account), amount, and category tag.
- **FR-026**: The Dashboard MUST include a Monthly Trends bar chart (Income + Spend bars). When multi-month is selected, unselected months MUST render at 25% opacity.
- **FR-027**: When budgets exist, a Budget vs Actual section MUST be shown with progress bars per category; budget limit scaled by number of selected months in multi-month mode.
- **FR-028**: When no transactions exist, the Dashboard MUST show an empty state with icon, "No data yet" heading, and upload instructions.

**Transactions**

- **FR-029**: The Transactions page MUST show a filters row containing: search (payee/memo), month select, account select (if >1 account), category select, "Show transfers" checkbox, and row count.
- **FR-030**: Changing a category on one transaction MUST update ALL transactions sharing the same payee substring; if >1 transaction is updated, a toast MUST appear for 4 s showing the count.
- **FR-031**: Transfer rows MUST show a read-only "Transfer" tag in the category column; transfers MUST be hidden by default and shown at 65% opacity when "Show transfers" is checked.
- **FR-032**: The transaction table MUST use JetBrains Mono for amounts; credit amounts are shown in accent green, debit amounts in red.

**AI Chat**

- **FR-033**: The AI Chat tab MUST render as a full-page layout — the existing floating ChatPanel overlay MUST be removed.
- **FR-034**: Chat MUST pass the full transaction dataset (all accounts, all months) as context to Claude.
- **FR-035**: When messages = 1 (only the assistant greeting), four suggestion chips MUST be shown.
- **FR-036**: When no transactions exist, the Chat MUST show an empty state with icon and "Upload transactions first." message.

**Settings**

- **FR-037**: Settings MUST include a "No API key needed" notice card.
- **FR-038**: Settings MUST show a "Your Data" section with a stat grid (transaction count, month count, account count, transfer count) and a "Clear All Data" danger button with confirmation dialog.
- **FR-039**: Settings MUST include an Accounts section for renaming accounts; saved names are applied retroactively to all transactions.
- **FR-040**: Settings MUST include a full Categories & Budgets section: colour picker + name input + budget/month input per category; add new category; delete with optional reassignment; save all together.
- **FR-041**: When a category is renamed and saved, all transactions assigned to the old name MUST be updated to the new name.
- **FR-042**: When a category is deleted, the user MUST be shown the count of affected transactions and offered a reassignment target before confirming deletion.

### Key Entities

- **Transaction**: id, date, month, type, payee, memo, amount, isCredit, account, accountShort, category, isTransfer
- **Account**: short (key derived from CSV), display (user-visible name, renameable)
- **Category**: name, colour (hex string)
- **Budget**: map of category name → monthly amount (number)
- **Sidebar Tab**: one of `dashboard | transactions | chat | settings`

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can upload a CSV and reach a populated Dashboard in under 30 seconds (excluding AI categorisation network latency).
- **SC-002**: Selecting a second month pill takes effect (summary stats update, chart dims) in under 200 ms with no page reload.
- **SC-003**: All pages (Dashboard, Transactions, Chat, Settings) are accessible from the sidebar without any URL navigation or page reload.
- **SC-004**: No hardcoded colour values exist in any component — 100% of colour references use the defined CSS custom properties.
- **SC-005**: The sidebar is visible and usable at viewport widths ≥ 900 px without horizontal overflow.
- **SC-006**: A category rename in Settings is reflected immediately across all transaction rows on the Transactions page within the same session.
- **SC-007**: The Chat page renders as a full-height layout with no floating overlay element present in the DOM when other tabs are active.

---

## Assumptions

- The app targets desktop browsers at ≥ 900 px width; no mobile breakpoints are in scope for this overhaul.
- The existing localStorage-backed storage service (`storage.ts`) and AccountContext are retained without modification.
- The existing Anthropic SDK integration (`claudeChat.ts`, `categorisation.ts`) is retained; only the UI that surfaces the chat changes.
- The Sora and JetBrains Mono fonts are loaded from Google Fonts CDN and are available in the browser environment.
- Transfer detection logic (matching debits/credits across accounts) is already correct in the existing codebase and does not need to change.
- The `isTransfer` flag (not the category name "Savings & Transfers") is the sole driver for excluding transactions from dashboard totals and budget tracking.
- Account colours follow the fixed palette from the prototype: `["#10b981","#60a5fa","#f472b6","#fbbf24","#a78bfa","#fb923c"]` assigned by index order.
- Existing unit tests for services, hooks, and utilities are not updated as part of this overhaul (they remain passing against unchanged logic layers).
- The `HistoryPage` and `UploadPage` routes are removed; their panels (Trends chart, Donut chart) move into the Dashboard.
