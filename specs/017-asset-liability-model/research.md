# Research: FA-NW-001 — Asset and Liability Data Model

## Schema Audit — Current State vs Requirements

### Assets table

| Column          | Required                                | Existing   | Gap        |
| --------------- | --------------------------------------- | ---------- | ---------- |
| id              | uuid PK defaultRandom                   | ✅         | —          |
| userId          | uuid NOT NULL FK → users CASCADE DELETE | ✅         | —          |
| name            | varchar(100) NOT NULL                   | ✅         | —          |
| type            | varchar(50) NOT NULL                    | ✅         | —          |
| value           | numeric(15,2) NOT NULL                  | ✅         | —          |
| linkedAccountId | uuid NULLABLE FK → accounts SET NULL    | ✅         | —          |
| createdAt       | timestamptz NOT NULL defaultNow         | ✅         | —          |
| updatedAt       | timestamptz NOT NULL defaultNow         | ❌ missing | ADD COLUMN |

### Liabilities table

| Column          | Required                                | Existing   | Gap             |
| --------------- | --------------------------------------- | ---------- | --------------- |
| id              | uuid PK defaultRandom                   | ✅         | —               |
| userId          | uuid NOT NULL FK → users CASCADE DELETE | ✅         | —               |
| name            | varchar(100) NOT NULL                   | ✅         | —               |
| type            | varchar(50) NOT NULL                    | ✅         | —               |
| value           | numeric(15,2) NOT NULL                  | ✅         | —               |
| linkedAccountId | uuid NULLABLE FK → accounts SET NULL    | ❌ missing | ADD COLUMN + FK |
| createdAt       | timestamptz NOT NULL defaultNow         | ✅         | —               |
| updatedAt       | timestamptz NOT NULL defaultNow         | ❌ missing | ADD COLUMN      |

### TypeScript types

All four required exports (`Asset`, `NewAsset`, `Liability`, `NewLiability`) already exist in `src/db/schema.ts`. No changes needed.

## Migration Strategy

- **Decision**: Additive ALTER TABLE migration only — no destructive changes, no data loss
- **Rationale**: Both tables already exist in the live database. New columns get sensible defaults (`defaultNow()` for timestamps, nullable for `linkedAccountId`) so no backfill is needed for existing rows
- **Migration file**: Will be `0003_*` — Drizzle names it automatically; the user-specified `0002_assets_liabilities` name is already taken
- **Alternatives considered**: Full table recreation — rejected because it destroys existing data

## updatedAt Column Strategy

- **Decision**: Add `updatedAt` as `timestamptz NOT NULL defaultNow` — no automatic trigger
- **Rationale**: Drizzle ORM does not natively support `ON UPDATE` triggers in PostgreSQL via schema definition. Application code is responsible for setting `updatedAt` on every mutation. This is consistent with the rest of the schema (no other table uses a trigger)
- **Implication for tasks**: Any future API endpoint that updates an asset or liability value MUST include `updatedAt: new Date()` in the update payload — this is a known constraint to document

## Existing Migration Slots

| File                           | Content                                                  |
| ------------------------------ | -------------------------------------------------------- |
| 0000_fancy_matthew_murdock.sql | Initial schema (all tables including assets/liabilities) |
| 0001_square_nekra.sql          | Add transactions index                                   |
| 0002_tan_ultimo.sql            | Add auth columns to users                                |
| **0003\_\*.sql**               | This feature (ALTER TABLE additions)                     |
