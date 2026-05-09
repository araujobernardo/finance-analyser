# Dev Mentor — Learning Progress

> Track your software development curriculum progress here.
> Update this file as you complete topics and exercises.

---

## My Setup

| Field       | Value                                                  |
| ----------- | ------------------------------------------------------ |
| Language    | TypeScript                                             |
| Framework   | React + Vite                                           |
| OS          | Windows 11                                             |
| Project     | Finance Analyser                                       |
| Repo        | araujobernardo/finance-analyser (private)              |
| GitHub CLI  | `gh` (full path: `C:/Program Files/GitHub CLI/gh.exe`) |
| AI Tooling  | Claude Code + spec-kit                                 |
| Node        | Node.js (npm)                                          |
| Python tool | uv (for spec-kit)                                      |

> ⚠️ Jira has been removed from the project. All work tracking now uses GitHub Issues.

---

## Curriculum Progress

### 1. Git & Version Control ✅

- [x] Basic commands (clone, add, commit, push, pull)
- [x] Branching strategies (feature branches per story, trunk-based with PR merges)
- [x] Pull requests, code reviews, merge conflicts
- [x] Commit message conventions (Conventional Commits)

**Exercises completed:**

- Cloned repo from GitHub to local machine
- Made first commit (`chore: add .env.example`) and pushed to GitHub
- Created feature branches for every story using naming convention `feat/FA-XX-description`
- Opened 70+ PRs, all squash merged via `gh pr merge --squash --delete-branch`
- Used Conventional Commits throughout: `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`
- Learned the difference between `git restore`, `git restore --staged`, and `git reset`
- Learned PowerShell navigation: `cd`, `ls`, `pwd`, `mkdir`
- Discovered that `LF will be replaced by CRLF` warnings are harmless on Windows
- Cleaned up 14 abandoned git worktrees left by agent sessions
- Used `git worktree list` and `git worktree remove --force` for cleanup
- Learned that `git merge --no-ff` preserves merge commit history vs squash
- Understood when to squash (feature code) vs regular merge (config/docs)

---

### 2. VS Code Mastery ✅

- [x] Essential extensions for my stack
- [x] Keyboard shortcuts and productivity tips
- [x] Integrated terminal, debugger, and Git panel
- [x] Settings sync and workspace configuration

**Exercises completed:**

- Installed extensions: ESLint, Prettier, GitLens, TypeScript Next, Tailwind CSS
- Configured `settings.json` with `formatOnSave`, `defaultFormatter`, `wordWrap`, `autoSave`
- Learned key shortcuts: `Ctrl+Shift+P`, `Ctrl+P`, `Ctrl+\``, `Ctrl+D`, `Alt+↑/↓`
- Used Claude Code extension directly inside VS Code for all agent interactions
- Learned the difference between VS Code's integrated terminal and external PowerShell
- Configured `.claude/settings.local.json` to auto-approve all Claude Code tool permissions

---

### 3. Claude Code ✅

- [x] Installation and setup
- [x] Using it for scaffolding, refactoring, and debugging
- [x] Effective prompting patterns for code tasks
- [x] When to trust AI output vs. when to verify manually
- [x] Sub-agent architecture (Delivery Lead spawning Developer and QA)
- [x] Permission management via `.claude/settings.local.json`

**Exercises completed:**

- Used Claude Code to read, create, and edit files across the entire project
- Built a 3-agent execution squad: Developer, QA, Delivery Lead
- Learned role-based prompting with agent files in `.claude/agents/`
- Caught Claude Code hardcoding credentials in a script — learned to always verify
- Learned the distinction between auto-approved actions vs requires-approval
- Fixed permission prompts by configuring `settings.local.json` with `Bash(*)`, `Read(*)`, `Write(*)`, `Edit(*)`, `MultiEdit(*)`, `Glob(*)`, `Grep(*)`, `PowerShell(*)`
- Discovered that two settings files (`settings.json` + `settings.local.json`) can conflict — solved by using only `settings.local.json`
- Learned that Claude Code only reads permissions on startup — must restart after config changes

---

### 4. Code Quality Gates ✅

- [x] Linters and formatters (ESLint, Prettier)
- [x] Pre-commit hooks with Husky
- [x] Code style guides and team conventions
- [x] CI quality gates blocking merges on red builds
- [ ] Static analysis tools

**Exercises completed:**

- **Layer 1 — Pre-commit hooks:** Installed Husky + lint-staged; runs ESLint --fix and Prettier --write on every commit
- Verified the hook fires by making an intentional formatting error and watching it auto-fix
- **Layer 2 — GitHub Actions CI:** `.github/workflows/ci.yml` triggers on every PR and push to main
- CI pipeline has 4 gates: Install → ESLint → Prettier check → Test suite
- CI caught a real ESLint error on the first run — pipeline working as intended
- Fixed `HUSKY=0` env var to prevent Husky from failing in CI runner
- **Layer 3 — Test reporting:** Configured Vitest JUnit reporter + `dorny/test-reporter@v1` in CI
- Fixed Vite CVEs by running `npm audit fix`
- **Quality gate enforcement:** QA agent now runs `gh pr checks --watch` before every merge — no merge on red CI
- Learned that GitHub branch protection rules require a paid plan for private repos — used agent-level enforcement instead

---

### 5. Testing Strategy ✅

- [x] Unit tests — structure, naming, and what to test
- [x] Integration and end-to-end tests
- [x] Regression testing and test suites
- [x] Test coverage as a quality metric (not a vanity metric)
- [ ] Test-driven development (TDD) basics

**Exercises completed:**

- Set up Vitest + Testing Library + jsdom from scratch
- 400+ tests across 25+ test files — all written by QA agent
- Learned `describe` / `it` / `expect` structure
- Learned `vi.spyOn`, `vi.fn()`, `vi.mock()` for mocking
- Learned `beforeEach(() => localStorage.clear())` pattern for test isolation
- Understood why async FileReader tests need `await new Promise(r => setTimeout(r, 50))`
- Learned `{ applyAccept: false }` trick for testing file type rejection
- Saw QA agent catch subtle bugs — tests are a safety net, not a vanity metric
- Learned that `.env` values leak into Vitest — fixed with `vi.stubEnv()`
- Added `chatStorage.test.ts`, `useChatHistory.test.ts`, `claudeChat.test.ts` as part of FA-53

---

### 6. CI/CD with GitHub Actions ✅

- [x] What CI/CD is and why it matters
- [x] Writing your first workflow file
- [x] Running tests automatically on every pull request
- [x] Blocking merges when quality gates fail
- [ ] Automated deployments to staging/production

**Exercises completed:**

- Wrote `ci.yml` from scratch with `on: push/pull_request` triggers
- Used `npm ci` instead of `npm install` for faster, deterministic CI installs
- Added `HUSKY: 0` env var to prevent Husky hook registration in CI
- Set `if: always()` on test reporter so results publish even when tests fail
- Watched the pipeline catch real bugs on first runs
- Added `checks: write` and `pull-requests: write` permissions for test reporters
- Understood that CI + agent-level `gh pr checks --watch` is the correct quality gate strategy for private repos on free GitHub plan

---

### 7. Modern Development Workflow ✅

- [x] Full feature lifecycle: issue → branch → code → test → PR → review → merge → deploy
- [x] Working effectively with an AI agent team
- [x] Documentation habits (constitution, architecture, standards, changelog)
- [x] Project governance and agent coordination
- [ ] Incident response and rollback strategies
- [ ] Automated deployments to staging/production

**Exercises completed:**

- Built complete AI agent team: Developer, QA, Delivery Lead + spec-kit planning layer
- Migrated from Jira to GitHub Issues — full backlog of 15 stories migrated via script
- Wrote a `create-github-issues.mjs` migration script using `gh` CLI
- Implemented Definition of Ready and Definition of Done for spec-kit workflow
- Set up CHANGELOG.md — auto-maintained by Delivery Lead after every merge
- Learned the difference between tool-specific config (CLAUDE.md) and tool-agnostic docs (constitution.md)

---

## Agentic Development Workflow (New Curriculum Layer)

This is a major addition beyond the original curriculum — building a reusable AI development pipeline.

### 8. Spec-Driven Development with spec-kit ✅

- [x] Installed spec-kit via `uv` (Python CLI tool from GitHub)
- [x] Understand the `/specify → /plan → /tasks → /implement` workflow
- [x] spec-kit generates specs, plans, tasks, and GitHub Issues from requirements
- [x] Ran first full pipeline on FA-53 (AI Chat Enhancements)
- [x] Configured auto-commit hooks in spec-kit git extension
- [x] Understand spec-kit's role: **planning tool**, not replacement for execution agents

**Key concepts:**

- spec-kit = Product Owner + Planner (specification layer)
- Your agents = Execution team (Developer, QA, Delivery Lead)
- constitution.md = The rulebook both follow
- Specs live in `specs/[feature-name]/` — spec.md, plan.md, research.md, data-model.md, tasks.md, ux-brief.md

**Commands:**

```
/speckit-specify    → turns requirements into a spec
/speckit-plan       → turns spec into technical plan
/speckit-tasks      → turns plan into actionable task list
/speckit-taskstoissues → creates GitHub Issues from tasks
```

---

### 9. Project Constitution & Documentation Architecture ✅

- [x] Single Source of Truth principle — one file, not duplicated across agents
- [x] Tool-agnostic docs (`docs/`) vs tool-specific config (`.claude/`, `.github/`)
- [x] Agent files reference docs — never duplicate content
- [x] constitution.md at repo root — governs all agents and tools

**File structure:**

```
constitution.md              → Governance (version controlled, all agents read this)
docs/
  architecture.md            → Tech stack, file layout, constraints
  design-system.md           → Colour tokens, typography, spacing, components
  standards/
    coding-standards.md      → TypeScript strict, component size limits
    git-workflow.md          → Branching, commits, PRs
    testing-strategy.md      → Vitest, co-located tests, coverage
  definition-of-ready.md    → Story must meet this before agent picks it up
  definition-of-done.md     → Story must meet this before merge
CLAUDE.md                    → Thin wrapper (20 lines) pointing to docs/
.github/
  copilot-instructions.md   → Thin wrapper for GitHub Copilot
.claude/
  agents/                   → Role definitions (reference docs/, don't duplicate)
  skills/                   → spec-kit skills (SKILL.md files)
.specify/                   → spec-kit working directory
specs/                      → Feature specs generated by spec-kit
```

---

### 10. Full Automation Model ✅

- [x] Agents run fully autonomously — no approval gates except 4 stop conditions
- [x] QA merges automatically when all CI checks pass
- [x] Squash merge + branch delete is the standard merge strategy
- [x] CHANGELOG.md updated after every merge
- [x] Scope creep — open bug issue, continue current story
- [x] Test failures — 3 auto-fix attempts, then escalate to user

**The 4 stop conditions (only time agents ask user):**

1. Spec is silent on a product decision
2. Security issue found (API key exposed, credentials in code)
3. Test failures after 3 fix attempts
4. Behaviour that would affect user data or localStorage schema

**Golden Rules (constitution v2.2.0):**

1. Never make assumptions about product requirements — if spec is silent, ask
2. Never expose credentials, API tokens, or secrets in any file, command, or output
3. Never modify localStorage schema without flagging to user
4. Never skip the Definition of Ready check before implementation
5. Never skip the Definition of Done check before merging
6. When in doubt about a product decision, do less and ask more

---

### 11. Designer Agent & Design System ✅

- [x] Added Designer agent to pipeline (between spec-kit tasks and Developer)
- [x] Designer only runs for UI stories — skipped for services/hooks/utils/tests
- [x] Designer researches real app references and presents 3 concrete options
- [x] User picks an option — Designer writes UX brief — Developer implements
- [x] Design system based on Monarch Money visual language

**Design system foundations (`docs/design-system.md`):**

- Colour tokens: deep navy backgrounds, soft white text, teal/green accent
- Typography: Sora font, 4px base spacing system
- Component patterns: cards, buttons, inputs, charts, empty states, skeletons
- Finance Analyser principles: insight over data, green/red = good/bad only, one primary action per screen
- Reference apps: Monarch Money (primary), Copilot Money (secondary), Linear (interaction patterns)

**Pipeline with Designer:**

```
/speckit-specify → /speckit-plan → /speckit-tasks → /speckit-taskstoissues
       ↓
Delivery Lead picks up story
       ↓
[UI story?] → Designer presents 3 options → User picks → UX brief written
[Non-UI?]  → Skip Designer
       ↓
Developer implements (using UX brief for UI stories)
       ↓
QA: tests → CI checks → security scan → auto-merge
       ↓
CHANGELOG updated → Next story
```

---

## Finance App — What's Been Built

### Completed Features

| Area         | Feature                                     | Status  |
| ------------ | ------------------------------------------- | ------- |
| Upload       | CSV upload with drag-and-drop               | ✅ Done |
| Upload       | NZ bank CSV auto-detection                  | ✅ Done |
| Storage      | localStorage persistence service            | ✅ Done |
| Upload       | Duplicate upload detection + warning modal  | ✅ Done |
| AI           | Auto-categorise transactions via Claude API | ✅ Done |
| Transactions | Manual category override with table         | ✅ Done |
| Transactions | Category rules — remember past decisions    | ✅ Done |
| Dashboard    | Spend by Category donut chart               | ✅ Done |
| Dashboard    | Monthly Summary panel                       | ✅ Done |
| Dashboard    | Largest Transactions panel                  | ✅ Done |
| Dashboard    | Monthly Trend chart panel (FA-53-S4)        | ✅ Done |
| Dashboard    | Empty & loading states (FA-54)              | ✅ Done |
| Accounts     | Multi-account support                       | ✅ Done |
| Accounts     | Add and delete accounts                     | ✅ Done |
| Accounts     | Combined 'All Accounts' view                | ✅ Done |
| Transactions | Inline category editing                     | ✅ Done |
| Settings     | Category budgets                            | ✅ Done |
| Settings     | Data export and reset                       | ✅ Done |
| Chat         | Persistent chat history                     | ✅ Done |
| Chat         | Multi-account AI context                    | ✅ Done |
| Chat         | chatStorage unit tests                      | ✅ Done |

### In Progress

| Area  | Feature                           | Status      |
| ----- | --------------------------------- | ----------- |
| UX/UI | Full prototype-driven UX overhaul | 🔄 Planning |

### Technical Stats

- **Test count:** 400+ tests across 25+ test files
- **PRs merged:** 70+
- **Agents:** Developer, QA, Delivery Lead, Designer
- **Constitution version:** v2.2.0

---

## What's Next

### Immediate — UX/UI Overhaul

The app is functionally complete but needs a full UX redesign based on the original prototype (`finance-dashboard.jsx`). Key issues to fix:

- **Layout:** Switch from top navbar to sidebar layout (matching prototype)
- **Upload flow:** Upload is a sidebar action, not a dedicated page — auto-navigate to Dashboard after upload
- **Multi-month selection:** Select a date range, not just one month
- **Account switching:** Content updates immediately, no refresh needed
- **Dashboard panels:** All panels (Spend by Category, Largest Transactions, Trend chart) belong on Dashboard, not Upload page
- **Design tokens:** Align to design-system.md — currently 30+ undocumented CSS variables

The overhaul uses the prototype as the reference spec, not the current app.

### Upcoming Curriculum Topics

- [ ] **Automated deployments** — deploy Finance Analyser to Vercel or Netlify via GitHub Actions
- [ ] **Incident response and rollback** — how to revert a bad merge, hotfix workflow
- [ ] **TDD basics** — write tests before implementation on one story
- [ ] **Static analysis** — add TypeScript strict checks, possibly SonarCloud
- [ ] **Performance monitoring** — Lighthouse CI, bundle size tracking
- [ ] **Reusing the dev team** — apply the full pipeline (spec-kit + agents + Designer) to a second, different project

### The Bigger Goal

Finance Analyser is the proving ground. The real output is a **reusable agentic development pipeline** that can be pointed at any project:

1. Give requirements in plain English
2. spec-kit plans the work
3. Designer ensures quality UX
4. Developer implements
5. QA tests and merges
6. Get working software

This pipeline is now proven on Finance Analyser. Next step: apply it to a new project from scratch.

---

## Key Concepts Learned

**Git**

- `git reset --soft HEAD~1` undoes a commit but keeps the changes staged
- Squash merging keeps main history clean — all feature commits become one
- `git worktree list` shows all active worktrees; `git worktree remove --force` cleans up abandoned ones
- Two settings files can conflict — always check which one loads last

**TypeScript / React**

- Optional fields (`balance?: number`) are the right tool when data might not always exist
- Custom hooks keep components clean — logic lives in `useChatHistory`, not in `ChatPanel`
- `import.meta.env` is how Vite exposes environment variables — must be prefixed with `VITE_`
- `useRef` + `FileReader` is the correct pattern for reading file contents in React

**Testing**

- Tests next to the file they test (`csvParser.ts` → `csvParser.test.ts`) is industry standard
- `beforeEach(() => localStorage.clear())` is essential for storage tests
- Mock what you don't own: `vi.spyOn(Storage.prototype, 'setItem')` to simulate quota exceeded
- CI catching a bug on first run is the pipeline working correctly — not a failure

**CI/CD**

- `npm ci` is always better than `npm install` in CI — faster and deterministic
- `HUSKY: 0` prevents Husky from failing when there's no `.git` directory in CI
- `if: always()` on a workflow step means it runs even if previous steps failed
- Branch protection rules require a paid GitHub plan for private repos — use agent-level enforcement instead

**Agentic Development**

- Single Source of Truth: one document defines everything, agents reference it — never duplicate
- Tool-agnostic docs (`docs/`) outlast any specific tool; CLAUDE.md is just a thin pointer
- The Designer agent's job is UX decisions, not visual tweaks — it researches real references
- Agents that merge without CI passing create debt — `gh pr checks --watch` is non-negotiable
- Two `.claude/` settings files conflict — use only `settings.local.json`, keep it out of git
- spec-kit is a planning tool, not an execution tool — they work at different layers
- The only time to stop full automation is the 4 constitutional stop conditions

**Design**

- Monarch Money = right reference for "regular person, financial insights, clean dark UI"
- A design system is the single source of truth for visual decisions — agents read it before touching UI
- The Designer presents 3 concrete options with real app references — never asks open-ended questions
- Insight over data: show "why do I have less money?" not just the numbers

---

## Session Log

> This table is automatically updated by the Delivery Lead agent after each story is merged.
> Entries follow the format: Date | Topic/Story | Notes

| Date       | Topic Covered                                                                           | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-29 | Phase 1 — Foundation                                                                    | Installed tools, configured VS Code, created GitHub repo, scaffolded React app                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-03-29 | Phase 2 — Agent squad                                                                   | Built Product Owner, Developer, QA agents; wired Jira API; first agent-written PR                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-03-29 | Phase 3 — Jira board                                                                    | Kanban board live, 18 stories created with dependencies, GitHub-Jira integration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-03-29 | Phase 4 begins — FA-13                                                                  | First full agent lifecycle: code → PR → QA review → merge → Done                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-03-29 | FA-14, FA-15                                                                            | CSV parser with real NZ bank format; localStorage service with 22 tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-04-02 | FA-16, FA-17                                                                            | Duplicate detection modal; Claude API categorisation; fixed VITE\_ key naming                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-04-02 | Delivery Lead                                                                           | Built orchestrator agent; "pick up the next ticket" workflow working end-to-end                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-04-02 | DoR / DoD                                                                               | Created Definition of Ready and Done; updated all 16 backlog stories                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-04-08 | FA-18, FA-19                                                                            | Manual category override; category rules service                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-04-08 | Phase 5 — Quality gates                                                                 | Husky + lint-staged + GitHub Actions CI + JUnit reporting; fixed Vite CVEs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-04-16 | Phase 0 — Cleanup                                                                       | Removed Jira, deleted 86 scripts, cleaned 14 abandoned worktrees                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-04-16 | Phase 1 — GitHub Issues                                                                 | Migrated 15 Jira stories to GitHub Issues via `create-github-issues.mjs` script                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-04-17 | Phase 2 — Repo refactor                                                                 | Restructured docs to tool-agnostic layer; added `.github/copilot-instructions.md`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-04-17 | spec-kit install                                                                        | Installed via uv; configured auto-commit hooks; first `/speckit-specify` run                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-04-18 | Constitution rewrite                                                                    | v1.0 → v2.2.0; full automation model; removed all approval gates; added 4 stop conditions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-04-19 | FA-53 pipeline                                                                          | First full spec-kit pipeline: specify → plan → tasks → issues → implement → merge                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-04-19 | FA-53 stories                                                                           | Persistent chat history, multi-account AI context, chatStorage tests — all merged                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-04-19 | CI quality gate fix                                                                     | QA agent now runs `gh pr checks --watch` before every merge                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-04-20 | Full backlog delivery                                                                   | All FA-36 through FA-66 stories delivered autonomously                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-04-20 | Designer agent                                                                          | Added Designer to pipeline; created design-system.md based on Monarch Money                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-04-20 | UX overhaul planning                                                                    | Prototype-driven gap analysis; 8 stories created for full UX redesign                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-04-23 | UX overhaul scoped                                                                      | Identified prototype as source of truth; planning full sidebar layout + flow redesign                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-04-23 | Dev Mentor Progress                                                                     | Added curriculum file to squad docs; wired Delivery Lead to auto-update Session Log                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-04-24 | #87–#95: UX/UI Overhaul                                                                 | Sidebar tab navigation, Recharts donut/bar charts, dark theme CSS tokens, localStorage lazy initializers — practised component decomposition and state lifting.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-04-24 | #97–#100: Manual Transfer Flagging                                                      | Inline flagging UI with candidate filtering; pure utility functions for flag/unflag logic; practised state machines and category restoration patterns.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-04-29 | #103: Add "Uncategorised" filter option                                                 | Added a controlled filter value to TransactionsPage dropdown; practised filter state management and writing isolated React component tests with afterEach cleanup for CI stability.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-04-29 | #104: Uncategorised filter logic                                                        | Wired the `__uncategorised__` sentinel into the filter pipeline with falsy-check branching; practised multi-condition filter composition and verifying AND logic across combined filters.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-04-29 | #111: --colour-savings CSS token                                                        | Added a single CSS custom property to `:root`; practised CSS design tokens and the principle of naming values by semantic role rather than colour value.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-04-29 | #115: Extract parseAccountName utility                                                  | Extracted a function from a large component into a co-located utility module; practised single-responsibility principle and writing unit tests for edge cases in a parser function.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-04-29 | #112: Rename Savings & Transfers                                                        | Renamed a category string across multiple files with load-time backward-compat normalisation; practised the pattern of migrating display labels without touching stored data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-04-29 | #116: Account number as primary key                                                     | Fixed account identity by flipping `nick ?? num` to `num ?? nick`; practised the "data key vs display label" distinction and the impact of a single-character change on business logic.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-04-29 | #117: Re-import stability invariant                                                     | Added a regression test and JSDoc invariant comment for a deterministic parser function; practised documenting non-obvious invariants so future changes can't silently break them.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-04-29 | #113: Savings green treatment (UI)                                                      | Applied a CSS modifier class to colour a specific category; practised the Designer → Developer → QA flow with manual testing, and the `color-mix` CSS function for tinted backgrounds.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-04-29 | #114: SCT regression test suite                                                         | Wrote integration tests for string rename and colour treatment; practised finding tests already covered by prior QA work and only filling actual gaps rather than duplicating coverage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-04-29 | #118: Account display label format                                                      | Changed display format from truncated `···last6` to full `Name (number)`; practised the difference between a storage key (`short`) and a display label (`display`) in a data model.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-04-29 | #119: ACN feature polish and sign-off                                                   | Ran full test suite and type-check as an explicit story; practised treating validation and documentation as first-class deliverables, not afterthoughts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-04-30 | #134: WeekBucket and WeeklyCategoryBucket types                                         | Created a pure TypeScript interface file with no runtime code; practised that `tsc --noEmit` is the correct test for type-only files, and that JSDoc comments on interface fields are the right way to document data model invariants.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-04-30 | #135: weeklyAggregation utility (isoWeekStart + formatWeekLabel)                        | Implemented two pure date-helper functions; practised ISO week Monday-calculation arithmetic and learned that `en-NZ` locale produces day-first format ("3 Feb") not month-first ("Feb 3") — locale format matters for chart labels.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-04-30 | #136: Unit tests for isoWeekStart and formatWeekLabel                                   | Added cross-month boundary test to complete the T003 spec; practised identifying when a test story is already partially done by prior QA work and only filling the genuine gap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-04-30 | #137: buildWeeklyTotals aggregation function                                            | Implemented Map-based weekly grouping with account filtering; discovered that ISO date strings parsed as UTC cause day-off bugs in negative-offset timezones — must append `T00:00:00` for local-time parsing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-04-30 | #138: Unit tests for buildWeeklyTotals                                                  | Added multi-month span boundary test; practised writing a test that crosses a calendar-month boundary to verify ISO-week grouping handles Jan/Feb rollover correctly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-04-30 | #149: Wire LargestTransactions into DashboardPage                                       | Replaced inline implementation with the dedicated component; practised mapping between two different data shapes (`PfaTxn` vs `Transaction`) at the boundary, and the principle that page components should orchestrate rather than implement display logic directly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-04-30 | #148: LargestTransactions.css filter chip styles                                        | Added a rounded pill style using design token variables; practised the convention of separating behaviour (TSX in #147) from visual presentation (CSS here) into distinct stories for clean, reviewable diffs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-04-30 | #147: LargestTransactions selectedCategory filter and chip                              | Added an optional prop with `= null` default to maintain backward-compat; practised the decision between making a new prop required vs optional, and why optional with a sensible default is the right choice when existing call-sites don't need to change.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-04-30 | #146: SpendByCategory tests for layout and selection behaviour                          | Tested DOM order using `compareDocumentPosition` and CSS opacity values via `element.style.opacity`; practised writing structural layout assertions without relying on CSS layout rendering (jsdom doesn't apply CSS rules, so DOM order is the right proxy for visual left-right position).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-04-30 | #145: SpendByCategory.tsx restructure for left-legend / right-donut                     | Removed Recharts built-in Legend and restructured JSX into flex columns; practised the pattern of moving framework-provided UI elements (Recharts Legend) to custom HTML for full styling control, and the difference between dimming via inline style opacity vs CSS class.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-04-30 | #144: SpendByCategory.css left-legend / right-donut layout                              | Added flexbox column classes (`flex: 1` legend, `flex: 0 0 220px` chart) as a preparatory CSS-only story before the TSX restructure; practised separating CSS changes from HTML structure changes into distinct, independently reviewable stories.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-04-30 | #143: Lift selectedCategory state to DashboardPage                                      | Added shared category-selection state with a reset-on-account-change helper; practised why calling setState directly in a useEffect is an ESLint anti-pattern and how to move state resets into event handlers to avoid cascading renders.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-04-30 | #142: Wire WeeklyTrendChart into DashboardPage                                          | Replaced an inline chart built directly inside a page component with a dedicated chart component; practised the principle of keeping page components as thin orchestrators and isolating chart logic in reusable components.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-04-30 | #157–#160: Feature 007 verification pass                                                | Ran TypeScript, ESLint, and CI test suite checks; confirmed 566 tests pass, 0 type errors, 0 lint warnings. Closed 4 verification issues without code changes — practised treating verification as explicit deliverables, not afterthoughts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-04-30 | #156: Wire SpendingTrendsByCategoryChart into DashboardPage                             | Added the chart card below the donut/transactions grid; practised the page-as-orchestrator pattern — DashboardPage computes data and passes it down, the component handles its own rendering.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-04-30 | #155: Component tests for SpendingTrendsByCategoryChart                                 | Discovered that `.recharts-line` and `.recharts-wrapper` selectors return null in jsdom — Recharts only injects those class names when a real browser layout engine runs; learned that only `.recharts-responsive-container` is safe to assert on in unit tests. Fixed 2 rounds of CI failures by progressively narrowing assertions to what jsdom actually renders.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-04-30 | #153/#154: SpendingTrendsByCategoryChart component and CSS                              | Built a multi-line chart from `WeeklyCategoryBucket[]` data; practised using `strokeOpacity` and `strokeWidth` to visually highlight a selected line without hiding others, and using Recharts `ReferenceLine` to draw a vertical week-marker on hover. Learned that a CSS import makes both stories inseparable — created them together in one PR.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-04-30 | #152: Unit tests for buildWeeklyCategoryTotals                                          | Added 10 tests; practised asserting that a key is `0` (not `undefined`) using `toBe(0)`, and verifying consistent object shape across multiple array entries by comparing sorted key arrays.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-04-30 | #151: buildWeeklyCategoryTotals aggregation function                                    | Extended the weekly aggregation module with a second function that groups spend by category per week; practised the pattern of tracking all seen categories in a Set and back-filling missing weeks with 0 to produce gap-free chart series.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-04-30 | #150: Tests for LargestTransactions filter chip and category filtering                  | Added 6 tests in a dedicated describe block; practised using `queryByText` (not `getByText`) to assert element absence, the `rerender` utility to simulate prop changes, and writing a focused test suite that verifies filtering, empty-state, and chip visibility as orthogonal concerns.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-04-30 | #139: WeeklyTrendChart component                                                        | Built a Recharts `ComposedChart` with bar + line overlay; computed a 4-week rolling average inside the component; practised the pattern of deriving a secondary data series from props rather than requiring the parent to pre-compute it, and using semantic CSS tokens instead of hardcoded colours.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-04-30 | #183: SpendByCategory CSS layout fix — donut centring, percentage visibility, font size | Practised diagnosing and fixing CSS flexbox layout bugs: used align-items:center to vertically align a two-column flex row, replaced a fixed width with display:flex + justify-content:center to centre a child within its flex column, and normalised font-size for visual consistency. Reinforced the CSS-only fix discipline — no JSX changes were needed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-04-30 | #181: Fix Spending by Category legend layout on DashboardPage                           | Discovered that the Dashboard's inline implementation of the Spending by Category card was not using the already-correct `SpendByCategory` component — practised identifying divergence between a standalone component and a page-level inline re-implementation. Added a `.dash-cat-body` flex-row wrapper to move the legend left and the donut right, matching spec 007 FR-004. Learned that `compareDocumentPosition` is the correct way to assert left-right DOM order in jsdom tests where CSS layout is not applied.                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-04-30 | #185: WeeklyTrendChart undefined CSS tokens fix                                         | Fixed a component written with non-existent design tokens (`--negative`, `--bg-elevated`, `--text-muted`, etc.) by mapping each to the actual project tokens in `src/index.css`; practised the habit of always cross-referencing token names against the single source of truth rather than guessing names, and learned that undefined CSS custom properties silently fall back to their initial value (transparent/black) rather than throwing an error. Added an inline legend using BEM CSS classes and `style` props for computed colours.                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-05-06 | #206–#225: Feature 009 — Express API server and Railway deployment                      | First time adding a server-side Node.js layer to the project. Learned why `src/server/` must be excluded from `tsconfig.app.json` — Express uses Node.js built-ins that the browser bundle can't import. Introduced a separate `tsconfig.server.json` with no DOM lib. Learned how Express error handlers work: must declare 4 parameters `(err, req, res, next)` even when `next` is unused (Express uses arity to detect error handlers), which triggered an ESLint `no-unused-vars` error — fixed by configuring `argsIgnorePattern: "^_"`. Practised the CORS fail-safe pattern: never silence CORS errors silently — log a warning when the env var is missing.                                                                                                                                                                                                                                                                    |
| 2026-05-06 | #189–#204: Feature 008 — PostgreSQL schema and Drizzle ORM                              | Introduced a server-side database layer for the first time: drizzle-orm + postgres.js for query building and connection, drizzle-kit for migration generation. Defined 7 tables with UUID PKs and FK constraints. Learned why `src/db/` must be kept server-side only — postgres.js uses Node.js net/tls built-ins that Vite cannot bundle for the browser. Practised the Drizzle migration workflow: schema change → `db:generate` produces SQL → `db:migrate` applies it — and learned the difference between the two migration files (0000 for initial schema, 0001 for additive index change).                                                                                                                                                                                                                                                                                                                                      |
| 2026-05-07 | #226–#254: Feature 010 — Email and password authentication                              | First full auth implementation: bcrypt (cost 12) for password hashing, JWT (15-min access token, HS256) for sessions, Resend for transactional email. Learned why SHA-256 hashing token values before storing protects against database-read attacks — the raw token is only ever in-flight in the email link, never at rest. Migrated App.tsx from a useState tab-switcher to React Router `<Routes>` as a prerequisite for public/protected route splitting. Learned that `ProtectedRoute` is a simple HOC that checks context and returns `<Navigate>` — no library needed. Practised the privacy pattern for password reset: always return 200 and the same message, never reveal whether an email is registered. Added `requireAuth.ts` Express middleware using Bearer token verification for future server-side protected routes. Introduced `AuthProvider` wrapping the entire app with sessionStorage-based token persistence. |
| 2026-05-09 | #287: T003 [FA-MIGR-001] Create src/server/routes/accounts.ts with 4 CRUD endpoints     | Built a full CRUD REST router using Express Router, Drizzle ORM, and Zod; practised the pattern of scoping every query to the authenticated user with `eq(accounts.userId, userId)` so users can never read or modify each other's data. Learned that `req.params` values are typed as `string                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | string[]`in Express + TypeScript — use`req.params["id"] as string`to narrow to a plain string for use in Drizzle`eq()`. Practised using Zod `.refine()`to enforce a cross-field constraint: at least one of`nickname`or`accountType`must be present on PATCH. Understood that DELETE returning 204 (No Content) means no response body —`res.status(204).send()`not`res.json()`. |
| 2026-05-09 | #288: T004 [FA-MIGR-001] Register accountsRouter in src/server/index.ts                 | Learned that named exports (`export const accountsRouter`) require a named import (`import { accountsRouter }`) — a default import fails with "Module has no default export". Practised the standard Express router-registration pattern: `app.use("/api/accounts", accountsRouter)` so the router's internal paths (`/` and `/:id`) resolve to `/api/accounts` and `/api/accounts/:id`. Understood why the 404 fallback must come after all router registrations — Express processes middleware in registration order.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-05-09 | #289: T005 [FA-MIGR-001] Migrate AccountContext to API                                  | Replaced a synchronous localStorage-based React context with an async API-driven one; learned why a context that calls a custom hook (`useApi()`) cannot be tested without mocking that hook — `vi.mock("../lib/api", ...)` intercepts the import at the module level. Practised the pattern of keeping `useActiveMonths` and `useActiveTransactions` pointing at localStorage while migrating only the account CRUD layer, so the migration is incremental rather than all-at-once. Learned that colours are a client-side concern — the server stores only data, the client derives display properties like colours from index at render time.                                                                                                                                                                                                                                                                                        |
| 2026-05-09 | #286: T002 [FA-MIGR-001] Create src/types/api.ts                                        | Practised defining a shared contract layer between server and client in a single TypeScript file; learned that API response types belong in `src/types/` (shared layer) rather than `src/server/` (server-only) or a page file (too specific) so both server routes and client-side hooks can import them without circular dependencies.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-05-09 | #285: T001 [FA-MIGR-001] Install zod as runtime dependency                              | Learned the distinction between `dependencies` (runs in production/server) vs `devDependencies` (build tools only) — zod must be in `dependencies` because the Express server uses it at runtime to validate request bodies. Running `npm install` vs `npm install --save-dev` is the difference between a production deploy succeeding or failing with a missing module error.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-05-09 | #269: T011 [FA-AUTH-002] Verify TypeScript compilation with npm run build               | Ran `npm run build` (tsc -b + vite build) after 9 FA-AUTH-002 stories; confirmed 0 TypeScript errors and clean dist/ output. Reinforced the habit of running the full build (not just `tsc --noEmit`) as the final verification gate before marking a feature complete.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-05-09 | #266: T008 [FA-AUTH-002] Create useApi() fetch hook in src/lib/api.ts                   | Built a custom React hook that wraps the native fetch API; learned the pattern of merging caller-provided headers with auto-injected headers using `new Headers(init?.headers)` to avoid overwriting caller intent. Practised `useCallback` with a proper dependency array to keep the function reference stable across renders. Understood why `response.clone()` is required before parsing — a Response body can only be consumed once.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-05-09 | #265: T007 [FA-AUTH-002] Create authenticateToken Express middleware                    | Learned the difference between the two existing JWT middlewares (requireAuth on req.userId vs authenticateToken on res.locals.user) and why both exist during a migration period. Understood granular JWT error codes: TOKEN_EXPIRED lets the client prompt the user to re-login; TOKEN_INVALID is for tampered/malformed tokens. Practised catching specific error subclasses (TokenExpiredError, JsonWebTokenError from jsonwebtoken) instead of a blanket catch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-05-09 | #264: T006 [FA-AUTH-002] Add sign-out button to Sidebar                                 | First time consuming AuthContext outside a page component; learned that any component inside AuthProvider can call useAuth() — not just page-level components. Practised co-locating logout + navigate in a single click handler so the UI immediately reflects the cleared session state.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-05-09 | #263: T005 [FA-AUTH-002] Wrap auth routes with PublicOnlyRoute in App.tsx               | Wired the PublicOnlyRoute guard into App.tsx; learned to distinguish between routes that should always redirect authenticated users (/login, /signup) vs. routes that should remain accessible regardless (/verify-email, /verify-email-sent — needed for email link flows). Practised wrapping JSX children in a guard component inline inside a `<Route element>` prop.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-05-09 | #262: T004 [FA-AUTH-002] Create PublicOnlyRoute component                               | Created a route guard component that is the logical inverse of ProtectedRoute; learned the "invert the check" pattern and practised keeping route guards as simple HOCs with a single responsibility — either redirect or render children.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-05-09 | #261: T003 [FA-AUTH-002] Update App.test.tsx to seed fa-auth-user                       | Learned that when a context's state shape grows (adding `user` alongside `token`), existing test fixtures must also be updated to seed the new storage key — otherwise the context initialises with null and tests may fail for unrelated reasons. Practised using `replace_all` in Edit tool to apply a uniform change to multiple identical beforeEach patterns simultaneously.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-05-09 | #260: T002 [FA-AUTH-002] Expand AuthContext with AuthUser, login(), logout()            | Refactored a React context from a simple token store to a richer session model; learned that breaking context API changes must be applied atomically with all consumer updates to keep the codebase compilable. Practised the sessionStorage dual-key pattern (token + user JSON) and the lazy initialiser overload of useState for reading storage once at mount.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-05-09 | #259: T001 [FA-AUTH-002] Update login route to return user profile                      | Extended an existing API response shape by adding a nested object field; practised the discipline of returning only the fields the client needs (id, email, displayName) rather than the full DB row — minimising data exposure and future breaking-change surface.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-05-09 | #279: T010 [FA-INFRA-001] FA-AUTH-002 coordination comment on #266                      | Posted a coordination comment on a GitHub issue to inform a future implementer about an existing shared module; practised the principle that cross-team knowledge sharing should be explicit and documented — never assume another implementer will discover a utility by accident. Learned that an admin deliverable (comment, not code) still warrants a CHANGELOG entry and a tracked PR so it is auditable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-05-09 | #278: T009 [FA-INFRA-001] npm run build verification                                    | Ran `npm run build` (tsc -b + vite build) to confirm all T001–T008 changes integrate cleanly; learned that `tsc -b` is the stricter build-mode check (vs `tsc --noEmit`) and that a Vite chunk-size warning is informational — not a type error — and does not block deployment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-05-09 | #277: T008 [FA-INFRA-001] Update .env.example to add VITE_API_URL entry                 | Added documentation-only env var entry; practised the developer-experience principle that every required env var must be discoverable without reading source code — `.env.example` is the contract between the repo and new contributors.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-05-09 | #276: T007 [FA-INFRA-001] Update VerifyEmailPage.tsx — prefix both fetch URLs           | Updated a component with two fetch calls and two distinct render branches; practised the pattern of writing separate describe blocks for each branch (token-verification vs sent-confirmation) and verifying that both API endpoints are correctly prefixed via separate URL assertions.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-05-09 | #275: T006 [FA-INFRA-001] Update ResetPasswordPage.tsx fetch URL to use API_BASE        | Applied API_BASE to the reset-password endpoint; practised testing a component that uses `setTimeout` for delayed navigation by using `vi.useFakeTimers` + `vi.advanceTimersByTime` to control timing precisely, and calling `vi.runAllTimers()` in `afterEach` to prevent timer bleed between tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-05-09 | #274: T005 [FA-INFRA-001] Update ForgotPasswordPage.tsx fetch URL to use API_BASE       | Applied API_BASE to the forgot-password endpoint; noted that this page deliberately does not check the HTTP response (privacy pattern — always show the same success state), so the test suite validates URL construction and success state but not a 4xx/5xx branch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-05-09 | #273: T004 [FA-INFRA-001] Update SignUpPage.tsx fetch URL to use API_BASE               | Applied the same API_BASE pattern to the registration endpoint; reinforced the discipline of updating every hardcoded URL in the codebase one file at a time so each change is independently reviewable and testable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-05-09 | #272: T003 [FA-INFRA-001] Update LoginPage.tsx fetch URL to use API_BASE                | Updated a hardcoded relative fetch URL to use the `API_BASE` constant from `src/lib/api.ts`; practised the pattern of centralising environment-aware URL construction in a single module so all API calls resolve correctly in both local dev (empty string → relative URL) and production (full Railway URL).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-05-09 | #270: T001 [FA-INFRA-001] Create vercel.json with SPA catch-all rewrite rule            | Added vercel.json at the repo root with a `rewrites` rule so Vercel serves `index.html` for all non-static routes; practised the difference between Vercel's static CDN serving (file-first) and SPA routing (client-side), and why `rewrites` (not the legacy `routes` key) is the correct approach.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

---

## Dev Mentor System Prompt

To continue your learning on any account, paste this system prompt into a new Claude Project:

```
You are a senior software engineer and patient mentor named "Dev Mentor". Your job is to teach me modern software development practices step by step, using a hands-on, exercise-driven approach.

## Your Teaching Style
- Always assess what I already know before explaining a topic
- Break complex concepts into small, digestible steps
- Give me practical exercises after each concept — not just theory
- When I make mistakes, guide me to the answer rather than just giving it
- Use analogies to explain abstract concepts
- Celebrate progress and keep the tone encouraging but professional
- If I seem stuck, offer hints in increasing levels of detail

## Curriculum Scope
Cover these topics in a logical progression. Track where we are and remind me of my progress:

1. Git & Version Control
2. VS Code Mastery
3. Claude Code & Agentic Development
4. Code Quality Gates
5. Testing Strategy
6. CI/CD with GitHub Actions
7. Spec-Driven Development (spec-kit)
8. Project Constitution & Documentation Architecture
9. Full Automation Model
10. Designer Agent & Design System
11. Modern Development Workflow (putting it all together)

## Session Management
- At the start of each session, ask me what I want to focus on or remind me where we left off
- Offer a quick recap of the last topic before moving forward
- Track exercises I've completed and refer back to them
- Suggest what to tackle next based on my progress

## My Stack
- Language: TypeScript
- Framework: React + Vite
- OS: Windows 11
- Project: Finance Analyser (araujobernardo/finance-analyser)
- AI Tooling: Claude Code + spec-kit
- Backlog: GitHub Issues
```

> 💡 **Tip:** Start your first message with: _"I'm continuing from my progress file. Here's where I left off: [paste the Session Log and What's Next sections]"_
