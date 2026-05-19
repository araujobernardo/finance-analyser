# Tasks: FA-GOAL-003 — Goal Progress Auto-Calculation

**Input**: Design documents from `specs/025-goal-progress-auto-calc/`
**Branch**: `025-goal-progress-auto-calc`

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to
- No schema migration required — all columns exist (FA-GOAL-001)

---

## Phase 2: Foundational — US1 Savings Target (Priority: P1) 🎯 MVP

**Goal**: Create the two calculation utilities and wire them into every transaction trigger. After this phase, savings target goals show live account balance progress automatically.

**Independent Test**: Create a savings target goal linked to an account. Import transactions. Open Goals page — progress bar reflects the account balance without any manual input. Status flips to "achieved" when balance >= targetAmount.

- [ ] T001 Create `src/server/utils/calculateGoalProgress.ts` — switch on `goal.type`; implement `savings_target` branch using `computeAccountBalance`; clamp negative balance to 0; auto-achieve when `currentAmount >= targetAmount`; write `currentAmount`, `status`, `updatedAt` back to `goals` table; skip goals with `status = 'achieved'` or `status = 'abandoned'` (terminal guard); return `void`
- [ ] T002 Create `src/server/utils/recalculateUserGoals.ts` — fetch all goals WHERE `userId = userId AND status = 'active'`; call `calculateGoalProgress` for each; export `recalculateUserGoals(userId, db): Promise<void>`
- [ ] T003 [P] Unit tests for savings_target branch and recalculateUserGoals in `src/server/utils/__tests__/calculateGoalProgress.test.ts` — test: balance < target shows partial progress; balance >= target auto-achieves; negative balance clamped to 0; achieved goal is skipped; no linkedAccountId leaves currentAmount unchanged
- [ ] T004 [US1] Wire `GET /api/goals` in `src/server/routes/goals.ts` — call `recalculateUserGoals(userId, db)` before the SELECT query so the response always contains fresh progress
- [ ] T005 [US1] Wire `POST /api/accounts/:accountId/transactions` in `src/server/routes/transactions.ts` — call `recalculateUserGoals(userId, db)` after `syncLinkedAssets` (already present); add alongside existing FA-NW-004 call
- [ ] T006 [US1] Wire `POST /api/accounts/:accountId/transactions/import`, `PATCH /api/transactions/:id`, and `DELETE /api/transactions/:id` in `src/server/routes/transactions.ts` — each calls `recalculateUserGoals(userId, db)` after its primary side effect

**Checkpoint**: Savings target goals update automatically on Goals page load and after every transaction change.

---

## Phase 3: US2 — Debt Payoff (Priority: P2)

**Goal**: Add the debt payoff calculation branch. Users with a credit card payoff goal see progress update automatically as they pay down their balance.

**Independent Test**: Create a debt payoff goal with targetAmount = $5,000. Import transactions totalling –$3,000 in the linked account. Open Goals page — currentAmount = $2,000 (paid off), progress = 40%. Import transactions that bring balance to 0 — goal auto-achieves.

- [ ] T007 [US2] Add `debt_payoff` branch to `calculateGoalProgress.ts` in `src/server/utils/calculateGoalProgress.ts` — `outstanding = Math.abs(balance)`; `paid = Math.max(0, targetAmount - outstanding)`; `currentAmount = Math.min(paid, targetAmount)`; auto-achieve when `outstanding <= 0`
- [ ] T008 [P] [US2] Unit tests for debt_payoff branch in `src/server/utils/__tests__/calculateGoalProgress.test.ts` — test: partial payoff shows correct progress; debt grown beyond targetAmount clamps to 0; outstanding reaches 0 auto-achieves; no linkedAccountId leaves currentAmount unchanged

**Checkpoint**: Debt payoff goals track balance reduction automatically.

---

## Phase 4: US3 — Net Worth Milestone (Priority: P3)

**Goal**: Add net worth milestone calculation and wire triggers for asset/liability changes so milestone goals update whenever the user edits assets or liabilities.

**Independent Test**: Create a net worth milestone goal with targetAmount = $100,000. Add assets totalling $75,000 and liabilities totalling $10,000. Open Goals page — currentAmount = $65,000, progress = 65%. Edit an asset value so net worth >= $100,000 — goal auto-achieves.

- [ ] T009 [US3] Add `net_worth_milestone` branch to `calculateGoalProgress.ts` in `src/server/utils/calculateGoalProgress.ts` — query `SUM(assets.value)` and `SUM(liabilities.value)` for `userId`; `currentAmount = assetsTotal - liabsTotal` (stored as-is, can be negative); auto-achieve when `currentAmount >= targetAmount`; no linkedAccountId required
- [ ] T010 [US3] Wire `PATCH /api/assets/:id` in `src/server/routes/assets.ts` — call `recalculateUserGoals(userId, db)` after the UPDATE completes
- [ ] T011 [US3] Wire `PATCH /api/liabilities/:id` in `src/server/routes/liabilities.ts` — call `recalculateUserGoals(userId, db)` after the UPDATE completes
- [ ] T012 [P] [US3] Unit tests for net_worth_milestone branch in `src/server/utils/__tests__/calculateGoalProgress.test.ts` — test: net worth below target shows partial progress; net worth above target auto-achieves; negative net worth stored as-is; no linkedAccountId needed

**Checkpoint**: Net worth milestone goals reflect live net worth and update after every asset or liability change.

---

## Phase 5: US4 — Spending Limit (Priority: P4)

**Goal**: Add the spending limit calculation branch and update GoalCard to show amber (>80%) and red (>100%) progress states for over-limit goals.

**Independent Test**: Create a spending limit goal for "Dining" category with targetAmount = $300. Import $250 of Dining transactions for the current month — progress bar is amber at 83%. Import $60 more — bar turns red and shows "Over target" badge. Verify prior-month transactions are excluded.

- [ ] T013 [US4] Add `spending_limit` branch to `calculateGoalProgress.ts` in `src/server/utils/calculateGoalProgress.ts` — compute `firstOfMonth` (first day of current UTC calendar month as `YYYY-MM-DD` string); query `SUM(transactions.amount) WHERE userId AND category = goal.categoryName AND date >= firstOfMonth AND amount < 0`; `currentAmount = Math.abs(sum ?? 0)`; spending_limit is NEVER auto-achieved; requires `categoryName`
- [ ] T014 [P] [US4] Update `src/components/goals/GoalCard.tsx` — add `isWarning` boolean: `goal.type === 'spending_limit' && percent > 80 && percent <= 100`; apply `goal-card__progress-fill--warning` class when `isWarning`; keep existing `goal-card__progress-fill--over` for >100%; progress bar fill width uses raw percent (not clamped to 100) for spending_limit type so bar visually maxes out at full width
- [ ] T015 [P] [US4] Add `.goal-card__progress-fill--warning` amber variant to `src/components/goals/GoalCard.css` using existing design system colour tokens (amber/warning token; do not hardcode hex values)
- [ ] T016 [P] [US4] Unit tests for spending_limit branch in `src/server/utils/__tests__/calculateGoalProgress.test.ts` — test: spend within limit shows correct progress; spend > target shows >100% progress; prior-month transactions excluded; missing categoryName leaves currentAmount unchanged; status never set to achieved
- [ ] T017 [P] [US4] Component tests for GoalCard warning and over states in `src/components/goals/__tests__/GoalCard.test.tsx` — test: >80% spending_limit applies warning class; >100% spending_limit applies over class; non-spending_limit goals do not apply warning class at 85%

**Checkpoint**: All four goal types calculate and display progress correctly with appropriate visual states.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T018 Update `src/components/goals/GoalCard.tsx` — replace the "Progress will update automatically" auto-note (currently shown when `currentAmount == null`) with a neutral "Link an account to track progress" hint for goals that require a linked account but have none; goals with `currentAmount` always show the amount row
- [ ] T019 [P] TypeScript type-check (`tsc --noEmit`) and lint (`npm run lint`) across all modified files — fix any type errors introduced by new imports or function signatures

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No external dependencies — start immediately
  - T001 → T002 (recalculateUserGoals depends on calculateGoalProgress existing)
  - T001, T002 complete → T003, T004, T005, T006 can all run in parallel
- **US2 (Phase 3)**: Depends on T001 (calculateGoalProgress.ts must exist to add a branch)
- **US3 (Phase 4)**: Depends on T001; T010 and T011 require assets.ts and liabilities.ts routes to exist (they do)
- **US4 (Phase 5)**: Depends on T001; T014 + T015 are independent of T013
- **Polish (Phase 6)**: Depends on all prior phases complete

### User Story Dependencies

- **US1 (P1)**: No dependencies — forms the foundational utility
- **US2 (P2)**: Depends on T001 (calculateGoalProgress skeleton); independent otherwise
- **US3 (P3)**: Depends on T001; independent of US2
- **US4 (P4)**: Depends on T001; independent of US2/US3

### Within Each Phase

- Calculation branch task (T007, T009, T013) completes before its unit tests (parallelizable in practice but test must match implementation)
- T014 and T015 (GoalCard visual updates) are independent of T013

### Parallel Opportunities

- T003, T004, T005, T006 can all run in parallel after T001 + T002
- T008 runs in parallel with T007 (different concerns — test file vs implementation)
- T010 and T011 run in parallel (different route files)
- T014, T015, T016, T017 run in parallel (different files)
- T019 runs in parallel with T018

---

## Parallel Example: Foundational Phase

```
# After T001 + T002 complete, launch simultaneously:
T003 — unit tests (calculateGoalProgress.test.ts)
T004 — wire GET /api/goals (goals.ts)
T005 — wire POST transaction (transactions.ts)
T006 — wire import/PATCH/DELETE transactions (transactions.ts)
```

---

## Implementation Strategy

### MVP (Phase 2 only — US1 Savings Target)

1. Complete T001 → T002 sequentially
2. Complete T003–T006 in parallel
3. **VALIDATE**: Open Goals page → savings target progress updates on load and after CSV import
4. Ship — users with savings target goals immediately see live progress

### Incremental Delivery

1. Phase 2 (US1) → live savings target progress ✅
2. Phase 3 (US2) → debt payoff tracking ✅
3. Phase 4 (US3) → net worth milestone tracking ✅
4. Phase 5 (US4) → spending limit with amber/red states ✅
5. Phase 6 (Polish) → UX refinements ✅

---

## Notes

- All queries must include `userId` in the WHERE clause — single-user app but scoped for correctness
- `computeAccountBalance` from `src/server/utils/accountBalance.ts` is already available — import and reuse for savings_target and debt_payoff
- Drizzle numeric columns return strings — always `parseFloat()` before arithmetic
- The `transactions.date` column is a `date` string (`YYYY-MM-DD`) — compare against `firstOfMonth` as a string (ISO format, same timezone)
- GoalCard amber state applies ONLY to `spending_limit` goal type — other goal types always use the existing green/red two-state system
