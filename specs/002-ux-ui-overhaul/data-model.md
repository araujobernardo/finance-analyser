# Data Model: UX/UI Overhaul — Monarch Money Quality

**Branch**: `002-ux-ui-overhaul` | **Date**: 2026-04-21

---

## Summary

This feature introduces **no new data entities**. The overhaul is purely visual — CSS, layout, and component markup. Existing entities (Account, Transaction, CategoryRule, Budget) are unchanged in structure, storage key names, and serialisation format.

Per the constitution Golden Rule 3: _"Never modify localStorage schema without flagging it to the user."_ This plan explicitly makes zero localStorage schema changes.

---

## Existing Entities (unchanged)

### Account

Stored in localStorage. Fields: `id`, `name`, `colour`, `createdAt`. No changes.

### Transaction

Stored in localStorage per account/month. Fields: `date`, `description`, `amount`, `category`, `categoryOverride`. No changes.

### CategoryRule

Stored in localStorage. Maps description patterns to category names. No changes.

### Budget

Stored in localStorage. Maps category names to monthly budget amounts. No changes.

---

## New Design Artefact: CSS Token System

The only "model" addition is the CSS custom property namespace. This is not a data entity but documents the token surface for implementors.

| Token Group                                                   | Count  | File                    |
| ------------------------------------------------------------- | ------ | ----------------------- |
| Backgrounds (`--bg-*`)                                        | 5      | `src/styles/tokens.css` |
| Text (`--text-*`)                                             | 4      | `src/styles/tokens.css` |
| Accent (`--accent*`)                                          | 4      | `src/styles/tokens.css` |
| Semantic finance (`--positive*`, `--negative*`, `--warning*`) | 6      | `src/styles/tokens.css` |
| Borders (`--border-*`)                                        | 3      | `src/styles/tokens.css` |
| States (`--focus-ring`, `--disabled-*`)                       | 3      | `src/styles/tokens.css` |
| Shadows (`--shadow-*`)                                        | 3      | `src/styles/tokens.css` |
| Radius (`--radius-*`)                                         | 5      | `src/styles/tokens.css` |
| Spacing (`--space-*`)                                         | 12     | `src/styles/tokens.css` |
| Motion (`--motion-*`)                                         | 3      | `src/styles/tokens.css` |
| **Total**                                                     | **48** |                         |

All 48 tokens are defined in `docs/design-system.md` and must appear verbatim in `src/styles/tokens.css`.
