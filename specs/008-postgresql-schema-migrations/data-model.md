# Data Model: PostgreSQL Schema

**Branch**: `008-postgresql-schema-migrations` | **Date**: 2026-05-05

All tables use UUID primary keys and carry a `created_at` timestamp. Every table except `users` has a `user_id` FK enforcing row-level ownership.

---

## Entity Relationship Summary

```
users
  ├── accounts (user_id → users.id)
  │     └── transactions (account_id → accounts.id, user_id → users.id)
  │     └── assets.linked_account_id (optional → accounts.id)
  │     └── goals.linked_account_id (optional → accounts.id)
  ├── categories (user_id → users.id)
  ├── assets (user_id → users.id)
  ├── liabilities (user_id → users.id)
  └── goals (user_id → users.id)
```

---

## Table Definitions (Drizzle schema notation)

### `users`

```typescript
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

| Column          | Type         | Constraints           |
| --------------- | ------------ | --------------------- |
| id              | uuid         | PK, default random    |
| email           | varchar(255) | NOT NULL, UNIQUE      |
| hashed_password | text         | NOT NULL              |
| display_name    | varchar(100) | NOT NULL              |
| created_at      | timestamptz  | NOT NULL, default now |

---

### `accounts`

```typescript
export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountNumber: varchar("account_number", { length: 50 }).notNull(),
  nickname: varchar("nickname", { length: 100 }).notNull(),
  accountType: varchar("account_type", { length: 50 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

| Column         | Type         | Constraints                     |
| -------------- | ------------ | ------------------------------- |
| id             | uuid         | PK, default random              |
| user_id        | uuid         | NOT NULL, FK → users.id CASCADE |
| account_number | varchar(50)  | NOT NULL                        |
| nickname       | varchar(100) | NOT NULL                        |
| account_type   | varchar(50)  | NOT NULL                        |
| created_at     | timestamptz  | NOT NULL, default now           |

`account_type` open values: `cheque`, `savings`, `credit`, `investment`, `other`.

---

### `categories`

```typescript
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  colour: varchar("colour", { length: 7 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

| Column     | Type         | Constraints                     |
| ---------- | ------------ | ------------------------------- |
| id         | uuid         | PK, default random              |
| user_id    | uuid         | NOT NULL, FK → users.id CASCADE |
| name       | varchar(100) | NOT NULL                        |
| colour     | varchar(7)   | NOT NULL (hex: `#RRGGBB`)       |
| created_at | timestamptz  | NOT NULL, default now           |

---

### `transactions`

```typescript
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: uuid("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 100 }),
  isTransfer: boolean("is_transfer").notNull().default(false),
  isManualTransfer: boolean("is_manual_transfer").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

| Column             | Type          | Constraints                        |
| ------------------ | ------------- | ---------------------------------- |
| id                 | uuid          | PK, default random                 |
| user_id            | uuid          | NOT NULL, FK → users.id CASCADE    |
| account_id         | uuid          | NOT NULL, FK → accounts.id CASCADE |
| date               | date          | NOT NULL                           |
| amount             | numeric(15,2) | NOT NULL                           |
| description        | text          | NOT NULL                           |
| category           | varchar(100)  | nullable (uncategorised allowed)   |
| is_transfer        | boolean       | NOT NULL, default false            |
| is_manual_transfer | boolean       | NOT NULL, default false            |
| created_at         | timestamptz   | NOT NULL, default now              |

> **Note**: `category` is a free-text string for now, matching the existing categorisation feature. A future migration will add a `category_id` FK to the `categories` table once the category management API is in place.

---

### `assets`

```typescript
export const assets = pgTable("assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  value: numeric("value", { precision: 15, scale: 2 }).notNull(),
  linkedAccountId: uuid("linked_account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

| Column            | Type          | Constraints                         |
| ----------------- | ------------- | ----------------------------------- |
| id                | uuid          | PK, default random                  |
| user_id           | uuid          | NOT NULL, FK → users.id CASCADE     |
| name              | varchar(100)  | NOT NULL                            |
| type              | varchar(50)   | NOT NULL                            |
| value             | numeric(15,2) | NOT NULL                            |
| linked_account_id | uuid          | nullable, FK → accounts.id SET NULL |
| created_at        | timestamptz   | NOT NULL, default now               |

---

### `liabilities`

```typescript
export const liabilities = pgTable("liabilities", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  value: numeric("value", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

| Column     | Type          | Constraints                     |
| ---------- | ------------- | ------------------------------- |
| id         | uuid          | PK, default random              |
| user_id    | uuid          | NOT NULL, FK → users.id CASCADE |
| name       | varchar(100)  | NOT NULL                        |
| type       | varchar(50)   | NOT NULL                        |
| value      | numeric(15,2) | NOT NULL                        |
| created_at | timestamptz   | NOT NULL, default now           |

---

### `goals`

```typescript
export const goals = pgTable("goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  targetAmount: numeric("target_amount", { precision: 15, scale: 2 }).notNull(),
  targetDate: date("target_date"),
  linkedAccountId: uuid("linked_account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

| Column            | Type          | Constraints                         |
| ----------------- | ------------- | ----------------------------------- |
| id                | uuid          | PK, default random                  |
| user_id           | uuid          | NOT NULL, FK → users.id CASCADE     |
| name              | varchar(100)  | NOT NULL                            |
| type              | varchar(50)   | NOT NULL                            |
| target_amount     | numeric(15,2) | NOT NULL                            |
| target_date       | date          | nullable                            |
| linked_account_id | uuid          | nullable, FK → accounts.id SET NULL |
| status            | varchar(20)   | NOT NULL, default `'active'`        |
| created_at        | timestamptz   | NOT NULL, default now               |

`status` values: `active`, `achieved`, `abandoned`.

---

## Exported TypeScript Types

Drizzle infers TypeScript types directly from schema definitions. The following are exported from `src/db/schema.ts` for use in the future API layer:

```typescript
// Select types (rows returned from DB)
export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Liability = typeof liabilities.$inferSelect;
export type Goal = typeof goals.$inferSelect;

// Insert types (rows being inserted)
export type NewUser = typeof users.$inferInsert;
export type NewAccount = typeof accounts.$inferInsert;
export type NewTransaction = typeof transactions.$inferInsert;
export type NewCategory = typeof categories.$inferInsert;
export type NewAsset = typeof assets.$inferInsert;
export type NewLiability = typeof liabilities.$inferInsert;
export type NewGoal = typeof goals.$inferInsert;
```
