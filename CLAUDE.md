# Finance Analyser — Claude Code Instructions

## Project

Personal finance analysis tool — TypeScript + React + Vite.
See [docs/requirements.md](docs/requirements.md) for full requirements.

## Documentation

| Document                                                                 | Purpose                                        |
| ------------------------------------------------------------------------ | ---------------------------------------------- |
| [constitution.md](constitution.md)                                       | Governance, approval gates, agent coordination |
| [docs/architecture.md](docs/architecture.md)                             | Tech stack and file layout                     |
| [docs/standards/coding-standards.md](docs/standards/coding-standards.md) | TypeScript and React rules                     |
| [docs/standards/git-workflow.md](docs/standards/git-workflow.md)         | Branch naming, commits, PRs                    |
| [docs/standards/testing-strategy.md](docs/standards/testing-strategy.md) | Test coverage and QA process                   |
| [docs/definition-of-ready.md](docs/definition-of-ready.md)               | Story readiness checklist                      |
| [docs/definition-of-done.md](docs/definition-of-done.md)                 | Story completion checklist                     |
| [docs/dev-mentor-progress.md](docs/dev-mentor-progress.md)               | Learning curriculum and session log            |

## Agent Squad

| Agent         | Definition                                                         |
| ------------- | ------------------------------------------------------------------ |
| Delivery Lead | [.claude/agents/delivery-lead.md](.claude/agents/delivery-lead.md) |
| Designer      | [.claude/agents/designer.md](.claude/agents/designer.md)           |
| Developer     | [.claude/agents/developer.md](.claude/agents/developer.md)         |
| QA            | [.claude/agents/qa.md](.claude/agents/qa.md)                       |

> Speckit commands (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-taskstoissues`) are run by the **user** to populate the backlog. There is no Product Owner agent.

All governance rules (golden rules, approval gates, auto-approved actions)
are in [constitution.md](constitution.md).

<!-- SPECKIT START -->

For project principles, governance, and agent workflow see: constitution.md

**Active feature plan**: [specs/033-bank-connection-ui/plan.md](specs/033-bank-connection-ui/plan.md)

<!-- SPECKIT END -->
