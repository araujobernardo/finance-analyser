# Project Constitution

This document is the single source of truth for governance, agent coordination,
and delivery process for the Finance Analyser project. Every AI tool and agent
must follow these rules exactly.

---

## Golden Rules

These apply to ALL agents and AI tools without exception:

1. Never make assumptions — if something is unclear, stop and ask the user.
2. Never push directly to `main` — all changes go through a PR.
3. Never merge a PR without explicit user approval.
4. Always wait for user confirmation before starting the next step.
5. When in doubt, do less and ask more.
6. Never include credentials, API tokens, or secrets in shell commands, curl
   commands, or any terminal output. Always read secrets from `.env` files silently.

---

## Jira Ticket Types

- **Epic** — a grouping of related stories. Managed by the delivery lead only.
  Developer agents must NEVER pick up or work on an Epic directly.
  If a backlog query returns an Epic, skip it.
- **Story** — the only unit of work a Developer agent picks up and implements.

---

## Story Sequencing

Delivery order is decided by the **Product Owner** and communicated through
**Jira dependency links** (e.g. "is blocked by").

Developer agents must NEVER use the Jira key number to determine order.
When asked to pick the next story, query Jira for Stories that are:

- `status` = Backlog or To Do (NOT In Progress, In Review, or Done)
- `issuetype` = Story
- have no unresolved "is blocked by" links

Pick the highest-priority unblocked Story. If priority is equal, ask the user.

---

## Agent Coordination

Multiple Developer agents may run in parallel. They coordinate exclusively
through **Jira ticket status** — no direct communication between agents.

| Jira Status | Meaning                              | Action for other agents |
| ----------- | ------------------------------------ | ----------------------- |
| Backlog     | Available to pick up                 | May claim               |
| To Do       | Available to pick up                 | May claim               |
| In Progress | Claimed — another developer is on it | Skip, find another      |
| In Review   | PR open — waiting for QA/merge       | Skip                    |
| Done        | Shipped                              | Skip                    |

**Claiming a story:** Move the Jira ticket to **In Progress** as the very first
action — before creating a branch, before writing any code.

If all unblocked stories are already In Progress or In Review, report that to the
user. Do not start work on a story that is already claimed.

---

## Feature Lifecycle

End-to-end process for delivering a Story:

```
User approves Story
       ↓
Developer Agent claims story in Jira (→ In Progress)
       ↓
Developer Agent enters worktree (isolated directory for this branch)
       ↓
Developer Agent implements the Story
       ↓
Developer Agent opens Pull Request
       ↓
Developer Agent exits worktree
       ↓
User reviews PR exists → notifies QA Agent
       ↓
QA Agent reviews PR + writes tests
       ↓
QA Agent submits review report to user
       ↓
User decides: Approve or Request Changes
       ↓ (if approved)
User merges PR
       ↓
Jira ticket moves to Done
       ↓
Next Story begins
```

### Handoff Points (where agents stop and wait)

| Agent         | Stops after                     | Waits for                  |
| ------------- | ------------------------------- | -------------------------- |
| Product Owner | Presenting Epic/Story breakdown | User approval              |
| Product Owner | Creating Jira tickets           | User to assign first story |
| Developer     | Entering worktree               | Automatically continues    |
| Developer     | Opening PR + exiting worktree   | User to notify QA          |
| QA            | Submitting review report        | User merge decision        |

No agent proceeds past a handoff point without explicit user approval.
"Explicit approval" means the user types yes or a clear confirmation.
Agents must not interpret silence or ambiguity as approval.

---

## Auto-Approved Actions

The following actions run automatically without asking for user confirmation:

- Reading any file in the project
- Querying the Jira API (GET requests only)
- Running any existing test suite (`npx vitest run`)
- Checking git status, git log, git diff
- Listing files and directories
- Checking installed packages (`npm list`, `where.exe`)
- Running debug/diagnostic commands that only print output
- Installing npm packages (`npm install`)
- Writing scripts to the `scripts/` folder
- Running `scripts/` files that only perform Jira reads or test runs
- Fetching full Jira ticket details before starting work
- Checking available Jira transitions before moving a ticket
- Moving a Jira ticket to a new status
- Adding a comment to a Jira ticket

---

## Always Requires Approval

The following actions ALWAYS require explicit user confirmation before proceeding:

- Creating or editing any file inside `src/`
- Creating or editing any config file (`vite.config.ts`, `tsconfig`, `package.json`, `eslint`, `prettier`)
- Any git commit or push
- Creating a PR via `gh` CLI
- Merging a PR via `gh` CLI
- Creating Jira issues
- Deleting any file
