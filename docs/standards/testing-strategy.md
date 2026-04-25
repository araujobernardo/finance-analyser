# Testing Strategy

## Framework

Vitest — run with `npx vitest run`.

## File Conventions

Test files live co-located with the source file they test:

```
src/
├── utils/
│   ├── csvParser.ts
│   └── csvParser.test.ts
├── components/
│   ├── UploadButton.tsx
│   └── UploadButton.test.tsx
```

## What to Test

**Utility functions** (`src/utils/`)

- All new utility functions must have automated tests.
- Test the happy path and at least two edge cases per function.

**React components** (`src/components/`, `src/pages/`)

- Write component tests using Vitest for all new components.
- Test happy path and error/empty states.

**Coverage requirement**

- All existing tests must pass before a PR is approved (no regressions).

## QA Review Checklist (per PR)

**Functional correctness**

- Does the code satisfy all Story acceptance criteria?
- Does it handle the happy path correctly?
- Does it handle edge cases and errors gracefully?

**Code quality**

- TypeScript types properly defined?
- Components under 150 lines?
- No obviously duplicated logic?
- No `console.log` statements left in?

## Manual Testing (UI stories)

For every PR with UI changes or file handling logic, the QA agent must:

1. Define a numbered manual test script covering:
   - The happy path
   - At least one error path
   - Any user interaction specific to the story
2. Present the script to the user and wait for them to confirm results.
3. Include manual test results in the PR review comment under a
   "Manual Testing" section with Pass/Fail for each step.

For purely utility/logic stories with no UI, manual testing is not required.

## PR Review Comment Format

```
## QA Review — [Story Title]

**Story:** [Story title]
**PR:** [PR number]

**Acceptance Criteria Check**
- [ ] Criteria 1 — Pass / Fail — notes

**Manual Testing**
- Step 1 — Pass / Fail

**Tests Written**
- List each test file and what it covers

**Issues Found**
- List any bugs, missing edge cases, or quality issues

**Recommendation**
✅ APPROVED  |  ❌ CHANGES REQUESTED — reason
```

QA merges autonomously once all checks pass (DoD, CI green, security scan clean, no open linked bugs). See `constitution.md` and `.claude/agents/qa.md` for the full merge protocol.
