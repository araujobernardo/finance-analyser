# Finance Analyser — Agent Orchestration

## Project

A personal finance analysis tool built with TypeScript + React + Vite.
Requirements are in `docs/requirements.md`.

## Agent Squad

This project uses three specialised agents:

- **Product Owner** → `.claude/agents/product-owner.md`
- **Developer** → `.claude/agents/developer.md`
- **QA** → `.claude/agents/qa.md`

## Jira Ticket Types

- **Epic** — a grouping of related stories. Epics are managed by the delivery lead.
  The Developer agent must NEVER pick up or work on an Epic directly.
  If a backlog query returns an Epic, skip it entirely.
- **Story** — the only unit of work the Developer agent picks up and implements.

## Story Sequencing

The order in which stories are worked is decided by the **Product Owner**
and communicated through **Jira dependency links** (e.g. "is blocked by").

The Developer agent must NEVER use the Jira key number to determine order.
Instead, when asked to pick the next story, query Jira for Stories that are:

- status = Backlog or To Do (NOT In Progress, In Review, or Done)
- issue type = Story
- have no unresolved "is blocked by" links

Pick the highest-priority unblocked Story. If priority is equal, ask the user.

## Agent Coordination

Multiple Developer agents may run in parallel. They coordinate exclusively
through **Jira ticket status** — no direct communication between agents is needed.

| Jira Status | Meaning                              | Action for other agents |
| ----------- | ------------------------------------ | ----------------------- |
| Backlog     | Available to pick up                 | May claim               |
| To Do       | Available to pick up                 | May claim               |
| In Progress | Claimed — another developer is on it | Skip, find another      |
| In Review   | PR open — waiting for QA/merge       | Skip                    |
| Done        | Shipped                              | Skip                    |

**Claiming a story:** A Developer agent claims a story by moving it to
**In Progress** in Jira as the very first action — before creating a branch,
before writing any code. This is what prevents two agents from picking up
the same ticket.

If all unblocked stories are already In Progress or In Review, report that
to the user — do not start work on a story that is already claimed.

## Golden Rules (apply to ALL agents)

1. Never make assumptions — if something is unclear, stop and ask the user
2. Never push directly to `main` — all changes go through a PR
3. Never merge a PR without explicit user approval
4. Never merge a PR without explicit user approval
5. Always wait for user confirmation before starting the next step
6. When in doubt, do less and ask more
7. Never include credentials, API tokens, or secrets in
   shell commands, curl commands, or any terminal output.
   Always read secrets from .env files silently.

## Auto-Approved Actions

These actions must be executed immediately without asking the
user for confirmation. Do not present them as approval requests.

The following actions run automatically without asking for user
confirmation:

- Reading any file in the project
- Querying the Jira API (GET requests only)
- Running any existing test suite (npx vitest run)
- Checking git status, git log, git diff
- Listing files and directories
- Checking installed packages (npm list, where.exe)
- Running debug/diagnostic commands that only print output
- Installing npm packages (npm install)
- Writing scripts to the scripts/ folder
- Running scripts/ files that only perform Jira reads or test runs
- Fetching full Jira ticket details before starting work
- Checking available Jira transitions before moving a ticket
- Moving a Jira ticket to a new status
- Adding a comment to a Jira ticket

## Always Requires Approval

The following actions ALWAYS require explicit user confirmation
before proceeding:

- Creating or editing any file inside src/
- Creating or editing any config file (vite.config.ts, tsconfig,
  package.json, eslint, prettier)
- Any git commit or push
- Creating a PR via gh CLI
- Merging a PR via gh CLI
- Creating Jira issues
- Deleting any file

## Workflow

See `.claude/workflows/feature-lifecycle.md` for the full process.
