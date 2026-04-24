# Research: UX/UI Overhaul — Realign to Prototype

**Branch**: `002-ux-ui-overhaul` | **Date**: 2026-04-23  
**Replaces**: previous research.md (Monarch Money Quality plan)

---

## Decision: Font — Sora + JetBrains Mono

**Decision**: Load both via a single Google Fonts `<link>` in `index.html` — `family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500`.  
**Rationale**: Zero build-config change; matches exact prototype FONT_URL. Browser caches cross-site. Previous Inter font link removed.  
**Alternatives considered**: `fontsource` npm packages (adds bundle weight, requires import changes in CSS); self-hosting (adds complexity with no user benefit).

---

## Decision: CSS Token Delivery

**Decision**: Rewrite `src/index.css` `:root` block to define all design tokens as CSS custom properties matching the prototype `C` object exactly. No separate tokens file — keep existing single `index.css` entry point.  
**Rationale**: The project already uses `index.css` imported in `main.tsx`; no build changes needed. Using the exact prototype values (`#060d1a`, `#0c1526`, etc.) makes the design reference trivially diffable.  
**Alternatives considered**: Separate `tokens.css` import (extra file with no benefit here); CSS-in-JS (runtime overhead, breaks existing CSS conventions); Tailwind (full migration — out of scope).

---

## Decision: App Shell Architecture — Tab-based, No Router

**Decision**: Replace React Router `<Routes>` with a single `useState<Tab>` in `App.tsx`. Render the active content panel conditionally. Remove `NavBar.tsx`; create `Sidebar.tsx`.  
**Rationale**: The prototype uses `useState` tab switching with no routing. The current router adds complexity that produces no user benefit (no deep-linking needed for a personal finance tool). Removing it simplifies the shell to match the prototype exactly.  
**Alternatives considered**: Keep React Router but add a sidebar (adds complexity, requires URL design for each panel); hash-based routing (unnecessary for this use case).

---

## Decision: Upload — Sidebar Action, No Upload Page

**Decision**: Delete `src/pages/UploadPage.tsx`. Move file input and upload logic into `Sidebar.tsx`. On success, call `setTab("dashboard")`.  
**Rationale**: The prototype has no upload page — upload is a sidebar action with in-sidebar status feedback. The current Upload Page also duplicates Dashboard panels (donut, budgets) which belong on Dashboard only.  
**Alternatives considered**: Keep Upload Page as optional deep-link (adds dead route, contradicts prototype UX).

---

## Decision: Chat — Full Page, Not Floating Panel

**Decision**: Delete `src/components/ChatPanel.tsx` and its CSS overlay. Create `src/pages/ChatPage.tsx` that renders as a full-height flex-column layout identical to the prototype Chat component.  
**Rationale**: The floating panel overlay conflicts with all other page content and is not in the prototype. Full-page chat matches the sidebar tab model.  
**Alternatives considered**: Keep floating panel and add a "full screen" toggle (adds complexity; doesn't match prototype).

---

## Decision: Multi-Account Data Model Compatibility

**Decision**: Keep the existing `AccountContext` and `storage.ts` as-is. The Sidebar's account list is derived from `accountList` (already computed in App from transactions). Account renaming calls `handleRenameAccount` (already exists in App logic from the prototype).  
**Rationale**: The prototype derives accounts from CSV data (`accountShort`/`accountDisplay`). The current app's `AccountContext` already does this — it is compatible. No storage schema changes required.  
**Alternatives considered**: Replace AccountContext with prototype's `window.storage` model (breaking change to all existing user data — violates constitution Golden Rule 3).

---

## Decision: Dashboard — Multi-Month Selection

**Decision**: Lift `selectedMonths: string[]` state to `App.tsx` (replaces current single `selectedMonth: string`). Pass it to `DashboardPage` which toggles months. Guard ensures `selectedMonths.length >= 1` always.  
**Rationale**: The prototype uses `selectedMonths` array with toggle logic. The current app uses a single `selectedMonth` string — this is the core gap causing multi-month to be broken.  
**Alternatives considered**: Keep single month, add comparison overlay (different UX; doesn't match prototype).

---

## Decision: History Page — Remove

**Decision**: Delete `src/pages/HistoryPage.tsx`. The Monthly Trends bar chart it contained moves into `DashboardPage.tsx`.  
**Rationale**: The prototype has no separate History/Trends page. The Trends chart lives on the Dashboard. Removing the page eliminates a dead route.  
**Alternatives considered**: Keep HistoryPage and link from Dashboard (adds navigation complexity not in prototype).

---

## Decision: Settings — Full CRUD Categories

**Decision**: Rewrite `src/pages/SettingsPage.tsx` to match the prototype Settings component. Add: categories CRUD with colour picker, delete-with-reassignment modal, rename detection, budget inputs alongside category names, data stat grid, clear-all-data button.  
**Rationale**: The current SettingsPage only handles account creation/deletion and has placeholder budget UI. The prototype Settings component is the target state.  
**Alternatives considered**: Keep current SettingsPage and add a separate CategoryManagementPage (adds navigation complexity; doesn't match prototype which combines both).
