# Coding Standards

## TypeScript

- Strict mode is enabled — no `any` types, ever.
- All props must have explicit type definitions.
- Shared types live in `src/types/`.

## React

- Functional components only — no class components.
- Extract reusable state/effect logic into custom hooks in `src/hooks/`.
- Keep components small — split any component that exceeds 150 lines.
- All user-facing text in English.

## General

- No `console.log` statements left in source code.
- Follow existing patterns in the codebase before introducing new abstractions.
- Three similar lines is preferable to a premature abstraction.
- No error handling for scenarios that cannot happen — trust framework guarantees.
- Comments only when the WHY is non-obvious (hidden constraint, tricky invariant,
  workaround for a specific bug). Never describe WHAT the code does.
