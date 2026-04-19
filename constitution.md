<!--
Sync Impact Report
==================
Version change: 1.1.0 → 2.0.0 (MAJOR — full automation rewrite)
Modified sections:
  - Feature Lifecycle: replaced entirely with automated pipeline (7 steps)
  - Auto-Approved Actions: removed
  - Always Requires Approval: removed
  - Replaced by: Automation Rules (new, with two subsections)
Added sections:
  - Merge Strategy
  - Scope Creep Rule
Unchanged sections:
  - Golden Rules, Issue Types, Issue Labels, Story Sequencing,
    Agent Coordination, Governance
Templates reviewed:
  - All .specify/templates/ ✅ — no updates required
Deferred TODOs: none
-->

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

1. User provides requirements.
2. User runs `/speckit-specify` → `/speckit-plan` → `/speckit-tasks`.
3. spec-kit creates GitHub Issues from tasks via `/speckit-taskstoissues`.
4. Delivery Lead agent picks up automatically.
5. **Developer agent**: claims issue → creates branch → implements →
   opens PR → transitions label to `status:in-review`.
6. **QA agent**: writes tests → checks DoR/DoD → security scan →
   if pass: squash merges automatically. If fail: fixes autonomously,
   loops max 3 attempts, then stops and notifies user.
7. Repeat until backlog is empty.

---

## Automation Rules

### Fully Automated (no user confirmation needed)

- All git operations (branch create, commit, push, merge, delete branch)
- All PR operations (create, review, squash merge)
- All GitHub Issue operations (create, label, comment, close)
- All file operations (create, edit, delete) inside `src/`
- All config file edits
- `npm install`, test runs, lint, build
- Bug issue creation for out-of-scope issues found during implementation
- Test failure auto-fix (up to 3 attempts before escalating)

### Stop and Ask User Only When

- Spec is silent on a product decision
- Security issue found (API key exposed, credentials in code)
- Test failures persist after 3 fix attempts
- Fundamental conflict with constitution detected
- Behaviour that would affect user data or localStorage schema

---

## Merge Strategy

- Always squash merge: `gh pr merge <number> --squash --delete-branch`
- After merge: close the issue with comment "Merged in PR #X. Story complete."
- Branch deletion is automatic and immediate after merge.

---

## Scope Creep Rule

If a Developer finds something broken outside the current story:

1. Open a GitHub Issue with label `type:bug` and `status:backlog`.
2. Add a comment to the current story issue referencing the new bug.
3. Continue with the current story — do not fix the out-of-scope issue.

---

## Governance

This constitution supersedes all other documentation, practices, or conventions
in the repository. In cases of conflict, this document MUST be treated as
authoritative.

### Amendment Procedure

1. Propose the change in a GitHub Issue labelled `type:story` with a clear
   rationale and diff of the affected sections.
2. User reviews and approves the proposal (explicit "yes" required).
3. Apply the amendment, increment the version, update `Last Amended`, and
   add a Sync Impact Report comment at the top of this file.
4. Propagate any changes to dependent templates under `.specify/templates/`.
5. Commit with message: `docs: amend constitution to vX.Y.Z (<summary>)`.

### Versioning Policy

Versions follow Semantic Versioning (`MAJOR.MINOR.PATCH`):

- **MAJOR** — backward-incompatible removal or redefinition of a Golden Rule
  or core governance section (e.g., removing an approval gate, changing the
  branching model).
- **MINOR** — new section added or existing section materially expanded (e.g.,
  adding a new agent role, new label, new lifecycle stage).
- **PATCH** — clarifications, wording fixes, typo corrections, non-semantic
  refinements with no behavioural impact.

### Compliance

- Every PR description MUST include a "Constitution Check" confirming no Golden
  Rules are violated.
- QA agents MUST verify compliance against this document before approving a PR.
- Any agent that cannot comply with a rule MUST stop and surface the conflict
  to the user rather than proceeding.

**Version**: 2.0.0 | **Ratified**: 2026-04-19 | **Last Amended**: 2026-04-19
