# Git Workflow

## Branch Naming

Pattern: `type/TICKET-KEY-short-description-in-kebab-case`

Examples:

- `feat/FA-13-csv-upload-component`
- `feat/FA-14-parse-validate-csv`
- `fix/FA-16-duplicate-upload-detection`

The Jira ticket key immediately after the type prefix is required for the
GitHub-Jira integration to link branches to tickets.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add CSV file upload component`
- `fix: handle duplicate month detection`
- `chore: add Prettier config`
- `test: add unit tests for CSV parser`

## Branch Hygiene

- **Always branch from `main`** — never from another feature branch unless
  the user explicitly instructs a stack.
- Run `git fetch origin main` before creating a new branch.
- **Before every `git commit`**, run `git branch --show-current` and confirm
  the output matches your feature branch. If it shows `main`, stop immediately.
- **Never use stash to switch contexts** — if you find yourself on the wrong
  branch with uncommitted changes, stop and ask the user.

## Worktrees (required for parallel agents)

Every Developer agent must use a git worktree for its story. This is the only
way to guarantee that parallel agents never overwrite each other's files.

1. Use `EnterWorktree` — it creates an isolated working directory
   (e.g. `../finance-analyser-FA-46/`).
2. Do all file reads and writes inside that worktree.
3. When the PR is opened, call `ExitWorktree` to clean up.

If `EnterWorktree` is unavailable, create the worktree manually:

```
git worktree add ../finance-analyser-FA-46 -b feat/FA-46-short-description
```

Never skip the worktree step when other stories are In Progress.

## Pull Requests

- Open a PR after every story — never push directly to `main`.
- PR title must include the Jira ticket key (e.g. `FA-16`).
- PR description must explain what was built and how to test it manually.
- Never merge your own PR — that decision belongs to the user.
- To call gh CLI, always use the full path:
  `"C:/Program Files/GitHub CLI/gh.exe"`
