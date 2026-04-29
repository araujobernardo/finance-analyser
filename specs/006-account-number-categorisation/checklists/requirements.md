# Specification Quality Checklist: Account Number-Based Categorisation

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-04-24
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Implementation Status

- [x] T001: Branch confirmed
- [x] T002: `parseAccountName` extracted to `src/utils/accountParser.ts`
- [x] T003: Unit test — two payloads with same name, different numbers → two distinct `short` values
- [x] T004: Unit test — CSV with number + name → `short` equals the account number
- [x] T005: Unit test — CSV with name only → `short` equals the name
- [x] T006: `short` priority flipped to `num ?? nick ?? ...` in `src/utils/accountParser.ts`
- [x] T007: Unit test — same account number imported twice → identical `short` (no duplicate account)
- [x] T008: Verified T006 satisfies US2; invariant comment added
- [x] T009: Unit test — CSV with number + name → `display` equals `"Name (number)"` format
- [x] T010: Unit test — CSV with name only → `display` equals the name alone
- [x] T011: Unit test — CSV with no metadata → `display` equals `"Main Account"`
- [x] T012: `baseDisplay` format updated to `"Name (number)"` in `src/utils/accountParser.ts`
- [x] T013: Full Vitest suite — 502 tests passed, 33 test files, zero failures (2026-04-29)
- [x] T014: TypeScript type-check (`npx tsc --noEmit`) — zero errors (2026-04-29)
- [x] T015: This checklist updated — implementation complete

## Notes

- All specification items pass. Spec was ready for `/speckit-plan`.
- **Implementation complete as of 2026-04-29.** All three user stories are delivered:
  - US1: Two accounts with the same name but different numbers are stored as distinct keys.
  - US2: Re-importing the same account number appends to the correct account.
  - US3: Account labels display as `"Name (number)"` when an account number is present.
- Source changes confined to `src/utils/accountParser.ts` (extracted + fixed) and `src/App.tsx` (updated import).
- All 502 tests pass; TypeScript compiles without errors.
