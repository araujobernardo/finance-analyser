/**
 * Updates FA-17 through FA-32 Jira stories with full Definition of Ready content.
 * Run with: node scripts/update-dor-fa17-fa32.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter(line => line.includes("="))
    .map(line => { const i = line.indexOf("="); return [line.slice(0, i).trim(), line.slice(i + 1).trim()]; })
);

const BASE_URL  = env.VITE_JIRA_BASE_URL;
const EMAIL     = env.VITE_JIRA_EMAIL;
const API_TOKEN = env.VITE_JIRA_API_TOKEN;

const AUTH = "Basic " + Buffer.from(`${EMAIL}:${API_TOKEN}`).toString("base64");
const HEADERS = {
  Authorization: AUTH,
  "Content-Type": "application/json",
  Accept: "application/json",
};

async function jiraPut(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PUT",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT ${path} → ${res.status} ${res.statusText}: ${text}`);
  }
}

// Helper: build ADF document from plain text sections
function adfDoc(...blocks) {
  return { version: 1, type: "doc", content: blocks };
}

function adfHeading(text, level = 2) {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }],
  };
}

function adfParagraph(text) {
  return {
    type: "paragraph",
    content: [{ type: "text", text }],
  };
}

function adfBulletList(items) {
  return {
    type: "bulletList",
    content: items.map(item => ({
      type: "listItem",
      content: [{ type: "paragraph", content: [{ type: "text", text: item }] }],
    })),
  };
}

// ─── Story definitions ────────────────────────────────────────────────────────

const stories = [
  {
    key: "FA-17",
    description: adfDoc(
      adfHeading("Description"),
      adfParagraph("Automatically categorise each transaction (e.g. Groceries, Transport, Utilities, Dining) using the Claude API so the user does not have to tag every row by hand. Categories are stored alongside transactions and can be overridden by the user."),
      adfHeading("Acceptance Criteria"),
      adfBulletList([
        "When transactions are loaded, each one is assigned a category string",
        "Categories are derived by sending transaction descriptions to the Claude API",
        "The categorisation result is persisted to localStorage alongside the transaction data",
        "The user can manually override a category and the override is saved",
        "If the Claude API is unavailable, transactions are stored with category 'Uncategorised'",
        "No API key is ever exposed in the browser bundle or console",
      ]),
      adfHeading("User Experience"),
      adfParagraph("After uploading a CSV, the user sees a spinner labelled 'Categorising transactions…'. Once complete, each transaction row in the table shows its category. Clicking a category opens an inline dropdown to pick a different one. N/A for drag-and-drop behaviour."),
      adfHeading("Technical Notes"),
      adfBulletList([
        "Create src/services/categorisation.ts — calls Claude API (claude-haiku-4-5-20251001 for cost efficiency)",
        "Batch transaction descriptions into a single prompt to minimise API calls",
        "Store category on the Transaction type: category?: string",
        "API key read from VITE_CLAUDE_API_KEY in .env (never commit)",
        "Update src/services/storage.ts to persist the category field",
        "Edge cases: empty description, very long description (truncate to 200 chars), network timeout",
      ]),
      adfHeading("Story Points"),
      adfParagraph("5")
    ),
  },
  {
    key: "FA-18",
    description: adfDoc(
      adfHeading("Description"),
      adfParagraph("Display all loaded transactions in a sortable, filterable table so the user can browse and search their spending history at a glance."),
      adfHeading("Acceptance Criteria"),
      adfBulletList([
        "All transactions from localStorage are displayed in a table with columns: Date, Description, Amount, Balance (if present), Category",
        "The user can sort any column ascending or descending by clicking its header",
        "The user can filter by typing in a search box — matches against Description and Category",
        "The user can filter by date range using two date inputs (from / to)",
        "Positive and negative amounts are visually distinguished (e.g. green / red text)",
        "The table handles 1 000+ rows without freezing the UI",
      ]),
      adfHeading("User Experience"),
      adfParagraph("Table renders immediately on page load if localStorage contains data. Sort arrows appear on column headers. Search and date range inputs sit above the table. Rows update instantly as the user types or changes filters. No pagination — use virtual scrolling or windowing if performance requires it."),
      adfHeading("Technical Notes"),
      adfBulletList([
        "Create src/components/TransactionTable.tsx",
        "Use useMemo to derive the filtered + sorted row list",
        "For large datasets consider react-window or a simple slice-based approach",
        "Reuse loadAllTransactions() from src/services/storage.ts",
        "Sorting state: { column: keyof Transaction; direction: 'asc' | 'desc' }",
        "Edge cases: no transactions loaded, all transactions filtered out, amount exactly zero",
      ]),
      adfHeading("Story Points"),
      adfParagraph("3")
    ),
  },
  {
    key: "FA-19",
    description: adfDoc(
      adfHeading("Description"),
      adfParagraph("Show the user a monthly summary panel — total income, total expenses, and net savings — so they can understand their financial position for any given month at a glance."),
      adfHeading("Acceptance Criteria"),
      adfBulletList([
        "A summary panel shows: Total Income (sum of positive amounts), Total Expenses (sum of negative amounts, shown as positive), Net Savings (income − expenses)",
        "The panel updates when the user selects a different month from a dropdown",
        "Currency values are formatted with the correct symbol and two decimal places",
        "If no data exists for the selected month, the panel shows zeros with an explanatory note",
        "The currently selected month is highlighted in the dropdown",
      ]),
      adfHeading("User Experience"),
      adfParagraph("Summary panel sits above the transaction table. Month selector is a <select> populated from getStoredMonths(). Selecting a month updates both the summary panel and the transaction table simultaneously. Values animate briefly (e.g. count-up) when they change — optional nice-to-have."),
      adfHeading("Technical Notes"),
      adfBulletList([
        "Create src/components/MonthlySummary.tsx",
        "Use getStoredMonths() and loadTransactions(monthKey) from src/services/storage.ts",
        "Income = transactions where amount > 0, Expenses = transactions where amount < 0",
        "Format currency using Intl.NumberFormat with locale 'en-NZ' and currency 'NZD'",
        "Edge cases: month with only income, month with only expenses, single transaction month",
      ]),
      adfHeading("Story Points"),
      adfParagraph("2")
    ),
  },
  {
    key: "FA-20",
    description: adfDoc(
      adfHeading("Description"),
      adfParagraph("Add client-side routing using React Router v6 so the application has distinct pages (Dashboard, Upload, History, Settings) with bookmarkable URLs and working browser back/forward navigation."),
      adfHeading("Acceptance Criteria"),
      adfBulletList([
        "Navigating to / shows the Dashboard page",
        "Navigating to /upload shows the Upload page",
        "Navigating to /history shows the Transaction History page",
        "Navigating to /settings shows the Settings page",
        "Browser back and forward buttons work correctly between pages",
        "Unknown URLs (e.g. /foo) show a 404 / Not Found page",
        "The active nav link is visually highlighted",
      ]),
      adfHeading("User Experience"),
      adfParagraph("A persistent top navigation bar contains links to all four pages. Clicking a link updates the URL and renders the correct page without a full page reload. Active link is underlined or bolded. Mobile: nav collapses to a hamburger menu (accessible via keyboard)."),
      adfHeading("Technical Notes"),
      adfBulletList([
        "Install react-router-dom v6: npm install react-router-dom",
        "Wrap App in <BrowserRouter> in src/main.tsx",
        "Create src/components/NavBar.tsx using <NavLink> for active styling",
        "Create placeholder page components: src/pages/DashboardPage.tsx, UploadPage.tsx, HistoryPage.tsx, SettingsPage.tsx",
        "Move existing CsvUpload logic into UploadPage",
        "Edge cases: direct URL access on any route, navigating away mid-upload (warn user if file selected)",
      ]),
      adfHeading("Story Points"),
      adfParagraph("3")
    ),
  },
  {
    key: "FA-21",
    description: adfDoc(
      adfHeading("Description"),
      adfParagraph("Let the user view, rename, and delete previously uploaded months from a dedicated History page, so they can manage their stored data without needing to re-upload everything."),
      adfHeading("Acceptance Criteria"),
      adfBulletList([
        "The History page lists all stored months with their transaction count and total net amount",
        "The user can delete a month — a confirmation dialog appears before deletion",
        "After deletion the month disappears from the list immediately",
        "The user can see when a month was last updated (stored timestamp)",
        "If no months are stored, an empty-state message is shown",
      ]),
      adfHeading("User Experience"),
      adfParagraph("Each month appears as a card or row with: month label (e.g. 'March 2025'), transaction count, net amount, last updated date, and a Delete button. Delete shows a confirmation dialog: 'Delete March 2025? This cannot be undone.' with Cancel and Delete buttons."),
      adfHeading("Technical Notes"),
      adfBulletList([
        "Create src/pages/HistoryPage.tsx",
        "Use getStoredMonths() and removeMonth() from src/services/storage.ts",
        "Add lastUpdated: string (ISO date) to the stored month index entry in storage.ts",
        "Confirmation dialog: reuse DuplicateWarningModal.tsx or create a generic ConfirmDialog component",
        "Edge cases: deleting the only stored month, storage.ts removeMonth() throwing, concurrent tab deleting same month",
      ]),
      adfHeading("Story Points"),
      adfParagraph("2")
    ),
  },
  {
    key: "FA-22",
    description: adfDoc(
      adfHeading("Description"),
      adfParagraph("Allow the user to export their transaction data as a CSV file so they can use it in other tools such as Excel or Google Sheets."),
      adfHeading("Acceptance Criteria"),
      adfBulletList([
        "An Export button is visible on the Transaction History or Dashboard page",
        "Clicking Export downloads a .csv file to the user's device",
        "The CSV includes all currently filtered transactions (not just the visible page)",
        "The CSV has headers: Date, Description, Amount, Balance, Category",
        "The filename includes the selected month or date range (e.g. 'transactions-2025-03.csv')",
        "The download works in Chrome, Firefox, and Safari without a server",
      ]),
      adfHeading("User Experience"),
      adfParagraph("Export button sits near the top of the transaction table. Clicking it immediately triggers the browser's native file download — no extra dialog. If no transactions are loaded, the button is disabled with tooltip 'No transactions to export'."),
      adfHeading("Technical Notes"),
      adfBulletList([
        "Create src/utils/exportCsv.ts — builds a CSV string and triggers download via a Blob + URL.createObjectURL",
        "Use the same Transaction type from csvParser.ts",
        "Escape commas and quotes in cell values per RFC 4180",
        "Edge cases: description containing commas, description containing double-quotes, amount exactly zero, missing balance field",
      ]),
      adfHeading("Story Points"),
      adfParagraph("2")
    ),
  },
  {
    key: "FA-23",
    description: adfDoc(
      adfHeading("Description"),
      adfParagraph("Persist the user's preferences (default currency, preferred date format, theme) in localStorage so they are remembered between sessions."),
      adfHeading("Acceptance Criteria"),
      adfBulletList([
        "A Settings page allows the user to choose: currency (NZD, AUD, USD, GBP), date display format (DD/MM/YYYY or YYYY-MM-DD), and colour theme (Light / Dark)",
        "Preferences are saved automatically when changed (no Save button needed)",
        "Preferences persist after closing and reopening the browser",
        "All other parts of the UI respect the chosen currency and date format",
        "Theme switch takes effect immediately without a page reload",
      ]),
      adfHeading("User Experience"),
      adfParagraph("Settings page has three labelled controls: a currency dropdown, a date format radio group, and a theme toggle switch. Each change is reflected instantly across the app. A subtle 'Saved' confirmation appears briefly after each change."),
      adfHeading("Technical Notes"),
      adfBulletList([
        "Create src/services/settings.ts with saveSettings() and loadSettings()",
        "Create src/pages/SettingsPage.tsx",
        "Create src/hooks/useSettings.ts — provides settings and a setter, syncs to localStorage",
        "Theme: add a data-theme attribute to <html> and define CSS variables for light/dark in index.css",
        "Currency formatting: pass locale + currency to Intl.NumberFormat",
        "Edge cases: corrupt settings in localStorage (reset to defaults), unknown theme value",
      ]),
      adfHeading("Story Points"),
      adfParagraph("3")
    ),
  },
  {
    key: "FA-24",
    description: adfDoc(
      adfHeading("Description"),
      adfParagraph("Show the user a spending breakdown by category as a pie or donut chart so they can see at a glance where their money is going each month."),
      adfHeading("Acceptance Criteria"),
      adfBulletList([
        "A donut (or pie) chart displays total spending per category for the selected month",
        "Each slice is labelled with the category name and percentage",
        "Hovering a slice shows the exact dollar amount in a tooltip",
        "The chart updates when the user selects a different month",
        "If a month has fewer than two categories, a friendly message replaces the chart",
        "Income transactions (positive amounts) are excluded from the chart",
      ]),
      adfHeading("User Experience"),
      adfParagraph("Chart appears on the Dashboard page below the monthly summary panel. Legend sits to the right of the chart (or below on mobile). Each category has a distinct colour. Clicking a slice filters the transaction table to that category."),
      adfHeading("Technical Notes"),
      adfBulletList([
        "Install recharts: npm install recharts",
        "Create src/components/SpendingPieChart.tsx using <PieChart> from recharts",
        "Group transactions by category, sum absolute amounts for negative transactions only",
        "Colours: define a fixed palette of 10+ distinct colours, cycle if more categories exist",
        "Edge cases: 'Uncategorised' category (show as grey), single category, zero-amount transactions",
      ]),
      adfHeading("Story Points"),
      adfParagraph("3")
    ),
  },
  {
    key: "FA-25",
    description: adfDoc(
      adfHeading("Description"),
      adfParagraph("Show the user a month-by-month bar chart of income vs expenses so they can track financial trends over time."),
      adfHeading("Acceptance Criteria"),
      adfBulletList([
        "A grouped bar chart shows Income and Expenses for each stored month",
        "Months are ordered chronologically on the X-axis",
        "Hovering a bar shows the exact value in a tooltip",
        "A net savings line is overlaid on the bars",
        "The chart scrolls horizontally if more than 6 months of data are present",
        "If fewer than 2 months of data exist, an explanatory message replaces the chart",
      ]),
      adfHeading("User Experience"),
      adfParagraph("Chart appears on the Dashboard page. Income bars are green, Expense bars are red, Net line is blue. Legend sits above the chart. On mobile the chart is horizontally scrollable within its container."),
      adfHeading("Technical Notes"),
      adfBulletList([
        "Create src/components/MonthlyTrendChart.tsx using <BarChart> and <Line> from recharts (ComposedChart)",
        "Aggregate income and expenses per month using getStoredMonths() + loadTransactions()",
        "X-axis labels: short month name + year (e.g. 'Mar 25')",
        "Use ResponsiveContainer for responsive sizing",
        "Edge cases: month with no expenses, month with no income, single month of data",
      ]),
      adfHeading("Story Points"),
      adfParagraph("3")
    ),
  },
  {
    key: "FA-26",
    description: adfDoc(
      adfHeading("Description"),
      adfParagraph("Add a budget feature so the user can set a monthly spending limit per category and see at a glance whether they are on track or overspending."),
      adfHeading("Acceptance Criteria"),
      adfBulletList([
        "The user can set a monthly budget amount for each category",
        "Budgets are persisted in localStorage",
        "The Dashboard shows each category with its budget, actual spend, and a progress bar",
        "Categories over budget are highlighted in red",
        "Categories under budget are highlighted in green",
        "The user can edit or delete a budget at any time",
      ]),
      adfHeading("User Experience"),
      adfParagraph("A 'Budgets' section on the Dashboard lists categories. Each row: category name, budget input (editable), actual spend, progress bar (0–100%). Rows over 100% turn red. An 'Add Budget' button opens a small form: category dropdown + amount input. Deleting a budget shows a confirmation."),
      adfHeading("Technical Notes"),
      adfBulletList([
        "Create src/services/budgets.ts — saveBudget(), loadBudgets(), deleteBudget()",
        "Budget shape: { category: string; monthlyLimit: number }",
        "Create src/components/BudgetTracker.tsx",
        "Progress bar: (actualSpend / monthlyLimit) * 100, capped at 100% visually but show real % in tooltip",
        "Edge cases: category renamed after budget set, budget of zero, spend greater than 2× budget",
      ]),
      adfHeading("Story Points"),
      adfParagraph("3")
    ),
  },
  {
    key: "FA-27",
    description: adfDoc(
      adfHeading("Description"),
      adfParagraph("Let the user search for any transaction across all stored months using a global search box, so they do not have to know which month a transaction occurred in."),
      adfHeading("Acceptance Criteria"),
      adfBulletList([
        "A search input is accessible from the top navigation bar on all pages",
        "Typing at least 2 characters triggers a search across all stored months",
        "Results show: date, description, amount, month label",
        "Clicking a result navigates to that month in the History page with the transaction highlighted",
        "Search is case-insensitive and matches partial words",
        "Pressing Escape clears the search and closes the results panel",
      ]),
      adfHeading("User Experience"),
      adfParagraph("Search box sits in the NavBar (right-aligned). Results appear in a dropdown panel below the input (max 10 results shown, with 'See all X results' link if more). Results are keyboard-navigable (arrow keys + Enter). Matches in description are highlighted in bold."),
      adfHeading("Technical Notes"),
      adfBulletList([
        "Create src/hooks/useGlobalSearch.ts — loads all months, filters across all transactions",
        "Debounce input by 300 ms to avoid thrashing localStorage reads",
        "Create src/components/GlobalSearch.tsx for the UI",
        "Highlight matches: split description on match, wrap matched segment in <strong>",
        "Edge cases: search term is only whitespace, all months deleted, 10 000+ transactions (debounce + useMemo)",
      ]),
      adfHeading("Story Points"),
      adfParagraph("3")
    ),
  },
  {
    key: "FA-28",
    description: adfDoc(
      adfHeading("Description"),
      adfParagraph("Support importing transactions in OFX / QFX format (used by many New Zealand and Australian banks) so users who cannot export CSV can still import their data."),
      adfHeading("Acceptance Criteria"),
      adfBulletList([
        "The upload component accepts .ofx and .qfx files in addition to .csv",
        "OFX transactions are parsed into the same Transaction shape as CSV transactions",
        "Date, description (NAME or MEMO field), and amount are correctly extracted",
        "Invalid or malformed OFX files show a clear error message",
        "Duplicate month detection works the same as for CSV uploads",
        "The existing CSV parser is not broken by this change",
      ]),
      adfHeading("User Experience"),
      adfParagraph("The upload zone label updates to 'Drop CSV or OFX/QFX file here'. Error messages for malformed OFX files follow the same pattern as CSV errors. No other UI changes."),
      adfHeading("Technical Notes"),
      adfBulletList([
        "Create src/utils/ofxParser.ts — parses SGML-style OFX (not XML OFX 2.x) using string parsing",
        "OFX date format: YYYYMMDD or YYYYMMDDHHMMSS — convert to ISO 8601",
        "Map STMTTRN fields: DTPOSTED → date, NAME or MEMO → description, TRNAMT → amount",
        "Update CsvUpload.tsx accept attribute to include .ofx,.qfx",
        "Update useFileUpload.ts to detect file type by extension and call the correct parser",
        "Edge cases: OFX with no transactions, mixed CRLF/LF line endings, amount with explicit + sign",
      ]),
      adfHeading("Story Points"),
      adfParagraph("3")
    ),
  },
  {
    key: "FA-29",
    description: adfDoc(
      adfHeading("Description"),
      adfParagraph("Add a recurring transaction detector that identifies likely subscriptions and regular bills so the user can spot automatic payments they may have forgotten about."),
      adfHeading("Acceptance Criteria"),
      adfBulletList([
        "The app identifies transactions that appear in at least 2 consecutive months with the same description and similar amounts (within 5%)",
        "Detected recurring transactions are listed in a dedicated 'Recurring' section",
        "Each entry shows: description, frequency (monthly), average amount, and last seen date",
        "The user can dismiss a detected recurring transaction (it is removed from the list and not re-detected)",
        "The list is re-computed whenever new data is uploaded",
      ]),
      adfHeading("User Experience"),
      adfParagraph("A 'Recurring Transactions' card on the Dashboard below the budget tracker. Each entry has a dismiss button (×). Empty state: 'No recurring transactions detected yet — upload at least 2 months of data.' Dismissed entries can be restored via a 'Show dismissed' toggle."),
      adfHeading("Technical Notes"),
      adfBulletList([
        "Create src/utils/recurringDetector.ts — pure function: takes all transactions, returns RecurringTransaction[]",
        "Normalise descriptions before comparing (lowercase, trim, collapse whitespace)",
        "Amount similarity: |a - b| / max(|a|, |b|) < 0.05",
        "Persist dismissed keys in localStorage via src/services/storage.ts (new dismissedRecurring key)",
        "Edge cases: description appears 2× in one month (not recurring), amount is zero, only one month of data",
      ]),
      adfHeading("Story Points"),
      adfParagraph("3")
    ),
  },
  {
    key: "FA-30",
    description: adfDoc(
      adfHeading("Description"),
      adfParagraph("Add a savings goal feature so the user can set a target amount and see their projected timeline to reach it based on their average monthly net savings."),
      adfHeading("Acceptance Criteria"),
      adfBulletList([
        "The user can create a savings goal with a name and target amount",
        "The app calculates the average monthly net savings from all stored months",
        "The goal shows: target amount, months to reach goal, projected date",
        "If average savings ≤ 0, a warning replaces the timeline ('Increase your savings rate to reach this goal')",
        "The user can edit or delete a goal",
        "Goals are persisted in localStorage",
      ]),
      adfHeading("User Experience"),
      adfParagraph("A 'Savings Goals' card on the Dashboard. Each goal shows a progress bar (0% to 100% of target, assuming current savings are cumulative) and the projected date in plain language (e.g. 'In about 8 months — November 2025'). 'Add Goal' opens a small inline form."),
      adfHeading("Technical Notes"),
      adfBulletList([
        "Create src/services/goals.ts — saveGoal(), loadGoals(), deleteGoal()",
        "Goal shape: { id: string; name: string; targetAmount: number; createdAt: string }",
        "Create src/components/SavingsGoals.tsx",
        "Average net savings: mean of (income − expenses) per month across all stored months",
        "Projected months = targetAmount / averageMonthlySavings (round up)",
        "Edge cases: zero target, negative average savings, only one month of data, goal already reached",
      ]),
      adfHeading("Story Points"),
      adfParagraph("3")
    ),
  },
  {
    key: "FA-31",
    description: adfDoc(
      adfHeading("Description"),
      adfParagraph("Add a spending anomaly detector that flags transactions that are unusually large or out-of-pattern for their category, so the user can notice unexpected charges quickly."),
      adfHeading("Acceptance Criteria"),
      adfBulletList([
        "Transactions that are more than 2 standard deviations above the mean for their category are flagged as anomalies",
        "Flagged transactions are highlighted in the transaction table with a warning icon",
        "A dedicated 'Anomalies' section lists all flagged transactions with an explanation (e.g. '3× your usual Groceries spend')",
        "The user can dismiss an anomaly (mark as 'expected')",
        "Anomaly detection runs automatically after each upload",
        "Categories with fewer than 3 historical transactions are excluded from detection",
      ]),
      adfHeading("User Experience"),
      adfParagraph("Flagged rows in the transaction table have a yellow warning icon in the leftmost column. The Anomalies card on the Dashboard lists each flagged transaction with date, description, amount, and the comparison sentence. Each entry has a 'Mark as expected' button."),
      adfHeading("Technical Notes"),
      adfBulletList([
        "Create src/utils/anomalyDetector.ts — pure function: takes transactions[], returns flagged transaction IDs",
        "Use population standard deviation (not sample) for consistency",
        "Persist dismissed anomaly IDs in localStorage",
        "Minimum sample size: skip categories with < 3 transactions",
        "Edge cases: all transactions in a category are identical (stdDev = 0, no anomalies), single transaction month, very large outlier skewing the mean",
      ]),
      adfHeading("Story Points"),
      adfParagraph("3")
    ),
  },
  {
    key: "FA-32",
    description: adfDoc(
      adfHeading("Description"),
      adfParagraph("Add a conversational AI chat panel powered by the Claude API so the user can ask natural language questions about their finances (e.g. 'How much did I spend on food last month?') and get instant answers."),
      adfHeading("Acceptance Criteria"),
      adfBulletList([
        "A chat panel is accessible from all pages via a persistent button or sidebar",
        "The user can type a question and receive a natural language answer from Claude",
        "Claude has access to the user's transaction data as context (passed in the system prompt)",
        "The chat retains message history within the session (cleared on page reload)",
        "If no transaction data is loaded, Claude responds: 'Please upload some transactions first.'",
        "Errors from the Claude API are shown as an inline message in the chat",
        "No transaction data is sent to the API without the user having uploaded it first",
      ]),
      adfHeading("User Experience"),
      adfParagraph("A floating '💬 Ask AI' button in the bottom-right corner opens a slide-up chat panel. Panel has a message list and an input bar at the bottom. User message appears immediately on the right, Claude's response streams in on the left with a typing indicator. Close button (×) collapses the panel."),
      adfHeading("Technical Notes"),
      adfBulletList([
        "Create src/components/ChatPanel.tsx and src/hooks/useChat.ts",
        "Create src/services/chat.ts — calls Claude API (claude-sonnet-4-6) with streaming",
        "System prompt: include a JSON summary of the user's transactions (total per category per month), not raw rows",
        "Use the Anthropic Messages API with stream: true for streaming responses",
        "API key: read from VITE_CLAUDE_API_KEY — same key as categorisation (FA-17)",
        "Edge cases: user sends empty message, API rate limit hit, response truncated mid-stream, very long transaction history (summarise, do not send raw data)",
      ]),
      adfHeading("Story Points"),
      adfParagraph("5")
    ),
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  for (const story of stories) {
    process.stdout.write(`Updating ${story.key}... `);
    try {
      await jiraPut(`/rest/api/3/issue/${story.key}`, {
        fields: { description: story.description },
      });
      console.log("✓");
    } catch (err) {
      console.log(`✗ ${err.message}`);
    }
  }
  console.log("\nDone.");
}

main();
