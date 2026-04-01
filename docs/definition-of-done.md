# Definition of Done

A Story is **done** when ALL of the following are true.

## Code Quality
- All acceptance criteria are met and verifiable
- No TypeScript `any` types introduced
- No `console.log` statements left in source code
- Components under 150 lines — split if exceeded
- Code follows existing patterns in the codebase

## Testing
- Automated tests written for all new utility functions
- Automated tests written for all new React components
- All existing tests still passing (no regressions)
- Edge cases and error paths tested
- For UI stories: manual tests completed and results documented

## Review
- PR opened with title including Jira ticket key (e.g. FA-16)
- PR description includes what was built and how to test manually
- QA agent review completed and posted to Jira ticket
- No open bugs linked to the story

## Jira
- Ticket moved to Done
- Final comment added confirming merge

---
*This document is the single source of truth for story completion. 
All agents must verify work meets this standard before recommending 
approval.*
