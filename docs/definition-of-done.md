# Definition of Done

A Story is **done** when ALL of the following are true.

## Acceptance Criteria

- All acceptance criteria in the issue are met.

## CI Checks

- All CI checks are green (`gh pr checks --watch` exits 0).
- No new ESLint errors introduced.
- `tsc --noEmit` passes with no new TypeScript errors.

## Testing

- Every new function has at least one automated test.
- All existing tests still pass (no regressions).

## Pull Request

- PR description includes a constitution check section.
- PR is squash merged and the feature branch is deleted.

## Issue

- Issue closed with a comment: "Merged in PR #X. Story complete."

## Changelog

- One line appended to `CHANGELOG.md` in the format:
  `- **YYYY-MM-DD** | #<issue> | <story title> | <one sentence summary>`

---

_This document is the single source of truth for story completion.
All agents must verify work meets this standard before closing a story._
