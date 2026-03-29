# Personal Finance Analyser

## Tool Requirements Document

_Version 1.1_

## 1. Purpose

This document defines the requirements for a personal finance analysis
tool to be used by a single user. Its goal is to help the user understand
their spending habits by ingesting monthly bank statement CSVs,
automatically categorising transactions, and presenting insights through
an interactive dashboard and an AI chat interface the user can converse
with about their finances.

## 2. Context & Constraints

- **User:** Single user — no authentication, accounts, or multi-user
  support required.
- **Platform:** Runs entirely in a local web browser. No server, no
  backend, no deployment needed.
- **Data input:** Monthly CSV exports from a New Zealand bank account,
  uploaded manually each session.
- **Data storage:** All data must persist between sessions.

## 3. In Scope

### 3.1 Statement Ingestion

- Accept CSV file uploads from the user's NZ bank
- Parse and validate the CSV structure on upload, flagging any formatting
  issues
- Detect and reject duplicate uploads (same month uploaded twice)
- Support uploading multiple months of history over time

### 3.2 Transaction Categorisation

- Automatically categorise each transaction into predefined categories:
  Groceries, Dining, Transport, Utilities, Entertainment, Health,
  Shopping, Income, Other
- Use AI (via the Anthropic API) to assign categories based on merchant
  names and transaction descriptions
- Allow the user to manually override a category for any transaction
- Remember past categorisation decisions and apply them consistently

### 3.3 Interactive Dashboard

- A persistent app shell with a top navigation bar linking to three views:
  Dashboard, Budget, and Chat. The active view is highlighted.
  The shell renders on all pages and does not re-mount between navigation.
- Month filter uses toggle buttons — each month individually
  selectable/deselectable
- Show total income vs total spend for selected period
- Spend broken down by category with amounts and percentages
- Visual interactive charts (click a category to drill into transactions)
- Largest individual transactions for the selected period
- When multiple months selected, show combined sum and per-month average
- Monthly Trends chart remains visible when multiple months selected
- Dashboard updates automatically when a new statement is uploaded

### 3.4 Trends Over Time

- Show month-over-month trends once multiple months are available
- Display how spending in each category changes over time
- Show total spend trend across months

### 3.5 Budget vs Actual

- Allow user to set a monthly budget for each spending category
- Compare actual spending against budget for current month
- Visually highlight categories that are over or under budget
- Budgets persist between sessions

### 3.6 AI Chat Interface

- Chat panel for natural language questions about finances
- AI has full context of transaction history
- Example questions:
  - "How much did I spend on dining last month?"
  - "What's my biggest expense category this year?"
  - "Am I spending more or less on groceries than 3 months ago?"
  - "Where can I cut back to save an extra $200 a month?"
- AI responds conversationally with specific figures from actual data
- Powered by the Claude API

## 4. Out of Scope

- Multi-user / login
- Bank API / Open Banking integration
- Google Drive / external storage
- Mobile app
- Shared / published hosting
- Investment / savings tracking
- Multi-currency support
- PDF statement support

## 5. Design Decisions

- **Data persistence:** Browser localStorage
- **Default categories:** Preset list, user-editable
- **AI categorisation & chat:** Claude API
- **User interaction:** Interactive dashboard + AI chat

## 6. Assumptions

- NZ bank CSV format: Date, Description, Amount, Balance columns
- User has an Anthropic API key
- All transactions are in NZD
- Income transactions (credits) tracked separately from expenses (debits)

## 7. Success Criteria

- CSV upload and categorised report in under 30 seconds
- At least 85% of transactions correctly auto-categorised
- Budget targets set and visually compared against actual spend
- After 3+ months of data, clear trend charts visible
- All data persists correctly between browser sessions
