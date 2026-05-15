# Data Model: Asset and Liability Management

**Feature**: FA-NW-002  
**Branch**: `019-asset-liability-management`  
**Schema source**: `src/db/schema.ts` (tables added in FA-NW-001 — no new migrations needed)

---

## Entities

### Asset

Represents a user-owned item of positive financial value.

| Column            | Type                    | Constraints                           | Notes                                   |
| ----------------- | ----------------------- | ------------------------------------- | --------------------------------------- |
| `id`              | `uuid`                  | PK, defaultRandom()                   |                                         |
| `userId`          | `uuid`                  | NOT NULL, FK → users.id (CASCADE)     | Ownership — every query scopes to this  |
| `name`            | `varchar(100)`          | NOT NULL                              | User-visible label                      |
| `type`            | `varchar(50)`           | NOT NULL                              | See asset type enum below               |
| `value`           | `numeric(15, 2)`        | NOT NULL                              | Non-negative; validated at API boundary |
| `linkedAccountId` | `uuid`                  | nullable, FK → accounts.id (SET NULL) | Cleared if account deleted              |
| `createdAt`       | `timestamp w/ timezone` | NOT NULL, defaultNow()                | Set by DB on insert                     |
| `updatedAt`       | `timestamp w/ timezone` | NOT NULL, defaultNow()                | Set by app (`new Date()`) on PATCH      |

**Asset type enum** (stored as-is in DB):

| Value         | Display label |
| ------------- | ------------- |
| `property`    | Property      |
| `investments` | Investments   |
| `kiwisaver`   | KiwiSaver     |
| `savings`     | Savings       |
| `vehicle`     | Vehicle       |
| `other`       | Other         |

---

### Liability

Represents a user-owned financial obligation.

| Column            | Type                    | Constraints                           | Notes                                   |
| ----------------- | ----------------------- | ------------------------------------- | --------------------------------------- |
| `id`              | `uuid`                  | PK, defaultRandom()                   |                                         |
| `userId`          | `uuid`                  | NOT NULL, FK → users.id (CASCADE)     | Ownership — every query scopes to this  |
| `name`            | `varchar(100)`          | NOT NULL                              | User-visible label                      |
| `type`            | `varchar(50)`           | NOT NULL                              | See liability type enum below           |
| `value`           | `numeric(15, 2)`        | NOT NULL                              | Non-negative; validated at API boundary |
| `linkedAccountId` | `uuid`                  | nullable, FK → accounts.id (SET NULL) | Cleared if account deleted              |
| `createdAt`       | `timestamp w/ timezone` | NOT NULL, defaultNow()                | Set by DB on insert                     |
| `updatedAt`       | `timestamp w/ timezone` | NOT NULL, defaultNow()                | Set by app (`new Date()`) on PATCH      |

**Liability type enum** (stored as-is in DB):

| Value           | Display label |
| --------------- | ------------- |
| `mortgage`      | Mortgage      |
| `personal_loan` | Personal Loan |
| `car_loan`      | Car Loan      |
| `student_loan`  | Student Loan  |
| `credit_card`   | Credit Card   |
| `other`         | Other         |

---

## Relationships

```
users (1) ─────────────────────────────── (*) assets
                                          assets.userId → users.id (CASCADE DELETE)

users (1) ─────────────────────────────── (*) liabilities
                                          liabilities.userId → users.id (CASCADE DELETE)

accounts (1) ──────────────────────────── (*) assets        [optional link]
                                          assets.linkedAccountId → accounts.id (SET NULL)

accounts (1) ──────────────────────────── (*) liabilities   [optional link]
                                          liabilities.linkedAccountId → accounts.id (SET NULL)
```

---

## Validation Rules

Applied at the API layer (Zod), not the DB:

| Field             | Rule                                                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `name`            | Non-empty string, max 100 chars                                                                                              |
| `type`            | Must be one of the valid enum values for the entity                                                                          |
| `value`           | Number ≥ 0 (negative values rejected with 400)                                                                               |
| `linkedAccountId` | UUID string or `null`/omitted; account must belong to the same user (not validated at DB level — UI only shows own accounts) |

---

## updatedAt Policy

There is no DB trigger. The application sets `updatedAt: new Date()` explicitly in every PATCH handler's `.set({...})` payload. This is required — omitting it will leave the field stale.

---

## Frontend Types

Add to `src/types/api.ts`:

```typescript
export interface ApiAsset {
  id: string;
  userId: string;
  name: string;
  type: string;
  value: string; // numeric returned as string by postgres-js
  linkedAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiLiability {
  id: string;
  userId: string;
  name: string;
  type: string;
  value: string; // numeric returned as string by postgres-js
  linkedAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}
```
