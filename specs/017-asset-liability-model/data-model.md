# Data Model: FA-NW-001 — Asset and Liability Data Model

## Target Schema

### assets

| Column            | Type          | Constraints                            | Notes                                          |
| ----------------- | ------------- | -------------------------------------- | ---------------------------------------------- |
| id                | uuid          | PK, defaultRandom                      | —                                              |
| user_id           | uuid          | NOT NULL, FK → users.id CASCADE DELETE | Scopes to owner                                |
| name              | varchar(100)  | NOT NULL                               | Free-text label                                |
| type              | varchar(50)   | NOT NULL                               | See enum below                                 |
| value             | numeric(15,2) | NOT NULL                               | Current estimated value                        |
| linked_account_id | uuid          | NULLABLE, FK → accounts.id SET NULL    | Optional account link                          |
| created_at        | timestamptz   | NOT NULL, defaultNow                   | Immutable                                      |
| updated_at        | timestamptz   | NOT NULL, defaultNow                   | **NEW** — must be set by app on every mutation |

**Asset type enum**: `property` | `investments` | `kiwisaver` | `savings` | `vehicle` | `other`  
_(enforced at application layer via Zod in future API feature — varchar at DB layer for migration flexibility)_

### liabilities

| Column            | Type          | Constraints                            | Notes                                          |
| ----------------- | ------------- | -------------------------------------- | ---------------------------------------------- |
| id                | uuid          | PK, defaultRandom                      | —                                              |
| user_id           | uuid          | NOT NULL, FK → users.id CASCADE DELETE | Scopes to owner                                |
| name              | varchar(100)  | NOT NULL                               | Free-text label                                |
| type              | varchar(50)   | NOT NULL                               | See enum below                                 |
| value             | numeric(15,2) | NOT NULL                               | Current outstanding balance                    |
| linked_account_id | uuid          | NULLABLE, FK → accounts.id SET NULL    | **NEW** — optional account link                |
| created_at        | timestamptz   | NOT NULL, defaultNow                   | Immutable                                      |
| updated_at        | timestamptz   | NOT NULL, defaultNow                   | **NEW** — must be set by app on every mutation |

**Liability type enum**: `mortgage` | `personal_loan` | `car_loan` | `student_loan` | `credit_card` | `other`  
_(enforced at application layer via Zod in future API feature — varchar at DB layer)_

## Changes From Current Schema

### assets

- ADD COLUMN `updated_at timestamptz NOT NULL DEFAULT now()`

### liabilities

- ADD COLUMN `linked_account_id uuid NULLABLE REFERENCES accounts(id) ON DELETE SET NULL`
- ADD COLUMN `updated_at timestamptz NOT NULL DEFAULT now()`

## TypeScript Types (src/db/schema.ts)

All four types already exist and will update automatically when Drizzle infers from the updated table definitions:

```typescript
export type Asset = typeof assets.$inferSelect; // includes updatedAt after change
export type NewAsset = typeof assets.$inferInsert;
export type Liability = typeof liabilities.$inferSelect; // includes updatedAt + linkedAccountId
export type NewLiability = typeof liabilities.$inferInsert;
```

## Entity Relationships

```
users (1) ──< assets (N)
  └─ user_id FK

users (1) ──< liabilities (N)
  └─ user_id FK

accounts (1) ──< assets (0..N)       [optional, nullable]
  └─ linked_account_id FK SET NULL

accounts (1) ──< liabilities (0..N)  [optional, nullable — NEW]
  └─ linked_account_id FK SET NULL
```
