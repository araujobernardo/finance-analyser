# Feature Specification: Net Worth Dashboard & History Snapshots

**Feature Branch**: `021-net-worth-dashboard-history`  
**Created**: 2026-05-16  
**Status**: Draft  
**Input**: User description: "FA-NW-003 — Net worth dashboard and history snapshots"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Net Worth Dashboard at a Glance (Priority: P1)

The user navigates to the dedicated Net Worth page and sees their complete financial position: total assets, total liabilities, and net worth as headline figures, plus a visual breakdown of assets and liabilities by category (e.g. cash, investments, property; credit cards, loans, mortgage). The breakdown is presented as a visual composition — not just a list of numbers.

**Why this priority**: This is the core purpose of the page. Without a clear, at-a-glance summary of the user's financial position, the page delivers no value. All other stories depend on this being in place.

**Independent Test**: Can be fully tested by navigating to the Net Worth page with at least one asset and one liability entered, and verifying that the headline figures and visual breakdown appear correctly — before any history data exists.

**Acceptance Scenarios**:

1. **Given** the user has assets and liabilities entered, **When** they navigate to the Net Worth page, **Then** they see total assets, total liabilities, and net worth displayed as prominent headline figures.
2. **Given** the user has assets and liabilities of multiple types, **When** they view the Net Worth page, **Then** a visual breakdown shows each asset category and each liability category as a distinct visual segment — not just a number.
3. **Given** the user has only assets (no liabilities), **When** they view the Net Worth page, **Then** total liabilities shows as zero and net worth equals total assets.
4. **Given** the user has only liabilities (no assets), **When** they view the Net Worth page, **Then** total assets shows as zero and net worth is a negative figure.
5. **Given** the user has no assets and no liabilities, **When** they view the Net Worth page, **Then** all figures show as zero and an empty-state message explains that no data has been entered yet.

---

### User Story 2 — Net Worth History Chart (Priority: P2)

The user can see a line chart on the Net Worth page showing how their net worth has changed over time. The y-axis shows net worth value; the x-axis shows time. The chart helps the user understand whether their financial position is improving or declining month by month.

**Why this priority**: History context transforms a static snapshot into actionable insight. Without it, the user knows where they are but not whether they are moving in the right direction. Depends on P1 (the page must exist) and on snapshots being recorded (P3).

**Independent Test**: Can be fully tested by seeding the snapshot store with a set of historical data points and verifying that the line chart renders them correctly, even without live snapshot recording.

**Acceptance Scenarios**:

1. **Given** the user has multiple months of recorded snapshots, **When** they view the Net Worth page, **Then** a line chart displays net worth over time with the correct values at each date.
2. **Given** the user has only one snapshot recorded, **When** they view the Net Worth page, **Then** the chart still renders without error, showing a single data point.
3. **Given** the user has never visited the page before (zero snapshots), **When** they view the Net Worth page, **Then** the chart area displays a clear empty-state message explaining that history will appear after their first visit, and no broken chart is shown.
4. **Given** the user has more than 12 months of snapshots, **When** they view the chart, **Then** all available history is shown (the chart scrolls or scales to accommodate it).
5. **Given** the user's net worth is negative for one or more periods, **When** they view the chart, **Then** negative values are shown correctly below a zero baseline.

---

### User Story 3 — Automatic Daily Snapshot on Page Visit (Priority: P3)

Every time the user visits the Net Worth page, the system silently records a snapshot of their current total assets, total liabilities, and net worth — but only if no snapshot has already been recorded today. The user does not need to trigger this manually.

**Why this priority**: Snapshots are the data source for the history chart. Without them, no history accumulates. However, this story can be implemented and verified independently of the chart rendering.

**Independent Test**: Can be fully tested by visiting the Net Worth page multiple times in one day and verifying that exactly one snapshot is stored per day, not one per visit.

**Acceptance Scenarios**:

1. **Given** no snapshot exists for today, **When** the user visits the Net Worth page, **Then** a snapshot recording today's total assets, total liabilities, and net worth is created.
2. **Given** a snapshot already exists for today, **When** the user visits the Net Worth page again the same day, **Then** no additional snapshot is created (the existing one is preserved unchanged).
3. **Given** the user visits on consecutive days, **When** they view their history, **Then** one snapshot per day appears in the record.
4. **Given** the user's assets or liabilities change during the day after a snapshot has been taken, **When** they revisit the page, **Then** the snapshot for today remains unchanged (it reflects the state at the time of the first visit).
5. **Given** the user visits on a new day, **When** the page loads, **Then** the new snapshot reflects the current state of their finances as of that visit.

---

### Edge Cases

- What happens when the user visits the page for the very first time with no history? (Empty chart state must be shown gracefully — no errors, no broken UI.)
- What happens when the user has only a single data point? (Chart must render a single point or appropriate single-entry state.)
- What happens when the net worth value is zero? (Zero must display correctly in both the headline and on the chart axis.)
- What happens when snapshot storage is unavailable at visit time? (The page must still load and display the current figures; snapshot failure must not break the page.)
- What happens when the user has many years of history? (Chart must remain usable and not degrade performance or layout.)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a dedicated Net Worth page that displays total assets, total liabilities, and net worth as headline summary figures.
- **FR-002**: The Net Worth page MUST display a visual breakdown of assets grouped by category and liabilities grouped by category, presented as a visual composition (not a plain list).
- **FR-003**: The Net Worth page MUST display a line chart showing net worth over time, with net worth on the y-axis and date on the x-axis.
- **FR-004**: The system MUST record a snapshot of total assets, total liabilities, and net worth whenever the user visits the Net Worth page, subject to the once-per-day constraint.
- **FR-005**: The system MUST NOT record more than one snapshot per calendar day; if a snapshot already exists for today, subsequent visits on the same day MUST NOT create additional snapshots.
- **FR-006**: Snapshots MUST retain at least 12 months of history when available; no snapshots should be automatically purged within that window.
- **FR-007**: The chart MUST display all available snapshots up to the full history length (not limited to a fixed window shorter than what is stored).
- **FR-008**: The Net Worth page MUST handle the zero-history state gracefully, displaying an appropriate empty-state message in the chart area without rendering a broken or empty chart component.
- **FR-009**: The Net Worth page MUST handle the single-snapshot state gracefully, rendering the chart with one data point without error.
- **FR-010**: Snapshot recording failure MUST NOT prevent the Net Worth page from loading or displaying current figures.
- **FR-011**: The summary figures on the Net Worth page MUST reflect the live state of the user's assets and liabilities (sourced from FA-NW-002), not the most recent snapshot.

### Key Entities _(include if feature involves data)_

- **Net Worth Snapshot**: A point-in-time record of the user's financial position. Attributes: date (calendar day), total assets, total liabilities, net worth. One record per day maximum.
- **Asset Category Breakdown**: The aggregated value of assets grouped by type (e.g. cash, investments, property). Derived from existing asset data; not stored separately.
- **Liability Category Breakdown**: The aggregated value of liabilities grouped by type (e.g. credit cards, loans, mortgage). Derived from existing liability data; not stored separately.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: The user can view their complete financial position (total assets, total liabilities, net worth, and category breakdown) in a single page view without any additional navigation.
- **SC-002**: After visiting the Net Worth page on at least two separate days, the user can see a chart with at least two data points showing how their net worth has changed.
- **SC-003**: No more than one snapshot is created per day regardless of how many times the user visits the page; verified by inspecting stored snapshot records.
- **SC-004**: The Net Worth page loads and displays current figures correctly on first visit (zero history), with a clear empty-state message rather than an error or blank chart.
- **SC-005**: The history chart remains readable and usable with data sets ranging from 1 data point to 24+ months of daily snapshots.
- **SC-006**: Snapshot recording silently fails (no user-visible error) if storage is temporarily unavailable, and the rest of the page continues to work correctly.

## Assumptions

- The user is always authenticated; there is no multi-user or guest scenario (single-user app per project context).
- Asset and liability data, including category information, is already available from FA-NW-002 and can be queried to produce current totals and breakdowns.
- "Calendar day" for the once-per-day rule is determined by the user's local date at the time of the page visit.
- Snapshots are stored locally (client-side persistence) unless backend storage already exists in the project — the implementation decision is deferred to planning.
- The visual breakdown composition format (e.g. donut chart, horizontal bar, stacked bar) is decided at design/planning time; this spec requires only that it be visual, not purely numeric.
- The line chart library choice is deferred to planning; this spec requires only the data shape and behaviour.
- Automatic scheduled snapshots, push notifications, and forecasting are explicitly out of scope for this feature.
- "At least 12 months" refers to retaining history — not to a minimum data requirement before the chart becomes visible.
