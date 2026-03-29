# Feature Lifecycle Workflow

This document describes the end-to-end process for delivering a Story,
from the moment it is approved to the moment it is merged.

## The Full Lifecycle

```
User approves Story
       ↓
Developer Agent creates feature branch
       ↓
Developer Agent implements the Story
       ↓
Developer Agent opens Pull Request
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

## Handoff Points (where agents stop and wait)

| Agent         | Stops after                     | Waits for                  |
| ------------- | ------------------------------- | -------------------------- |
| Product Owner | Presenting Epic/Story breakdown | User approval              |
| Product Owner | Creating Jira tickets           | User to assign first story |
| Developer     | Opening PR                      | User to notify QA          |
| QA            | Submitting review report        | User merge decision        |

## Rules

- No agent proceeds past a handoff point without explicit user approval
- "Explicit approval" means the user types yes or a clear confirmation
- Agents must not interpret silence or ambiguity as approval
- If a Story is blocked, the agent flags it and waits — never works around it
