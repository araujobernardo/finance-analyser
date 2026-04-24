# Changelog

- **2026-04-24** | #97–#100 | Manual Transfer Flagging | Click any transaction to flag it as a transfer pair; same-day same-amount candidates are highlighted; un-flagging restores prior categories.
- **2026-04-24** | #87–#95 | UX/UI Overhaul — Realign to Prototype | Replaced NavBar+Router with 224px sidebar, rewrote Dashboard with Recharts charts, added full-page ChatPage, applied prototype dark theme design tokens.
- **2026-04-20** | #61 | FA-40-S4: Multi-account context in chat | Extended buildFinanceContext to be account-selection-aware, added token-budget enforcement (80k cap, 3-month trim), and added useEffect in ChatPanel to clear chat history on account switch.
- **2026-04-20** | #57 | FA-37-S5: Dashboard empty & loading states | Added EmptyState and SkeletonCard shared UI components and wired themed empty/loading states into all six dashboard panels, with a CTA button linking to Upload on MonthlySummary.
- **2026-04-20** | #56 | FA-37-S4: Monthly trend chart panel | Added MonthlyTrendChart bar chart showing total spend per month with selected-month highlight and empty state guard.
