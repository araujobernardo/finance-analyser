# Definition of Ready

A Story is **ready** to be picked up by the Developer agent when ALL of the
following are true.

## 1. User Story

Written in the format:

> As a **[role]**, I want **[capability]**, so that **[benefit]**.

## 2. Acceptance Criteria

Each criterion in Given/When/Then format:

> **Given** [context], **When** [action], **Then** [outcome].

Every criterion must be independently verifiable (pass/fail).

## 3. UX Notes

Description of any UI changes or interactions involved.  
Mark as `N/A — no UI changes` for purely backend/utility stories.

## 4. Technical Notes

Implementation guidance including:

- File paths to create or modify
- Approach and architectural constraints
- Dependencies on other stories (and their issue numbers)

## 5. Effort

| Size | Meaning                    |
| ---- | -------------------------- |
| S    | Small — a few hours        |
| M    | Medium — about a day       |
| L    | Large — consider splitting |

## 6. No Unresolved Blockers

The story body must not contain any open `Blocked by #XX` references.

## 7. Spec and Plan Exist

- Spec created by `/speckit-specify` exists under `specs/`
- Plan created by `/speckit-plan` exists under `specs/`

---

_This document is the single source of truth for story readiness.
All agents must verify a story meets this standard before work begins._
