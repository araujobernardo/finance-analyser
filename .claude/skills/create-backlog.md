# Skill: create-backlog

**Who calls this:** Product Owner agent
**When to call:** Any time the user asks to create or extend the backlog
from a requirements document or feature description.
This skill can be called multiple times (e.g. once per Epic or feature area).

---

## Steps

### 1 — Read the inputs

- Read `docs/requirements.md` (or the document the user points you to)
- Read any existing Jira Epics and Stories to avoid duplication
  (GET /rest/api/3/search/jql with project=FA)

### 2 — Propose the breakdown (DO NOT create anything yet)

Present the full Epic + Story breakdown to the user in this format:

```
## Epic: <title>
<one-sentence description>

### Story: <title>  [N pts]
As a <user>, I want to <action> so that <benefit>.

Acceptance Criteria:
- [ ] ...

Technical Notes: ...
Dependencies: <Story titles that must be Done first, or "none">
```

Rules for the breakdown:

- Every Story must satisfy the Definition of Ready (`docs/definition-of-ready.md`)
- Stories must be small — each completable in one coding session
- Dependencies must be listed explicitly; they will become Jira "is blocked by" links
- Story Points go in Jira `customfield_10016` — never written as plain text in the description
- If requirements are ambiguous, list assumptions and ask the user to confirm before presenting

### 3 — Wait for user approval

Do not proceed until the user explicitly approves the breakdown.
Incorporate any changes the user requests and re-present if needed.

### 4 — Create Jira tickets

Only after explicit approval:

1. Create the **Epic** via POST `/rest/api/3/issue`

   ```json
   { "fields": { "project": { "key": "FA" }, "issuetype": { "name": "Epic" },
     "summary": "<title>", "description": <ADF> } }
   ```

2. Create each **Story** linked to its Epic

   ```json
   { "fields": { "project": { "key": "FA" }, "issuetype": { "name": "Story" },
     "summary": "<title>", "description": <ADF>,
     "customfield_10016": <points>,
     "parent": { "key": "<EPIC-KEY>" } } }
   ```

3. Set **dependency links** for each Story that has a predecessor:
   POST `/rest/api/3/issue/{key}/remotelink` is not right —
   use the issue link API instead:
   POST `/rest/api/3/issueLink`

   ```json
   {
     "type": { "name": "Blocks" },
     "inwardIssue": { "key": "<BLOCKER-KEY>" },
     "outwardIssue": { "key": "<BLOCKED-KEY>" }
   }
   ```

   This means BLOCKER "blocks" BLOCKED, i.e. BLOCKED "is blocked by" BLOCKER.

4. Set Story Points on each Story:
   PUT `/rest/api/3/issue/{key}`
   ```json
   { "fields": { "customfield_10016": <number> } }
   ```

### 5 — Report back

After all tickets are created, report:

- Epic key and title
- Each Story key, title, and points
- Dependency links created
- Any issues encountered
