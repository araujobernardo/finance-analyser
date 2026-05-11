# Testing Strategy

## Frameworks

- **Unit / component tests**: Vitest — `npm test`
- **End-to-end tests**: Playwright — `npm run e2e`

---

## Unit & Component Tests (Vitest)

### File Conventions

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

### What to Test

**Utility functions** (`src/utils/`)

- All new utility functions must have automated tests.
- Test the happy path and at least two edge cases per function.

**React components** (`src/components/`, `src/pages/`)

- Write component tests using Vitest for all new components.
- Test happy path and error/empty states.

**Coverage requirement**

- All existing tests must pass before a PR is approved (no regressions).

---

## E2E Tests (Playwright)

E2E tests live in `e2e/` at the project root. Each file maps to one user flow:

```
e2e/
├── auth.spec.ts          # Sign-in and session management
├── accounts.spec.ts      # Account CRUD flows
└── csv-import.spec.ts    # CSV upload flows
```

### Decision tree — unit test vs E2E vs manual

| Scenario                                                 | Test type        |
| -------------------------------------------------------- | ---------------- |
| Pure function or service logic                           | Unit (Vitest)    |
| Isolated component rendering                             | Unit (Vitest)    |
| Multi-step browser flow (login, navigate, interact)      | E2E (Playwright) |
| API-driven data display (accounts visible, error states) | E2E (Playwright) |
| Visual design quality, pixel-perfect layout              | Manual only      |
| File upload with local OS picker                         | Manual only      |

Write an E2E test when **all** of these are true:

1. The scenario involves browser navigation or a multi-step user interaction
2. The assertion is verifiable by DOM state (visible element, URL, text content)
3. The scenario is deterministic with the test user's existing production data

### E2E automation evaluation (QA responsibility)

For **every PR**, QA must evaluate each manual test step and ask:
_"Can this be verified by a Playwright assertion?"_

If yes: write the test in `e2e/<feature-slug>.spec.ts` and include it in the PR.
If no: document why in the PR review comment ("requires file picker", "visual only", etc.).

### Selector policy

Use selectors in this priority order:

1. `data-testid="<name>"` — most stable, add to the component in the same PR
2. Semantic roles: `getByRole("button", { name: /submit/i })`
3. Labels: `getByLabel(/email/i)`
4. CSS class names from our own design system (e.g. `.sidebar-accounts`) — only when `data-testid` is impractical
5. Never use positional selectors (`nth-child`) or third-party library class names

**`data-testid` policy**: All new interactive or key display elements introduced in a story must have a `data-testid` attribute. This is a Definition of Done requirement for UI stories.

### Running E2E tests locally

```bash
npm run e2e                    # headless against dev server (needs .env with credentials)
npm run e2e -- --headed        # with browser visible
npm run e2e -- --debug         # step through with Playwright Inspector
npx playwright show-report     # open HTML report from last run
```

CI runs E2E tests against the live production Vercel deployment (`https://finance-analyser-seven.vercel.app`) after the `quality` job passes. See `specs/018-playwright-e2e/quickstart.md`.

### Writing a new E2E test

1. Create `e2e/<feature-slug>.spec.ts`
2. Use `process.env.E2E_EMAIL` and `process.env.E2E_PASSWORD` for any sign-in step — never hardcode credentials
3. Add `data-testid` attributes to the components under test in the same PR
4. Commit the spec file to the PR branch — CI will run it on the next push
5. Document the new test in the PR review comment under "E2E Tests Written"

---

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
- New interactive/display elements have `data-testid` attributes?

---

## Manual Testing (UI stories)

For every PR with UI changes or file handling logic, the QA agent must:

1. Define a numbered manual test script covering:
   - The happy path
   - At least one error path
   - Any user interaction specific to the story
2. For each step, evaluate whether it can be automated with Playwright (see decision tree above).
3. Automate everything that can be automated; flag the rest as manual-only with a reason.
4. Present the remaining manual steps to the user and wait for them to confirm results.
5. Include results in the PR review comment under "Manual Testing" (Pass/Fail per step).

For purely utility/logic stories with no UI, manual testing is not required.

---

## PR Review Comment Format

```
## QA Review — [Story Title]

**Story:** [Story title]
**PR:** [PR number]

**Acceptance Criteria Check**
- [ ] Criteria 1 — Pass / Fail — notes

**Unit Tests Written**
- List each test file and what it covers

**E2E Tests Written**
- e2e/<file>.spec.ts — what flow it covers
- (or: "No E2E tests — reason: <visual only / file picker / no deterministic DOM state>")

**Manual Testing** (steps not automatable)
- Step 1 — Pass / Fail — reason not automated

**Issues Found**
- List any bugs, missing edge cases, or quality issues

**Recommendation**
✅ APPROVED  |  ❌ CHANGES REQUESTED — reason
```

QA merges autonomously once all checks pass (DoD, CI green, security scan clean, no open linked bugs). See `constitution.md` and `.claude/agents/qa.md` for the full merge protocol.
