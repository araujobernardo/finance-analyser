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

## Issue Types

Work is tracked as **GitHub Issues** in this repository.

- **Epic** — a grouping of related stories, represented as a GitHub **Milestone**.
  Developer agents must NEVER pick up or work on a Milestone directly.
- **Story** — the only unit of work a Developer agent picks up and implements,
  represented as a GitHub **Issue** with label `type:story`.

---

## Issue Labels

| Label                | Meaning                                    |
| -------------------- | ------------------------------------------ |
| `type:story`         | A deliverable Story                        |
| `type:bug`           | A bug raised during QA review              |
| `status:backlog`     | Available to pick up                       |
| `status:in-progress` | Claimed — a developer is working on it     |
| `status:in-review`   | PR open — waiting for QA/merge             |
| `blocked`            | Has an unresolved blocker (see issue body) |

Closed issues = Done / shipped.

---

## Story Sequencing

Delivery order is decided by the **Product Owner** and communicated through
**"Blocked by #XX"** references in the issue body.

Developer agents must NEVER use the issue number to determine order.
When asked to pick the next story, run:

```bash
"C:/Program Files/GitHub CLI/gh.exe" issue list \
  --label "type:story" --label "status:backlog" --state open
```

Filter out any issue whose body contains an unresolved "Blocked by #XX" (where
issue #XX is still open). Pick the highest-priority unblocked story. If priority
is equal, ask the user.

---

## Agent Coordination

Multiple Developer agents may run in parallel. They coordinate exclusively
through **GitHub Issue labels** — no direct communication between agents.

| Issue label/state    | Meaning                              | Action for other agents |
| -------------------- | ------------------------------------ | ----------------------- |
| `status:backlog`     | Available to pick up                 | May claim               |
| `status:in-progress` | Claimed — another developer is on it | Skip, find another      |
| `status:in-review`   | PR open — waiting for QA/merge       | Skip                    |
| closed               | Shipped                              | Skip                    |

**Claiming a story:** Remove `status:backlog` and add `status:in-progress` as
the very first action — before creating a branch, before writing any code:

```bash
"C:/Program Files/GitHub CLI/gh.exe" issue edit <number> \
  --remove-label "status:backlog" --add-label "status:in-progress"
```

If all unblocked stories are already `status:in-progress` or `status:in-review`,
report that to the user. Do not start work on a story that is already claimed.

---

## Feature Lifecycle

End-to-end process for delivering a Story:

```
User approves Story
       ↓
Developer Agent claims issue (status:backlog → status:in-progress)
       ↓
Developer Agent enters worktree (isolated directory for this branch)
       ↓
Developer Agent implements the Story
       ↓
Developer Agent opens Pull Request
       ↓
Developer Agent exits worktree, labels issue status:in-review
       ↓
User reviews PR exists → notifies QA Agent
       ↓
QA Agent reviews PR + writes tests
       ↓
QA Agent submits review report to user
       ↓
User decides: Approve or Request Changes
       ↓ (if approved)
User merges PR → issue closed
       ↓
Next Story begins
```

### Handoff Points (where agents stop and wait)

| Agent         | Stops after                     | Waits for                  |
| ------------- | ------------------------------- | -------------------------- |
| Product Owner | Presenting Epic/Story breakdown | User approval              |
| Product Owner | Creating GitHub Issues          | User to assign first story |
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
- Running `gh issue list`, `gh issue view`, `gh pr list`, `gh pr view` (read-only)
- Running any existing test suite (`npx vitest run`)
- Checking git status, git log, git diff
- Listing files and directories
- Checking installed packages (`npm list`, `where.exe`)
- Running debug/diagnostic commands that only print output
- Installing npm packages (`npm install`)
- Writing scripts to the `scripts/` folder
- Running `scripts/` files that only perform read operations or test runs
- Labelling a GitHub Issue (status transitions: `status:backlog` → `status:in-progress` → `status:in-review`)
- Adding a comment to a GitHub Issue

---

## Always Requires Approval

The following actions ALWAYS require explicit user confirmation before proceeding:

- Creating or editing any file inside `src/`
- Creating or editing any config file (`vite.config.ts`, `tsconfig`, `package.json`, `eslint`, `prettier`)
- Any git commit or push
- Creating a PR via `gh pr create`
- Merging a PR via `gh pr merge`
- Creating GitHub Issues (`gh issue create`)
- Deleting any file
