#!/usr/bin/env node
/**
 * Finance Analyser — GitHub Issues migration script
 * Migrates 15 Jira issues to GitHub Issues via gh CLI.
 *
 * Usage (from project root on Windows):
 *   node scripts/create-github-issues.mjs
 *
 * Prerequisites:
 *   - GitHub CLI authenticated: gh auth status
 *   - Run from inside the finance-analyser repo directory
 */

import { execFileSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const GH = "C:/Program Files/GitHub CLI/gh.exe";
const REPO = "araujobernardo/finance-analyser";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gh(...args) {
  try {
    const result = execFileSync(GH, args, { encoding: "utf8" });
    return result.trim();
  } catch (err) {
    console.error(`❌ gh failed: gh ${args.join(" ")}`);
    console.error(err.stderr || err.message);
    process.exit(1);
  }
}

function createIssue({ title, body, labels }) {
  // Write body to a temp file to avoid shell-escaping issues on Windows
  const tmpFile = join(tmpdir(), `gh-issue-${Date.now()}.md`);
  writeFileSync(tmpFile, body, "utf8");

  const labelArg = labels.join(",");
  const url = gh(
    "issue", "create",
    "--repo", REPO,
    "--title", title,
    "--body-file", tmpFile,
    "--label", labelArg,
  );

  unlinkSync(tmpFile);
  return url;
}

function createLabel(name, color, description = "") {
  try {
    gh("label", "create", name,
      "--repo", REPO,
      "--color", color,
      "--description", description,
      "--force",   // update if already exists
    );
    console.log(`  ✓ label: ${name}`);
  } catch {
    // ignore — --force should handle it
  }
}

// ---------------------------------------------------------------------------
// Step 1 — Create labels
// ---------------------------------------------------------------------------

console.log("\n📌 Creating labels...");

const LABELS = [
  { name: "epic",        color: "7B61FF", description: "Top-level feature grouping" },
  { name: "backlog",     color: "C2E0C6", description: "Not yet started" },
  { name: "ready",       color: "0E8A16", description: "Meets Definition of Ready — agent can pick up" },
  { name: "in-progress", color: "F9D0C4", description: "Being actively worked on" },
  { name: "in-review",   color: "E4E669", description: "PR open, awaiting QA / approval" },
  { name: "done",        color: "EDEDED", description: "Merged to main" },
  { name: "bug",         color: "D73A4A", description: "Something isn't working" },
];

for (const label of LABELS) {
  createLabel(label.name, label.color, label.description);
}

// ---------------------------------------------------------------------------
// Step 2 — Issues to create
// ---------------------------------------------------------------------------

const ISSUES = [

  // ─── EPICS ────────────────────────────────────────────────────────────────

  {
    title: "Epic FA-36: Multi-Account Support",
    labels: ["epic", "in-progress"],
    body: `## Overview

Allow users to upload and manage statements from multiple bank accounts, with per-account views and combined reporting.

## Stories
- FA-36-S4: Add and delete accounts (#FA-48)
- FA-36-S5: Combined 'All Accounts' view (#FA-49)

_Migrated from Jira FA-36_`,
  },

  {
    title: "Epic FA-37: Dashboard Rebuild",
    labels: ["epic", "in-progress"],
    body: `## Overview

Redesign the existing dashboard with improved layout, richer visualisations, and tighter integration with the new design system.

## Stories
- FA-37-S4: Monthly trend chart panel (#FA-53)
- FA-37-S5: Dashboard empty & loading states (#FA-54)

_Migrated from Jira FA-37_`,
  },

  {
    title: "Epic FA-38: Transactions View",
    labels: ["epic", "in-progress"],
    body: `## Overview

Introduce a dedicated full-page transactions view with search, filter, sort, and inline category editing.

## Stories
- FA-38-S2: Inline category editing in transactions table (#FA-56)

_Migrated from Jira FA-38_`,
  },

  {
    title: "Epic FA-39: Settings Page",
    labels: ["epic", "in-progress"],
    body: `## Overview

Provide a Settings page where users can manage account aliases, category budgets, and data export/reset.

## Stories
- FA-39-S2: Category budgets in settings (#FA-58)
- FA-39-S3: Data export and reset (#FA-59)

_Migrated from Jira FA-39_`,
  },

  {
    title: "Epic FA-40: AI Chat Enhancements",
    labels: ["epic", "in-progress"],
    body: `## Overview

Improve the AI chat panel with persistent history, suggested prompts, streaming responses, and multi-account context awareness.

## Stories
- FA-40-S4: Multi-account context in chat (#FA-63)

_Migrated from Jira FA-40_`,
  },

  // ─── STORIES ──────────────────────────────────────────────────────────────

  {
    title: "FA-36-S4: Add and delete accounts",
    labels: ["backlog"],
    body: `## Description

Allow the user to create new accounts (with a name and auto-assigned colour) and delete existing accounts along with all their data.

## Acceptance Criteria

- [ ] An 'Add Account' button opens a modal with a name field (required, max 40 chars) and a colour picker (preset swatches).
- [ ] Saving creates the account, adds it to the selector, and switches to it.
- [ ] A 'Delete Account' option (accessible from account selector or settings) shows a confirmation modal listing how many months of data will be lost.
- [ ] Confirming deletion removes all transactions and the account record; the app switches to the first remaining account.
- [ ] Cannot delete the last remaining account — the delete option is disabled with a tooltip.
- [ ] Name uniqueness is validated; duplicate names show an inline error.

## UX Notes

Colour swatches: 8 preset options. The deletion confirmation modal should feel serious — red confirm button, clear data-loss warning.

## Technical Notes

ID generation: \`crypto.randomUUID()\`. Modal can be a shared Modal component from \`src/components/ui/\`.

---
_Migrated from Jira FA-48 · Epic: FA-36 Multi-Account Support_`,
  },

  {
    title: "FA-36-S5: Combined 'All Accounts' view",
    labels: ["backlog"],
    body: `## Description

Add an 'All Accounts' option to the account selector that aggregates transactions from all accounts for the selected months, with account-colour coding in charts and lists.

## Acceptance Criteria

- [ ] Selecting 'All Accounts' merges transactions from all accounts for the active month selection.
- [ ] The Monthly Summary panel shows combined totals.
- [ ] The Spend by Category panel aggregates across accounts.
- [ ] In the transaction list (FA-38-S1), each row shows a colour dot indicating its source account.
- [ ] Switching away from 'All Accounts' to a specific account does not retain combined data.

## UX Notes

'All Accounts' appears at the top of the selector with a multi-coloured icon. Account colour dots in lists should be subtle (small circle, 8 px).

## Technical Notes

Implement by extending the data hook to accept \`accountId | 'all'\` and merging arrays when \`'all'\`. Ensure deduplication logic accounts for transactions with identical IDs across accounts.

---
_Migrated from Jira FA-49 · Epic: FA-36 Multi-Account Support_`,
  },

  {
    title: "FA-37-S4: Monthly trend chart panel",
    labels: ["backlog"],
    body: `## Description

Add a monthly trend chart to the dashboard showing total spend per month across all uploaded months (always all months, not filtered by toggle).

## Acceptance Criteria

- [ ] A Recharts bar or line chart shows total spend per uploaded month.
- [ ] Chart always shows all available months regardless of the month toggle selection.
- [ ] The currently selected month(s) bars/points are visually highlighted.
- [ ] Hover tooltip shows month label and exact spend amount.
- [ ] Chart is hidden (or shows empty state) when fewer than 2 months of data exist.
- [ ] Chart is dark-themed using design tokens.

## UX Notes

Bar chart preferred over line for monthly totals — easier to compare discrete periods. Selected month bars: accent colour. Unselected bars: muted token colour.

## Technical Notes

Aggregate from all stored months for the current account (or all accounts). Do not filter by MonthToggleBar selection.

---
_Migrated from Jira FA-53 · Epic: FA-37 Dashboard Rebuild_`,
  },

  {
    title: "FA-37-S5: Dashboard empty & loading states",
    labels: ["backlog"],
    body: `## Description

Add consistent empty and loading states across all dashboard panels so the dashboard is presentable before any data is uploaded.

## Acceptance Criteria

- [ ] When no data is loaded, each panel shows a themed empty-state placeholder (icon + message).
- [ ] While AI categorisation is running, panels that depend on categories show a skeleton loader.
- [ ] Loading and empty states use dark-mode tokens and match the overall design language.
- [ ] Empty state for MonthlySummary includes a CTA button linking to the Upload page.
- [ ] No panel throws an error or shows unstyled content when data is absent.

## UX Notes

Empty state icon: outline style, muted colour, 48 px. Message: 1 short sentence. Skeleton: animated pulse using token colours. CTA button: primary variant from FA-35-S3.

## Technical Notes

Create a reusable \`EmptyState\` component in \`src/components/ui/\` and a \`SkeletonCard\` component. Wire into each panel individually.

---
_Migrated from Jira FA-54 · Epic: FA-37 Dashboard Rebuild_`,
  },

  {
    title: "FA-38-S2: Inline category editing in transactions table",
    labels: ["in-review"],
    body: `## Description

Allow users to change a transaction's category directly from the transactions table without navigating away.

## Acceptance Criteria

- [ ] Clicking the category cell in a table row opens an inline dropdown of all available categories.
- [ ] Selecting a category immediately updates the transaction and persists to storage.
- [ ] The dashboard Spend by Category panel reflects the change on next render.
- [ ] The override is stored separately from the AI category (consistent with existing override model).
- [ ] Escape key or clicking outside cancels the edit.
- [ ] A visual 'edited' indicator (e.g. a small dot) appears on overridden rows.
- [ ] Bulk category update: selecting multiple rows (checkbox column) and choosing a category updates all selected rows.

## UX Notes

Inline dropdown: same width as the cell, dark-themed, keyboard navigable. Edited indicator: accent-coloured dot in the category cell. Bulk selection: checkbox in first column, bulk-action bar appears at bottom of screen when rows are selected.

## Technical Notes

Reuse the category override storage logic from the existing manual override story. The bulk-action bar should be a fixed-position component that mounts/unmounts based on selection state.

---
_Migrated from Jira FA-56 · Epic: FA-38 Transactions View · **PR open for review**_`,
  },

  {
    title: "FA-39-S2: Category budgets in settings",
    labels: ["backlog"],
    body: `## Description

Add a Category Budgets section to the Settings page where users can set a monthly spend target for each category. Budgets are shown on the Dashboard spend panel.

## Acceptance Criteria

- [ ] Category Budgets section lists all 9 categories with an editable currency input.
- [ ] Budgets are saved to localStorage on blur (not on every keystroke).
- [ ] A $0 or blank value means 'no budget set' for that category.
- [ ] On the Spend by Category dashboard panel, categories with a budget show a progress bar (actual / budget) and turn red when over budget.
- [ ] Budget data is scoped per account (different accounts can have different budgets).
- [ ] All inputs are keyboard accessible and screen-reader labelled.

## UX Notes

Currency input: prefix $ symbol, right-aligned number, 2 decimal places. Progress bar: thin (4 px), accent colour up to 100%, red beyond. Over-budget row: red tint on the category label.

## Technical Notes

Store budgets as \`{ [accountId]: { [category]: number } }\` in localStorage. Expose \`getBudgets(accountId)\` and \`setBudget(accountId, category, amount)\` from the storage module.

---
_Migrated from Jira FA-58 · Epic: FA-39 Settings Page_
> ⚠️ Jira shows a merged PR for this story but status was still "Backlog" — verify if already done before starting.`,
  },

  {
    title: "FA-39-S3: Data export and reset",
    labels: ["backlog"],
    body: `## Description

Add a Data Management section to the Settings page with options to export all data as JSON and to perform a full or per-account data reset.

## Acceptance Criteria

- [ ] 'Export Data' button downloads a JSON file containing all accounts, transactions, category overrides, and budgets.
- [ ] Exported filename: \`finance-analyser-export-YYYY-MM-DD.json\`.
- [ ] 'Reset Account Data' button (per account) clears all transactions and overrides for that account after confirmation.
- [ ] 'Factory Reset' button clears all localStorage data (all accounts, all transactions, all settings) after a two-step confirmation.
- [ ] Two-step confirmation: first click shows a warning modal; second click (labelled 'Yes, delete everything') performs the action.
- [ ] After factory reset, app returns to the initial empty state with the default account.
- [ ] All destructive actions are logged to the browser console for debugging.

## UX Notes

Export button: secondary/ghost variant. Reset buttons: danger variant (red). Factory Reset section has a red border or warning banner to draw attention. Two-step modal second button must be red and require deliberate click.

## Technical Notes

Use \`URL.createObjectURL\` + \`a.click()\` pattern for file download. Factory reset calls \`localStorage.clear()\` then reinitialises the default account. No server calls — purely client-side.

---
_Migrated from Jira FA-59 · Epic: FA-39 Settings Page_
> ⚠️ Jira shows a merged PR for this story but status was still "Backlog" — verify if already done before starting.`,
  },

  {
    title: "FA-40-S4: Multi-account context in chat",
    labels: ["backlog"],
    body: `## Description

When 'All Accounts' is selected, include transaction data from all accounts in the AI chat context, with account names clearly labelled in the system prompt.

## Acceptance Criteria

- [ ] When the active account is 'All Accounts', the system prompt includes transactions from all accounts, each labelled with their account name.
- [ ] The system prompt clearly states how many accounts are included and their names.
- [ ] When a single account is selected, the system prompt includes only that account's data (existing behaviour).
- [ ] Context window is managed: if total token estimate exceeds 80k tokens, include only the most recent 3 months across all accounts and append a note to the system prompt.
- [ ] The chat clears and reloads history when the active account changes.
- [ ] A Vitest test validates the context-building logic for multi-account scenarios.

## UX Notes

No visible UI change beyond the account selector already covered in FA-36-S2. The system prompt labelling is invisible to the user but the AI responses will reference account names naturally.

## Technical Notes

Extend the \`buildSystemPrompt(transactions, accounts)\` utility. Keep the prompt construction logic pure and testable. Token estimation: use character count / 4 as a rough proxy.

---
_Migrated from Jira FA-63 · Epic: FA-40 AI Chat Enhancements · Depends on FA-49 (All Accounts view)_`,
  },

  // ─── BUGS ─────────────────────────────────────────────────────────────────

  {
    title: "Bug FA-65: Dashboard Spend by Category ignores manual category overrides",
    labels: ["bug", "backlog"],
    body: `## Summary

After the user overrides a transaction category inline (FA-56), the Spend by Category panel on the dashboard does not update to reflect the new category.

## Expected

After overriding a transaction category, the Spend by Category panel on the dashboard updates to reflect the new category on next render.

## Actual

\`buildCategoryRows()\` in \`src/utils/categoryData.ts\` reads \`t.category\` only. The \`categoryOverride\` field introduced in FA-56 is ignored, so the dashboard always shows the original AI-assigned category regardless of user overrides.

## Steps to Reproduce

1. Upload a CSV and navigate to Transactions.
2. Change any transaction category via the inline dropdown.
3. Navigate to the Dashboard.
4. Observe that Spend by Category still shows the old AI category.

## Fix

Change line 15 of \`categoryData.ts\` from:
\`\`\`ts
const cat = t.category || "Uncategorised";
\`\`\`
to:
\`\`\`ts
const cat = t.categoryOverride ?? t.category || "Uncategorised";
\`\`\`

---
_Migrated from Jira FA-65 · Linked to FA-56_`,
  },

  {
    title: "Bug FA-66: bulkOverrideTransactionCategory silently creates empty data for non-existent month",
    labels: ["bug", "backlog"],
    body: `## Summary

\`bulkOverrideTransactionCategory\` returns \`success: true\` and writes an empty array to localStorage when called with a monthKey that does not exist in storage.

## Expected

\`bulkOverrideTransactionCategory\` should return \`success: false\` when the given monthKey does not exist in storage (consistent with \`overrideTransactionCategory\` behaviour).

## Actual

When called with a non-existent monthKey, \`loadTransactions\` returns an empty array without an error. The function then saves an empty array to that monthKey, creating a ghost month entry in storage. It returns \`success: true\`.

## Steps to Reproduce

1. Call \`bulkOverrideTransactionCategory("2099-01", [0], "Dining")\` with no data for that month.
2. Observe \`success: true\` is returned and a new empty entry is written to localStorage.

## Fix

Add a guard — if \`transactions.length === 0\` and indices are non-empty, return an error (or check whether the monthKey exists before proceeding).

---
_Migrated from Jira FA-66 · Linked to FA-56_`,
  },
];

// ---------------------------------------------------------------------------
// Step 3 — Create all issues
// ---------------------------------------------------------------------------

console.log(`\n🚀 Creating ${ISSUES.length} issues on ${REPO}...\n`);

for (const issue of ISSUES) {
  process.stdout.write(`  Creating: ${issue.title}...`);
  const url = createIssue(issue);
  console.log(` ✓\n    ${url}`);
}

console.log("\n✅ All issues created!\n");
console.log("Next steps:");
console.log("  1. Check FA-58 and FA-59 — they had merged PRs in Jira. Close them as 'done' if the work is already merged.");
console.log("  2. Find the open PR for FA-56 and link it to the new GitHub Issue.");
console.log("  3. Run: gh issue list --repo", REPO, "--label backlog\n");
