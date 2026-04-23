# Tasks: UX/UI Overhaul — Monarch Money Quality

**Input**: Design documents from `specs/002-ux-ui-overhaul/`  
**Branch**: `002-ux-ui-overhaul`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅  
**Tests**: Not explicitly requested — no test tasks generated. Existing tests must remain green.  
**Designer agent**: Required on every story (all are UI stories per constitution §4a).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and establish the `src/styles/` directory before any CSS work begins.

- [ ] T001 Add `lucide-react` dependency — run `npm install lucide-react` and verify import resolves in TypeScript
- [ ] T002 Add Inter font via Google Fonts — insert `<link rel="preconnect" href="https://fonts.googleapis.com">` and Inter stylesheet `<link>` into `index.html` above existing `<link>` tags
- [ ] T003 Create `src/styles/` directory (empty, ready for T004–T005)

**Checkpoint**: `lucide-react` importable, Inter loads in browser DevTools Network tab, `src/styles/` exists.

---

## Phase 2: Foundational (Design Token Layer)

**Purpose**: Establish the CSS token system and base styles that ALL subsequent stories depend on. Nothing else can be correct until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Create `src/styles/tokens.css` — define all 48 design-system tokens from `docs/design-system.md` as CSS custom properties on `:root` (backgrounds, text, accent, semantic finance, borders, states, shadows, radius, spacing, motion)
- [ ] T005 Create `src/styles/base.css` — apply Inter font-family to `body`, CSS reset (box-sizing, margin: 0), base typography using token scale, shared utility classes: `.card`, `.btn`, `.btn--primary`, `.btn--secondary`, `.btn--ghost`, `.btn--danger`, `.badge`, `.input`, `.label`, `.num` (tabular-nums)
- [ ] T006 Import `src/styles/tokens.css` and `src/styles/base.css` in `src/main.tsx` (before any component imports)
- [ ] T007 Remove all undocumented CSS vars from `src/index.css` (if present) — verify the file only uses design-system tokens after cleanup

**Checkpoint**: Open app in browser. Background is `#0f1923`. Body text uses Inter. No console errors. `src/styles/tokens.css` and `src/styles/base.css` exist and are imported.

---

## Phase 3: User Story 1 — Visually Consistent App Shell (Priority: P1) 🎯 MVP

**Goal**: NavBar rebuilt to design-system spec; all shared UI components (EmptyState, SkeletonCard) updated to token-based CSS; app shell feels cohesive and polished.

**Independent Test**: Open app with no data. NavBar is 56px tall, Inter font, active link shows teal bottom border, account selector has visible border. EmptyState and SkeletonCard render with correct dark-theme colours.

### NavBar Implementation

- [ ] T008 [US1] Install nav icons from `lucide-react` — add `LayoutDashboard`, `Upload`, `List`, `TrendingUp`, `Settings` icons to `src/components/NavBar.tsx`; replace unicode `▾` arrow with `ChevronDown` icon; replace GearIcon inline SVG with `Settings` from lucide
- [ ] T009 [US1] Update `src/components/NavBar.tsx` — enforce 56px height via CSS class; add `lucide-react` SVG icon (16px) to each `NAV_LINKS` entry; remove "Upload" from `NAV_LINKS` array; add `+ Import` primary button in nav right area (linking to `/upload`); update brand span to use teal accent dot before "Finance Analyser" text
- [ ] T010 [US1] Rewrite `src/components/NavBar.css` — replace all undocumented vars (`--nav-bg`, `--nav-text`, `--nav-link`, `--nav-link-hover-bg`, `--dropdown-bg`, `--dropdown-border`, `--dropdown-shadow`, `--dropdown-text`, `--dropdown-hover-bg`, `--dropdown-selected`, `--color-danger`) with design-system tokens; fix active link to `border-bottom: 2px solid var(--accent)` + `color: var(--accent)` (remove background-fill active state); set NavBar `height: 56px`, `background: var(--bg-surface)`, `border-bottom: 1px solid var(--border-subtle)`; inactive links `color: var(--text-secondary)`, hover `color: var(--text-primary)`; account selector trigger `border: 1px solid var(--border-default)`, `border-radius: var(--radius-md)`; dropdown `background: var(--bg-elevated)`, `border: 1px solid var(--border-default)`, `border-radius: var(--radius-md)`, `box-shadow: var(--shadow-md)`; add `transition: all var(--motion-fast) ease-out` to all interactive elements; add mobile bottom tab bar at `<640px` using `position: fixed; bottom: 0`

### Shared UI Components

- [ ] T011 [P] [US1] Update `src/components/ui/EmptyState.css` — replace any undocumented vars with design-system tokens; ensure icon is 48px `stroke: var(--text-muted)`; heading `font-size: var(--text-lg)`, `color: var(--text-secondary)`; body `font-size: var(--text-sm)`, `color: var(--text-muted)`; container `padding: var(--space-24) var(--space-8)`, flex column center
- [ ] T012 [P] [US1] Update `src/components/ui/EmptyState.tsx` — verify the component accepts `icon`, `message`, `ctaLabel?`, `ctaTo?` props; CTA button must use `.btn.btn--primary` class; no prop changes (interface stable per plan)
- [ ] T013 [P] [US1] Update `src/components/ui/SkeletonCard.css` — set skeleton background to `var(--bg-overlay)`, border-radius `var(--radius-md)`, pulse animation using `opacity` 1→0.4→1 at 1.5s; wrap animation in `@media (prefers-reduced-motion: no-preference)`
- [ ] T014 [P] [US1] Update `src/components/ui/SkeletonCard.tsx` — verify rows prop works; no functional changes needed, CSS-only update
- [ ] T015 [P] [US1] Update `src/components/MonthToggleBar.css` — replace undocumented vars with design-system tokens; active month tab uses `--accent` colour; inactive uses `--text-secondary`; hover uses `--text-primary`; container uses `--bg-surface` background, `--border-subtle` border

**Checkpoint**: NavBar renders at 56px. Active "Dashboard" link shows teal underline (not filled background). Account selector has visible 1px border. Lucide icons appear on all nav links. EmptyState shows correctly in dark theme. Skeleton pulse uses `--bg-overlay`. Existing tests pass.

---

## Phase 4: User Story 2 — Import Page as a Focused Flow (Priority: P2)

**Goal**: Upload page stripped to: upload zone + status card + month list. All data-review panels removed. Success/error/categorising states use design-system components.

**Independent Test**: Upload a CSV. Verify only the upload zone, a status card (success/error/categorising), and the month toggle list appear on the page. No MonthlySummary, charts, budget panels, or rules list visible.

- [ ] T016 [US2] Update `src/pages/UploadPage.tsx` — remove imports and JSX for: `MonthlySummary`, `TransactionTable`, `SpendingDonutChart`, `SpendByCategory`, `LargestTransactions`, `BudgetComparisonPanel`, `CategoryRulesList`; remove all state variables used exclusively by those components (`selectedCategory`, `rules`, `budgets`, `showBudgetForm`, `displayedTransactions`); remove category filter chip JSX; keep: `CsvUpload`, `DuplicateWarningModal`, `MonthToggleBar`, upload status states
- [ ] T017 [US2] Add upload status card JSX to `src/pages/UploadPage.tsx` — replace bare `<p>` success/error/categorising states with: (a) categorising: `<SkeletonCard rows={3} />` + `<p className="import-status__label">Categorising your transactions…</p>`; (b) success: a `<div className="import-status import-status--success">` card showing month label, transaction count, account name, and `<Link to="/" className="btn btn--primary">View Dashboard</Link>`; (c) error: a `<div className="import-status import-status--error">` card showing filename and up to 3 error messages
- [ ] T018 [US2] Update account badge in `src/pages/UploadPage.tsx` — replace both raw `style={{...}}` inline-styled account name spans in the `<h1>` with a `<span className="badge badge--account">` element using design-system `.badge` class; remove all hardcoded hex colours from inline styles
- [ ] T019 [US2] Create `src/pages/UploadPage.css` — page container `max-width: 680px`, centred, `padding: var(--space-12) var(--space-6)`; upload zone wrapper `display: flex; justify-content: center; margin: var(--space-10) 0`; `.import-status` card base: `background: var(--bg-surface)`, `border: 1px solid var(--border-default)`, `border-radius: var(--radius-lg)`, `padding: var(--space-6)`; `.import-status--success`: `border-color: var(--positive)`, `background: var(--positive-subtle)`; `.import-status--error`: `border-color: var(--negative)`, `background: var(--negative-subtle)`; `.import-status__label`: `color: var(--text-secondary)`, `font-size: var(--text-sm)`
- [ ] T020 [US2] Update `src/components/CsvUpload.css` — replace all undocumented vars (`--upload-zone-border`, `--upload-zone-bg`, `--upload-zone-text`, `--upload-zone-active-border`, `--upload-zone-active-bg`, `--upload-zone-active-text`, `--upload-browse`, `--upload-error-bg`, `--upload-error-border`, `--upload-error-text`, `--upload-ok-bg`, `--upload-ok-border`, `--upload-ok-text`) with design-system tokens; zone border `2px dashed var(--border-default)`; zone bg `var(--bg-surface)`; zone hover `border-color: var(--accent)`, `background: var(--accent-subtle)`; browse link `color: var(--accent)`; error card uses `--negative` / `--negative-subtle`; success card uses `--positive` / `--positive-subtle`; icon `stroke: var(--text-muted)`

**Checkpoint**: Import page shows only upload zone, status area, and month list. Upload a CSV → success card appears with month and count. Invalid file → error card appears. Categorising state shows SkeletonCard. No data-review panels present.

---

## Phase 5: User Story 3 — Dashboard as Financial Overview (Priority: P3)

**Goal**: Dashboard at 1200px, KPI cards prominent, 2-column layout below KPIs, design-system tokens throughout, empty and loading states.

**Independent Test**: With data for one month: KPI cards (Income, Expenses, Net) are visually dominant. Chart + categories are side-by-side on desktop. On mobile, everything stacks. Empty state shows with "Import CSV" CTA when no data.

- [ ] T021 [US3] Update `src/pages/DashboardPage.tsx` — change empty state from `<p className="dashboard-empty">` to `<EmptyState icon={<UploadCloudIcon />} message="No data yet" ctaLabel="Import CSV" ctaTo="/upload" />` (use `lucide-react` `UploadCloud` icon); add month label display in page header: `<span className="dashboard-period">{resolvedMonth label}</span>` next to `<h1>`; wrap each panel (`MonthlySummary`, `MonthlyTrendChart`, `LargestTransactions`) in loading guard that renders `<SkeletonCard />` when `months.length === 0 && !isLoading`; add `SpendByCategory` top-5 panel in the right sidebar column (4 cols)
- [ ] T022 [US3] Update `src/pages/DashboardPage.css` — change `max-width` from 900px to 1200px; update `dashboard-empty` to remove `var(--text)` reference; add `.dashboard-header` flex row with `align-items: baseline`, `gap: var(--space-4)`; add `.dashboard-period` style: `font-size: var(--text-base)`, `color: var(--text-secondary)`; update grid: below KPI full-row, add `.dashboard-main` (8/12 cols) and `.dashboard-sidebar` (4/12 cols) columns on ≥1024px; single column on <640px; add `padding: var(--space-12) var(--space-6)` to page container
- [ ] T023 [P] [US3] Update `src/components/MonthlySummary.css` — replace all undocumented vars with design-system tokens; `.monthly-summary` uses flexbox row, gap `var(--space-6)`; each `.summary-card` uses card pattern: `background: var(--bg-surface)`, `border: 1px solid var(--border-subtle)`, `border-radius: var(--radius-lg)`, `padding: var(--space-6)`, `box-shadow: var(--shadow-sm)`; `.summary-value` uses `font-size: var(--text-xl)`, `font-variant-numeric: tabular-nums`; `.summary-value--positive` uses `color: var(--positive)`; `.summary-value--negative` uses `color: var(--negative)`; `.summary-label` uses `color: var(--text-secondary)`, `font-size: var(--text-sm)`; replace unicode icons (▲▼↑↓) with CSS-only up/down indicators or remove; mobile: stack cards vertically
- [ ] T024 [P] [US3] Update `src/components/MonthlySummary.tsx` — replace unicode arrow spans (▲ ▼ ↑ ↓) with `lucide-react` `TrendingUp` / `TrendingDown` icons (16px, coloured per value); apply `.num` class to all currency `<span>` elements; ensure income/expense/net values are inside elements with `className="summary-value summary-value--positive"` etc.
- [ ] T025 [P] [US3] Update `src/components/MonthlyTrendChart.tsx` — update Recharts props: `CartesianGrid` stroke `var(--border-subtle)` at 50% opacity; axis tick `fill` to `var(--text-muted)`, `fontSize` to 12; `Tooltip` contentStyle `background: var(--bg-elevated)`, `border: 1px solid var(--border-default)`, `borderRadius: var(--radius-md)`; active bar `fill` to `var(--accent)`; inactive bar `fill` to `var(--bg-overlay)`; add `animationDuration={250}`
- [ ] T026 [P] [US3] Update `src/components/MonthlyTrendChart.css` — replace undocumented vars with design-system tokens; chart card uses `.card` pattern
- [ ] T027 [P] [US3] Update `src/components/LargestTransactions.css` — replace undocumented vars with design-system tokens; wrap in card pattern styles; amounts use `var(--text-lg)` and `tabular-nums`; positive `var(--positive)`, negative `var(--negative)`

**Checkpoint**: Dashboard at 1200px. KPI cards show Income/Expenses/Net in large tabular numbers. Chart and categories sidebar side-by-side on desktop. Single column on mobile. Empty state shows with Import CSV CTA. Loading shows skeleton cards.

---

## Phase 6: User Story 4 — Transactions Page Redesign (Priority: P4)

**Goal**: Clean table with hover-only rows, design-system category colours, SVG sort icons, proper empty states, design-system summary stats bar, and design-system bulk action bar.

**Independent Test**: Open Transactions with data. No alternating row colours (hover-only). Sort icons are SVG chevrons. Category dots are not raw hex (#22c55e etc.). Search input uses dark background. Summary bar looks like a card with large numbers.

- [ ] T028 [US4] Update `src/pages/TransactionsPage.tsx` — replace `CATEGORY_COLOURS` hardcoded hex map with design-system token references (use CSS variables on dot `<span>` using `--cat-colour-X` approach, or map to token names and apply via CSS classes like `.cat-dot--income`, `.cat-dot--groceries`, etc.); replace unicode sort arrows (`▲` `▼`) returned by `sortArrow()` with `lucide-react` `ChevronUp` / `ChevronDown` (12px) icons; replace top-level empty state `<p className="txns-empty">` with `<EmptyState icon={<ReceiptIcon />} message="No transactions yet" ctaLabel="Import CSV" ctaTo="/upload" />`; replace filter-empty `<p className="txns-empty" data-testid="txns-empty">` with `<EmptyState icon={<SearchXIcon />} message="No transactions match your filter" ctaLabel="Clear filter" onCtaClick={clearFilters} />`; add `clearFilters` handler that resets `searchRaw`, `selectedCategories`, and `page`
- [ ] T029 [US4] Update `src/pages/TransactionsPage.css` — replace all undocumented vars with design-system tokens; remove zebra striping (delete `.txns-row:nth-child(odd)` and `.txns-row:nth-child(even)` rules); set row default `background: transparent`; set row hover `background: var(--bg-overlay)`; update `.txns-summary-bar` to card pattern: `background: var(--bg-surface)`, `border: 1px solid var(--border-subtle)`, `border-radius: var(--radius-lg)`, `padding: var(--space-4) var(--space-6)`; add `.txns-stat-value` class: `font-size: var(--text-xl)`, `font-variant-numeric: tabular-nums`, `color: var(--text-primary)`; update `.txns-search` to `background: var(--bg-input)`, `border: 1px solid var(--border-default)`, `border-radius: var(--radius-md)`, `color: var(--text-primary)`, focus ring `box-shadow: 0 0 0 2px var(--accent-muted)`; update bulk bar: `background: var(--bg-elevated)`, `border: 1px solid var(--border-default)`, `box-shadow: var(--shadow-md)`; add category dot colour classes: `.cat-dot--income { background: var(--positive) }`, `.cat-dot--groceries { background: var(--accent) }`, `.cat-dot--utilities { background: var(--warning) }`, `.cat-dot--transfer { background: var(--text-muted) }`, `.cat-dot--default { background: var(--text-muted) }` etc.; `.txns-td--positive { color: var(--positive) }`, `.txns-td--negative { color: var(--negative) }`
- [ ] T030 [P] [US4] Update summary bar JSX in `src/pages/TransactionsPage.tsx` — change `txns-summary-bar` to show 3 stats: transaction count, total income, total spend; each stat has a `.txns-stat-label` (`--text-secondary`) and `.txns-stat-value` (large, `tabular-nums`); income value coloured `--positive`, spend value coloured `--negative`
- [ ] T031 [P] [US4] Update `src/components/TransactionList.css` — replace undocumented vars with design-system tokens
- [ ] T032 [P] [US4] Update `src/components/TransactionTable.css` — replace undocumented vars with design-system tokens
- [ ] T033 [P] [US4] Update `src/components/DuplicateWarningModal.css` — replace undocumented vars with design-system tokens; modal uses `--bg-elevated`, `--border-default`, `--shadow-lg`, `--radius-xl`
- [ ] T034 [P] [US4] Update `src/components/CategoryBadge.css` — replace undocumented vars with design-system tokens; badge pattern: `background: var(--accent-subtle)`, `color: var(--accent)`, `border-radius: var(--radius-sm)`, `font-size: var(--text-xs)`

**Checkpoint**: Transactions table rows have no zebra stripes — only hover highlighting. Sort arrows are SVG chevrons. Search input is dark. Summary bar looks like a card with 3 large numbers. Category dots don't use raw hex. Both empty states use EmptyState component.

---

## Phase 7: User Story 5 — Settings Page Redesign (Priority: P5)

**Goal**: Sidebar with active state, account rows as design-system cards, icon buttons (pencil/trash SVG), no internal ticket references, design-system confirm dialog.

**Independent Test**: Open Settings. Sidebar "Account Management" link has teal left border + accent colour. Edit button shows pencil icon. Delete button shows trash icon. No "FA-58" or "FA-59" text visible anywhere.

- [ ] T035 [US5] Update `src/pages/SettingsPage.tsx` — remove the two placeholder `<section>` blocks for "Category Budgets" and "Data Management" (or replace with `<EmptyState>` components: "Budget settings coming soon" / "Data export coming soon" — no ticket numbers); update `SECTIONS` array to only include sections with real content; replace text "Edit" button with `<button className="btn btn--ghost icon-btn" aria-label="Edit">` containing `<Pencil size={14} />` from lucide-react; replace text "Delete" button with `<button className="btn btn--ghost icon-btn icon-btn--danger" aria-label="Delete">` containing `<Trash2 size={14} />` from lucide-react; add active detection to sidebar: track current active section via `IntersectionObserver` or pass active section state; apply `settings__sidebar-link--active` class to active link
- [ ] T036 [US5] Update `src/pages/SettingsPage.css` — replace all undocumented vars with design-system tokens; sidebar active link: `border-left: 3px solid var(--accent)`, `color: var(--accent)`, `padding-left: calc(var(--space-4) - 3px)`, `background: var(--accent-subtle)`; inactive sidebar links: `color: var(--text-secondary)`, hover `color: var(--text-primary)`, `background: var(--bg-overlay)`; account rows: card pattern `background: var(--bg-surface)`, `border: 1px solid var(--border-subtle)`, `border-radius: var(--radius-lg)`, `padding: var(--space-4) var(--space-6)`, `box-shadow: var(--shadow-sm)`; `.icon-btn`: ghost style `background: transparent`, `border: none`, `color: var(--text-secondary)`, `padding: var(--space-2)`, hover `color: var(--text-primary)`, `background: var(--bg-overlay)`, `border-radius: var(--radius-md)`, transition `var(--motion-fast)`; `.icon-btn--danger`: hover `color: var(--negative)`, `background: var(--negative-subtle)`; section headers: `font-size: var(--text-lg)`, `color: var(--text-primary)`, `border-bottom: 1px solid var(--border-subtle)`; confirm dialog: `background: var(--bg-elevated)`, `border: 1px solid var(--border-default)`, `box-shadow: var(--shadow-lg)`, `border-radius: var(--radius-xl)`; `.btn` classes now delegate to global `.btn` from `base.css` — remove duplicate `.btn` declarations from this file; mobile sidebar: horizontal tabs on `<640px`
- [ ] T037 [P] [US5] Update `src/components/AddAccountModal.css` — replace undocumented vars with design-system tokens; modal uses `--bg-elevated`, `--border-default`, `--shadow-lg`, `--radius-xl`
- [ ] T038 [P] [US5] Update `src/components/DeleteAccountModal.css` — replace undocumented vars with design-system tokens; danger button uses `--negative`, `--negative-subtle`
- [ ] T039 [P] [US5] Update `src/components/AccountModal.css` (if exists) — replace undocumented vars with design-system tokens

**Checkpoint**: Settings sidebar active link is teal with left border. Account rows are cards. Edit shows pencil SVG, Delete shows trash SVG. No "FA-58" or "FA-59" text. Confirm dialog uses correct dark-elevated styling. Existing account CRUD operations still work.

---

## Phase 8: User Story 6 — Trends Page Redesign (Priority: P6)

**Goal**: Charts wrapped in design-system cards, nav label "Trends", empty state, design-system chart styling.

**Independent Test**: Open Trends. Nav link says "Trends" not "History". Each chart is inside a card container. No data → EmptyState with CTA. Tooltip uses dark elevated background.

- [ ] T040 [US6] Update `src/components/NavBar.tsx` — change the Trends/History nav link label from `"History"` to `"Trends"` and `to: "/history"` path remains (route unchanged); update icon to `TrendingUp` from lucide-react
- [ ] T041 [US6] Update `src/pages/HistoryPage.tsx` — add empty state: if `data.length === 0`, render `<EmptyState icon={<TrendingUpIcon />} message="No trend data yet" ctaLabel="Import CSV" ctaTo="/upload" />`; wrap each chart in a `<div className="trends-card card">` container with a card heading; import `EmptyState` from `../components/ui/EmptyState`
- [ ] T042 [US6] Create `src/pages/HistoryPage.css` — `.trends-page` container: `max-width: 1200px`, centred, `padding: var(--space-12) var(--space-6)`; `.trends-card` card pattern: `background: var(--bg-surface)`, `border: 1px solid var(--border-subtle)`, `border-radius: var(--radius-lg)`, `padding: var(--space-6)`, `box-shadow: var(--shadow-sm)`; `.trends-card + .trends-card`: `margin-top: var(--space-8)`; chart heading `font-size: var(--text-lg)`, `color: var(--text-primary)`, `margin-bottom: var(--space-4)`
- [ ] T043 [P] [US6] Update `src/components/CategoryTrendChart.tsx` — Recharts chart styling props: `CartesianGrid` stroke `var(--border-subtle)` at 0.5 opacity; axis tick `fill` `var(--text-muted)`, fontSize 12; `Tooltip` contentStyle `background: var(--bg-elevated)`, `border: 1px solid var(--border-default)`, `borderRadius: 8`, `boxShadow: var(--shadow-md)`; `animationDuration={250}`; income series `fill: var(--positive)`, expense series `fill: var(--negative)`
- [ ] T044 [P] [US6] Update `src/components/CategoryTrendChart.css` — replace undocumented vars with design-system tokens
- [ ] T045 [P] [US6] Update `src/components/MonthlySpendChart.css` — replace undocumented vars with design-system tokens

**Checkpoint**: NavBar link reads "Trends". Both charts are inside card containers. Empty state renders when no data. Tooltips are dark-elevated style. Existing chart data renders correctly.

---

## Phase 9: Polish & Cross-Cutting CSS Cleanup

**Purpose**: Sweep remaining CSS files that weren't touched in story phases; final visual QA pass.

- [ ] T046 [P] Update `src/components/SpendByCategory.css` — replace undocumented vars with design-system tokens
- [ ] T047 [P] Update `src/components/SpendingDonutChart.css` — replace undocumented vars with design-system tokens; donut segments use design-system colour tokens
- [ ] T048 [P] Update `src/components/BudgetComparisonPanel.css` — replace undocumented vars with design-system tokens; budget bar uses `--warning` for nearing-limit, `--negative` for over-budget
- [ ] T049 [P] Update `src/components/CategoryRulesList.css` — replace undocumented vars with design-system tokens
- [ ] T050 [P] Update `src/components/ChatPanel.css` — replace undocumented vars with design-system tokens; chat bubble uses `--bg-elevated`; input uses `--bg-input`
- [ ] T051 [P] Update `src/components/SuggestedPrompts.css` (if exists) — replace undocumented vars with design-system tokens
- [ ] T052 [P] Update `src/components/CategoryRulesList.css` — verify design-system tokens
- [ ] T053 Audit entire `src/` directory for any remaining hardcoded hex colours and undocumented CSS vars — run grep for `#[0-9a-fA-F]{3,6}` and `var(--` patterns not in `docs/design-system.md`; fix all found instances
- [ ] T054 Verify `prefers-reduced-motion` wrapper on all animations in `src/styles/base.css` and `src/components/ui/SkeletonCard.css`
- [ ] T055 Cross-browser visual check — open app in Chrome, Firefox, and Safari (or Edge); verify NavBar, cards, inputs, and charts look correct in all three
- [ ] T056 Mobile visual check at 375px width — verify NavBar collapses to bottom tab bar, all pages are single-column, no horizontal overflow, filter bar stays pinned in Transactions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1 — App Shell)**: Depends on Phase 2 — must complete before pages
- **Phase 4 (US2 — Import)**: Depends on Phase 3 (NavBar + shared components)
- **Phase 5 (US3 — Dashboard)**: Depends on Phase 3 (MonthlySummary, EmptyState, Skeleton)
- **Phase 6 (US4 — Transactions)**: Depends on Phase 3 (EmptyState, token layer)
- **Phase 7 (US5 — Settings)**: Depends on Phase 3 (shared btn classes, token layer)
- **Phase 8 (US6 — Trends)**: Depends on Phase 3 (EmptyState, chart styling)
- **Phase 9 (Polish)**: Depends on all story phases

### User Story Dependencies

After Phase 3 completes, stories US2–US6 can proceed in parallel:

- **US2 (Import)**: Independent after Phase 3 ✅
- **US3 (Dashboard)**: Independent after Phase 3 ✅
- **US4 (Transactions)**: Independent after Phase 3 ✅
- **US5 (Settings)**: Independent after Phase 3 ✅
- **US6 (Trends)**: Independent after Phase 3 ✅

### Within Each Story

- CSS tasks [P] can run in parallel with TSX tasks [P] when touching different files
- TSX structural changes (removing panels, adding components) before CSS token cleanup in same file
- Lucide icon imports before component JSX updates

### Parallel Opportunities

```text
Phase 1:    T001 ∥ T002 ∥ T003
Phase 2:    T004 → T005 → T006 → T007 (sequential — each builds on previous)
Phase 3:    T008 → T009 → T010 (NavBar sequential)
            T011 ∥ T012 ∥ T013 ∥ T014 ∥ T015 (shared components, all parallel)
Phase 4-8:  All four page stories (US2-US6) can run in parallel once Phase 3 done
Phase 9:    T046–T052 all parallel; T053–T056 sequential
```

---

## Implementation Strategy

### MVP First (Phase 1 + 2 + 3 only)

1. Complete Phase 1: Setup (lucide-react, Inter font, styles dir)
2. Complete Phase 2: Foundational (token layer — the most impactful single change)
3. Complete Phase 3: App Shell (NavBar + shared components)
4. **STOP and validate**: App feels cohesive and dark-themed. NavBar is correct.
5. Demo to user before proceeding to page redesigns.

### Incremental Delivery

1. Phases 1–3 → Foundation + App Shell → Demo
2. Phase 4 (Import) → focused upload flow → Demo
3. Phase 5 (Dashboard) → financial overview → Demo
4. Phase 6 (Transactions) → clean table → Demo
5. Phase 7 (Settings) → polished settings → Demo
6. Phase 8 (Trends) → wrapped charts → Demo
7. Phase 9 (Polish) → zero remaining raw hex → Ship

### Parallel Team Strategy (if multiple Developer agents)

Once Phase 3 completes, all 5 page stories can be assigned simultaneously:

- Developer A: US2 (Import) + US3 (Dashboard)
- Developer B: US4 (Transactions)
- Developer C: US5 (Settings) + US6 (Trends)

---

## Notes

- [P] tasks = different files, no blocking dependencies — safe to run in parallel
- [Story] label traces every task back to its user story for GitHub issue linking
- All stories independently testable after their phase completes
- Designer agent presents 3 UX options on every story before Developer picks up
- Existing test suite must pass after every phase — visual changes only, no logic changes
- Run `npm run build` after Phase 9 to confirm no TypeScript errors from lucide-react imports
- Grep audit in T053 is the quality gate before marking the feature done
