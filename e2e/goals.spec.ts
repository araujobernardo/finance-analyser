/**
 * Goals E2E spec — GoalModal UI flows (T005/T006)
 *
 * NOTE: Full end-to-end tests for the GoalModal require GoalsPage (T007/T008)
 * to be wired into the router and sidebar. Once GoalsPage ships, these tests
 * will navigate to /goals and interact with the modal there.
 *
 * Until then, this file documents the scenarios that WILL be automated:
 *
 *   1. Navigate to /goals (requires GoalsPage — T007/T008)
 *   2. Click "Add Goal" button to open GoalModal
 *   3. Verify modal opens with step 1 indicator ("Step 1 of 2 — What kind of goal?")
 *   4. Verify tiles are locked (non-interactive) while name is empty
 *   5. Type a name → verify tiles unlock
 *   6. Select "Savings Target" tile → verify adaptive fields animate in
 *   7. Verify step indicator advances to step 2 text
 *   8. Fill in Target Amount → click "Save Goal"
 *   9. Verify modal closes and new goal appears in the goal list
 *  10. Re-open modal, select "Spending Limit" → verify Category field appears
 *  11. Switch to "Savings Target" → verify Category field disappears and clears
 *  12. Submit with empty Amount → verify inline error message appears
 *
 * All of the above are multi-step browser flows verifiable by DOM state — they
 * satisfy all three criteria for Playwright automation (navigation, DOM
 * assertions, deterministic with test user data). They will be implemented in
 * the GoalsPage story (T007/T008).
 *
 * Why not automated now:
 *   - /goals route does not exist yet (no GoalsProvider wrap in App.tsx)
 *   - GoalModal is not mounted anywhere navigable by Playwright
 *   - Running against the production Render deployment would fail immediately
 *     at `page.goto("/goals")` with a 404 redirect to /login
 */

// Placeholder export so TypeScript does not complain about an empty module.
export {};
