# Feature Specification: UX/UI Overhaul — Monarch Money Quality

**Feature Branch**: `002-ux-ui-overhaul`  
**Created**: 2026-04-21  
**Status**: Draft  
**Input**: Full UX/UI overhaul of Finance Analyser to match Monarch Money quality and design-system.md tokens.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Visually Consistent App Shell (Priority: P1)

A user opens Finance Analyser and immediately experiences a polished, dark-themed interface. The navigation bar is 56px tall, displays the brand wordmark, has clearly labelled nav links with SVG icons, an active-link accent underline, and an account selector with a visible border. Every page shares the same background colour, typography, and spacing rhythm — the app feels like one product, not a collection of pages.

**Why this priority**: The shared design foundation (CSS tokens, base typography, NavBar) gates all other visual work. Nothing else can look correct until this layer exists.

**Independent Test**: Open the app with no data. Verify the NavBar renders at 56px, uses Inter font, active link shows teal underline (not background fill), account selector has a visible border, and the background is `#0f1923`.

**Acceptance Scenarios**:

1. **Given** the app is open, **When** a user looks at the NavBar, **Then** it is exactly 56px tall, shows the brand, nav links with icons, and an account selector with a 1px border.
2. **Given** any page is open, **When** a user inspects the typography, **Then** all body text uses Inter, financial figures use tabular-nums, and no raw hex colours appear in inline styles.
3. **Given** an active nav link, **When** a user sees it, **Then** it has a 2px teal bottom border (not a filled background).
4. **Given** the account selector dropdown is open, **When** a user sees it, **Then** it uses `--bg-elevated` background, `--border-default` border, and `--shadow-md` shadow.

---

### User Story 2 — Import Page as a Focused Flow (Priority: P2)

A user navigates to Import (previously "Upload"). They see a large, centred drop-zone as the primary focus. After uploading a CSV, they see a clearly styled success card showing the month imported, number of transactions, and account name — with a "View in Dashboard" CTA. Error states show a red-bordered card. A categorising skeleton replaces blank waiting time. No data-review panels appear on this page.

**Why this priority**: The Import page is the entry point for all data. A cluttered, do-everything page confuses first-time users and undermines trust.

**Independent Test**: Upload a CSV. Verify only the upload zone, success/error card, and existing-months list appear. No MonthlySummary, TransactionTable, charts, or budget panels are present.

**Acceptance Scenarios**:

1. **Given** the Import page with no uploads, **When** a user sees the page, **Then** a centred upload zone occupies the main area with an icon, heading, and "browse" link styled per the design system.
2. **Given** a CSV is uploading and being categorised, **When** the user waits, **Then** a skeleton card with pulsing animation and a "Categorising…" label replaces the success card area.
3. **Given** a successful upload, **When** categorisation finishes, **Then** a green-bordered success card shows month, transaction count, account name, and a "View Dashboard" button.
4. **Given** an invalid file or parse error, **When** the upload fails, **Then** a red-bordered error card shows the filename and first 3 error messages.
5. **Given** existing uploads, **When** a user views the page, **Then** a month list (MonthToggleBar) lets them switch/delete months; no other review panels appear.

---

### User Story 3 — Dashboard as Financial Overview (Priority: P3)

A user opens the Dashboard and sees their financial snapshot for the selected month. Three KPI cards (Income, Expenses, Net Savings) are the most prominent elements — large numbers with colour coding. Below is a 2-column layout: a spend trend chart (wider) and a top-categories sidebar. Largest transactions appear below. The page is 1200px wide. If no data exists, a proper empty state with an "Import CSV" CTA appears instead of a blank page.

**Why this priority**: The Dashboard is the most frequently visited page and the primary value-delivery surface. It must immediately communicate financial health.

**Independent Test**: With data for one month, open the Dashboard. Verify the 3 KPI cards are the tallest/most visually prominent elements, numbers use tabular-nums, the chart and category sidebar are side-by-side, and the max-width is 1200px.

**Acceptance Scenarios**:

1. **Given** no data, **When** a user opens the Dashboard, **Then** the EmptyState component shows with an upload-cloud icon, "No data yet" heading, explanatory text, and an "Import CSV" button.
2. **Given** data exists, **When** a user opens the Dashboard, **Then** MonthlySummary cards appear at the top with Income, Expenses, and Net Savings values — each in a design-system card with the correct colour token.
3. **Given** data is loading, **When** context is switching accounts or months, **Then** skeleton cards appear in place of each panel.
4. **Given** desktop width (≥1024px), **When** below the KPI row, **Then** the trend chart and category sidebar appear side-by-side in a 2-column layout.
5. **Given** mobile width (<640px), **When** viewing the Dashboard, **Then** all panels stack in a single column.

---

### User Story 4 — Transactions Page Redesign (Priority: P4)

A user opens Transactions and sees a clean, card-contained table with a search bar and category filter. Rows use hover-only highlighting (no zebra stripes). Category dots use design-system colours, not hardcoded hex. Empty states use the EmptyState component. The summary stats bar shows count, income, and expenses in a card with large tabular numbers. The bulk action bar uses design-system shadow and styling.

**Why this priority**: Transactions is the most data-dense page — every visual noise problem is amplified here.

**Independent Test**: Open Transactions with data. Verify no zebra striping, category dots don't use hardcoded hex (#22c55e etc.), sort icons are SVG chevrons, search input uses `--bg-input`, and the summary bar looks like a card.

**Acceptance Scenarios**:

1. **Given** no data, **When** a user opens Transactions, **Then** the EmptyState component shows with icon, "No transactions yet" heading, and "Import CSV" CTA.
2. **Given** data exists and no filter applied, **When** a user hovers a row, **Then** only the hovered row changes background (no alternating stripes).
3. **Given** a search with no results, **When** the table is empty, **Then** the EmptyState component shows "No transactions match your filter" with a "Clear filter" action.
4. **Given** rows are selected, **When** the bulk action bar appears, **Then** it uses `--bg-elevated`, `--border-default`, and `--shadow-md` tokens.
5. **Given** a sortable column header, **When** a user sorts by it, **Then** an SVG chevron (not ▲▼) indicates sort direction.

---

### User Story 5 — Settings Page Redesign (Priority: P5)

A user opens Settings and sees a clean two-column layout: a left sidebar with active-link highlighting, and a right content area with account management. Account rows are design-system cards. Edit/Delete use icon buttons (pencil/trash SVGs). The Add Account button is a primary CTA. The confirm-delete dialog uses the modal pattern. Placeholder sections either show proper empty states or are hidden — no internal ticket numbers are visible.

**Why this priority**: Settings is the least frequently visited page but has the most broken patterns (text-only icon buttons, exposed ticket numbers, no active sidebar state).

**Independent Test**: Open Settings. Verify the sidebar link for "Account Management" has an active teal accent state, Edit button shows a pencil icon, Delete shows a trash icon, and no text "FA-58" or "FA-59" appears anywhere on the page.

**Acceptance Scenarios**:

1. **Given** Settings is open at "Account Management", **When** a user sees the sidebar, **Then** the active link has a left teal border and `--accent` colour.
2. **Given** an account in the list, **When** a user sees the row, **Then** it is a design-system card with a pencil icon button (not text "Edit") and trash icon button (not text "Delete").
3. **Given** deleting an account, **When** the confirm dialog appears, **Then** it uses `--bg-elevated` background, `--border-default` border, `--shadow-lg` shadow, and `--radius-xl` radius.
4. **Given** the page loads, **When** a user scans all visible text, **Then** no internal ticket references (FA-58, FA-59) appear.
5. **Given** mobile width, **When** the sidebar is shown, **Then** it collapses to horizontal tabs above the content area.

---

### User Story 6 — Trends Page Redesign (Priority: P6)

A user opens Trends and sees two charts — monthly spend and category trend — each wrapped in a design-system card. Chart grid lines use `--border-subtle`, axis text uses `--text-muted`, and tooltips use `--bg-elevated` with `--shadow-md`. If no data exists, a proper empty state appears. The nav label shows "Trends" (not "History").

**Why this priority**: Trends is functional but visually raw — charts float without context and don't follow the design system.

**Independent Test**: Open Trends with data. Verify each chart is inside a card container, the nav link says "Trends", tooltip background is `--bg-elevated`, and grid lines use `--border-subtle`.

**Acceptance Scenarios**:

1. **Given** no data, **When** a user opens Trends, **Then** the EmptyState component shows with a chart icon and "Import CSV" CTA.
2. **Given** data exists, **When** a user views Trends, **Then** each chart is wrapped in a card (`--bg-surface`, `--border-subtle`, `--radius-lg`, `--shadow-sm`).
3. **Given** a user hovers a chart bar, **When** the tooltip appears, **Then** it uses `--bg-elevated` background and `--shadow-md` shadow.
4. **Given** the NavBar, **When** a user looks at the link for this page, **Then** the label reads "Trends" not "History".

---

### Edge Cases

- What happens when a user is on mobile and tries to use the bulk action bar in Transactions?
- How does the EmptyState render when a panel is inside a card (nested empty state)?
- What happens to the account selector if 10+ accounts exist (overflow in dropdown)?
- How do skeleton cards behave when the loading completes instantly (flash of skeleton)?
- What happens on very long account names in the NavBar account selector (truncation)?

---

## Requirements _(mandatory)_

### Functional Requirements

**Design Foundation**

- **FR-001**: The app MUST apply all colour, spacing, typography, border-radius, shadow, and motion tokens from `docs/design-system.md` as CSS custom properties on `:root` in a single `src/styles/tokens.css` file.
- **FR-002**: All existing undocumented CSS vars (`--nav-bg`, `--text-h`, `--surface`, `--bg`, `--border`, `--dropdown-bg`, `--color-danger`, `--color-success`, `--accent-bg`, `--accent-border`, `--modal-overlay`, `--upload-zone-border`, and all others not in the design system) MUST be removed and replaced with design-system tokens.
- **FR-003**: The app MUST use Inter (Google Fonts) as the primary font family with system-ui fallback, applied via `src/styles/base.css`.
- **FR-004**: All currency and numeric financial values MUST use `font-variant-numeric: tabular-nums`.
- **FR-005**: Shared utility classes (`.btn--primary`, `.btn--secondary`, `.btn--ghost`, `.btn--danger`, `.card`, `.badge`, `.input`) MUST be defined globally using design-system tokens, not duplicated per component.
- **FR-006**: All hover/transition states MUST use `transition: all var(--motion-fast) ease-out`.
- **FR-007**: All focus rings MUST use `outline: none; box-shadow: 0 0 0 2px var(--accent-muted)`.
- **FR-008**: All `@media (prefers-reduced-motion)` rules MUST wrap non-essential animations.

**NavBar**

- **FR-009**: The NavBar MUST be exactly 56px tall with `--bg-surface` background and `1px solid var(--border-subtle)` bottom border.
- **FR-010**: The active nav link MUST show `border-bottom: 2px solid var(--accent)` and `color: var(--accent)` — no background-fill active state.
- **FR-011**: Inactive nav links MUST use `--text-secondary` colour; hover MUST use `--text-primary`.
- **FR-012**: Every nav link MUST have an SVG icon (16px, `--text-secondary` stroke).
- **FR-013**: The "Upload" nav link MUST be removed from the primary nav list and replaced with a `+ Import` button using `.btn--primary` styling in the nav right area.
- **FR-014**: The account selector trigger MUST have `1px solid var(--border-default)` border and `--radius-md` border-radius.
- **FR-015**: The account selector dropdown MUST use `--bg-elevated`, `--border-default`, `--shadow-md`, and `--radius-md` tokens.
- **FR-016**: All hardcoded hex colours in NavBar icons and components MUST be replaced with design-system tokens.

**Import Page**

- **FR-017**: The Import page MUST show only: upload zone, existing-months list, and upload status (success/error/categorising). All data-review panels (MonthlySummary, TransactionTable, charts, budget panels, category rules) MUST be removed.
- **FR-018**: The upload zone MUST be centred, prominent, and styled using design-system tokens (no undocumented CSS vars).
- **FR-019**: The categorising state MUST render a SkeletonCard with pulse animation and a "Categorising your transactions…" label.
- **FR-020**: The success state MUST be a card with `--positive` left border and `--positive-subtle` background, showing month, transaction count, account name, and a "View Dashboard" button.
- **FR-021**: The error state MUST be a card with `--negative` left border and `--negative-subtle` background, showing filename and up to 3 error messages.
- **FR-022**: The account badge in the page header MUST use the design-system badge pattern (not raw inline styles).

**Dashboard Page**

- **FR-023**: The Dashboard page container MUST have `max-width: 1200px`.
- **FR-024**: The page header MUST show the selected month label (e.g., "April 2026") in `--text-secondary` alongside the `<h1>` heading.
- **FR-025**: When no data exists, the Dashboard MUST render the EmptyState component with an upload-cloud icon, "No data yet" heading, descriptive body text, and an "Import CSV" primary button linking to `/upload`.
- **FR-026**: Each MonthlySummary card MUST use the design-system card pattern (`--bg-surface`, `--border-subtle`, `--radius-lg`, `--shadow-sm`) with numbers at `--text-xl` or larger.
- **FR-027**: On desktop (≥1024px), the layout below KPI cards MUST show MonthlyTrendChart (8 of 12 columns) and a top-categories sidebar (4 of 12 columns) side-by-side.
- **FR-028**: On mobile (<640px), all Dashboard panels MUST stack in a single column.
- **FR-029**: Each Dashboard panel MUST show a SkeletonCard while data is loading.

**Transactions Page**

- **FR-030**: The category colour map MUST be replaced with design-system tokens — no hardcoded hex values.
- **FR-031**: Table rows MUST NOT use zebra striping; only hover state (`--bg-overlay`) is permitted.
- **FR-032**: The summary stats bar MUST use card styling (`--bg-surface`, `--border-subtle`, `--radius-lg`) with 3 stats (count, income, spend) at `--text-xl`, using `tabular-nums`.
- **FR-033**: The search input MUST use `--bg-input`, `--border-default`, `--radius-md`, and an accent focus ring.
- **FR-034**: Sort direction MUST be indicated by SVG chevron icons (not unicode ▲▼).
- **FR-035**: The bulk action bar MUST use `--bg-elevated`, `--border-default`, and `--shadow-md`.
- **FR-036**: The no-data empty state MUST use the EmptyState component with a "Import CSV" CTA.
- **FR-037**: The no-filter-results empty state MUST use the EmptyState component with a "Clear filter" action.

**Settings Page**

- **FR-038**: The sidebar active link MUST display a `3px solid var(--accent)` left border and `--accent` text colour.
- **FR-039**: Account rows MUST be design-system cards (`--bg-surface`, `--border-subtle`, `--radius-lg`, `--shadow-sm`).
- **FR-040**: Edit and Delete buttons MUST be icon-only ghost buttons using SVG icons (pencil and trash respectively).
- **FR-041**: The confirm-delete dialog MUST use `--bg-elevated`, `--border-default`, `--shadow-lg`, `--radius-xl`.
- **FR-042**: All internal ticket references (FA-58, FA-59) MUST be removed from visible UI. Placeholder sections MUST show design-system empty states or be hidden entirely.

**Trends Page**

- **FR-043**: The nav link label MUST read "Trends" (not "History").
- **FR-044**: Each chart MUST be wrapped in a design-system card (`--bg-surface`, `--border-subtle`, `--radius-lg`, `--shadow-sm`).
- **FR-045**: Chart grid lines MUST use `--border-subtle` at 50% opacity; axis labels MUST use `--text-muted` at `--text-xs`.
- **FR-046**: Chart tooltips MUST use `--bg-elevated` background, `--border-default` border, `--shadow-md` shadow.
- **FR-047**: When no data exists, the Trends page MUST render the EmptyState component with an "Import CSV" CTA.

**Empty & Loading States**

- **FR-048**: Every panel that can be empty MUST use the EmptyState component with at minimum: icon (48px), heading, body text. Panels where action is possible MUST include a CTA button.
- **FR-049**: Every panel that loads async data MUST show a SkeletonCard during loading. SkeletonCard pulse animation MUST use `--bg-overlay` and be wrapped in `prefers-reduced-motion`.

**Mobile**

- **FR-050**: On mobile (<640px), the NavBar MUST collapse to a bottom tab bar with icon + label for each nav item.
- **FR-051**: On mobile, the Transactions table MUST be horizontally scrollable with a pinned filter bar.
- **FR-052**: On mobile, the Settings sidebar MUST become horizontal tabs above the content area.

### Key Entities

- **Design Token**: A CSS custom property defined in `docs/design-system.md` and applied via `src/styles/tokens.css`. Every visual style decision references a token.
- **Page Panel**: A visually distinct section on a page, always rendered inside a design-system card container.
- **Empty State**: The visual treatment rendered when a panel has no data — uses the `EmptyState` component.
- **Skeleton**: A loading placeholder — uses the `SkeletonCard` component with pulse animation.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Every CSS file in `src/` references only design-system tokens — zero undocumented CSS vars remain after the overhaul.
- **SC-002**: A user with no prior experience can navigate from landing to viewing their financial summary in under 60 seconds after uploading a CSV.
- **SC-003**: All 6 page empty states are present and informative — no blank panels or bare `<p>` tags remain anywhere in the app.
- **SC-004**: Every panel that loads data shows a skeleton before content appears — zero panels flash undefined/blank.
- **SC-005**: The Import page contains zero data-review components — only the upload zone, month list, and status card.
- **SC-006**: All financial figures (currency values) use tabular-nums — no layout shift as values change.
- **SC-007**: On a 375px wide viewport, all pages are fully usable with no horizontal overflow and no truncated interactive elements.
- **SC-008**: No internal ticket references (FA-xx) appear in any visible UI text.
- **SC-009**: The NavBar active link indicator is a teal bottom border — confirmed on all 5 nav destinations.
- **SC-010**: 100% of sortable column headers in Transactions use SVG icons for sort direction, not unicode characters.

---

## Assumptions

- The existing `EmptyState` and `SkeletonCard` components in `src/components/ui/` are structurally sound and only need their CSS updated to use design-system tokens.
- The existing Recharts integration is retained; only the chart styling props (colors, grid, tooltip) are updated.
- `lucide-react` or a similar SVG icon library is available or will be added as a dependency to provide nav and action icons.
- The existing routing structure (`/`, `/upload`, `/transactions`, `/history`, `/settings`) is preserved; only the nav label for `/history` changes to "Trends".
- The Dashboard's top-categories sidebar (new panel) will show the top 5 spending categories from the selected month — derived from existing category data, no new data fetching required.
- Mobile breakpoints: <640px = mobile, 640–1023px = tablet (single column), ≥1024px = desktop (multi-column).
- The `docs/design-system.md` token list is the source of truth and is complete — no additional tokens will be needed.
- The overhaul does not change any business logic, data storage, CSV parsing, or categorisation — only visual presentation layers (CSS, layout, component markup).
