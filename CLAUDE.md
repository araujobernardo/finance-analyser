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

## Workflow

See `.claude/workflows/feature-lifecycle.md` for the full process.
