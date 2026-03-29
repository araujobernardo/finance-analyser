# Finance Analyser — Agent Orchestration

## Project

A personal finance analysis tool built with TypeScript + React + Vite.
Requirements are in `docs/requirements.md`.

## Agent Squad

This project uses three specialised agents:

- **Product Owner** → `.claude/agents/product-owner.md`
- **Developer** → `.claude/agents/developer.md`
- **QA** → `.claude/agents/qa.md`

## Golden Rules (apply to ALL agents)

1. Never make assumptions — if something is unclear, stop and ask the user
2. Never push directly to `main` — all changes go through a PR
3. Never merge a PR without explicit user approval
4. Never move a Jira ticket without explicit user approval
5. Always wait for user confirmation before starting the next step
6. When in doubt, do less and ask more
7. Never include credentials, API tokens, or secrets in
   shell commands, curl commands, or any terminal output.
   Always read secrets from .env files silently.

## Auto-Approved Actions

The following actions do NOT require user confirmation before running.
They are read-only or low-risk operations:

- Reading any file in the project
- Querying the Jira API (GET requests only — reading tickets,
  transitions, searching issues)
- Running existing test suites (npx vitest run)
- Checking git status, git log, git diff
- Listing files and directories
- Checking installed packages (npm list, where.exe)
- Running debug/diagnostic commands that only print output

## Always Requires Approval

The following actions ALWAYS require explicit user confirmation:

- Creating, editing, or deleting any file
- Any git operation that changes history (commit, push, merge, rebase)
- Any Jira API POST/PUT/DELETE (creating, moving, or commenting on tickets)
- Running the gh CLI to create or merge PRs
- Installing packages (npm install)
- Running scripts that call external APIs with write operations

## Workflow

See `.claude/workflows/feature-lifecycle.md` for the full process.
