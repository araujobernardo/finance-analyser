# Definition of Ready

A Story or Epic is **ready** to be picked up by the Developer 
agent when ALL of the following are true.

## 1. Description
A concise summary of the functionality being implemented. 
Must answer:
- What is being built?
- Why does it matter to the user?
- What problem does it solve?

## 2. Acceptance Criteria
A numbered list of specific, testable outcomes. Each criterion 
must be:
- Independently verifiable (pass/fail)
- Written from the user's perspective
- Free of implementation detail

## 3. User Experience
For stories with UI changes:
- Description of the expected user interaction flow
- Any specific visual requirements (colours, layout, behaviour)
- Accessibility requirements (keyboard navigation, screen readers)

For purely backend/utility stories, mark this section "N/A".

## 4. Technical Notes
Implementation guidance including:
- Which files or modules should be created or modified
- Architectural constraints or patterns to follow
- Dependencies on other stories or external services
- Any known edge cases the developer should handle

## 5. Story Points
Effort estimate relative to other stories:

| Points | Meaning |
|---|---|
| 1 | Trivial — under an hour |
| 2 | Small — half a day |
| 3 | Medium — one full day |
| 5 | Large — two to three days |
| 8 | Very large — consider splitting |

---
*This document is the single source of truth for story readiness. 
All agents must verify a story meets this standard before work begins.*
