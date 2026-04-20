# Changelog

- **2026-04-20** | #61 | FA-40-S4: Multi-account context in chat | Extended buildFinanceContext to be account-selection-aware, added token-budget enforcement (80k cap, 3-month trim), and added useEffect in ChatPanel to clear chat history on account switch.
- **2026-04-20** | #57 | FA-37-S5: Dashboard empty & loading states | Added EmptyState and SkeletonCard shared UI components and wired themed empty/loading states into all six dashboard panels, with a CTA button linking to Upload on MonthlySummary.
- **2026-04-20** | #56 | FA-37-S4: Monthly trend chart panel | Added MonthlyTrendChart bar chart showing total spend per month with selected-month highlight and empty state guard.
