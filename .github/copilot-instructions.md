# GitHub Copilot Instructions — Finance Analyser

This file provides project context for GitHub Copilot and other AI coding tools.

## Project

Personal finance analysis tool — TypeScript + React + Vite, running entirely
in the browser with no backend. Single user, localStorage persistence.

## Key Documentation

| Document                                                                    | Read when                                    |
| --------------------------------------------------------------------------- | -------------------------------------------- |
| [constitution.md](../constitution.md)                                       | Understanding governance and approval rules  |
| [docs/architecture.md](../docs/architecture.md)                             | Understanding the tech stack and file layout |
| [docs/standards/coding-standards.md](../docs/standards/coding-standards.md) | Writing TypeScript and React code            |
| [docs/standards/git-workflow.md](../docs/standards/git-workflow.md)         | Naming branches and writing commits          |
| [docs/standards/testing-strategy.md](../docs/standards/testing-strategy.md) | Writing and organising tests                 |
| [docs/requirements.md](../docs/requirements.md)                             | Understanding what the product does          |

## Quick Rules

- TypeScript strict mode — no `any` types.
- Functional React components only.
- Components over 150 lines must be split.
- Tests co-located with source files (`foo.test.ts` next to `foo.ts`).
- Never push directly to `main` — all changes via PR.
- Branch pattern: `feat/FA-XX-short-description` or `fix/FA-XX-short-description`.
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`).
