import {
  boolean,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  // Feature 010 — authentication columns
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpiresAt: timestamp("verification_token_expires_at", {
    withTimezone: true,
  }),
  resetToken: text("reset_token"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at", {
    withTimezone: true,
  }),
});

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

export const transactions = pgTable(
  "transactions",
  {
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
  },
  (table) => ({
    userDateIdx: index("transactions_user_id_date_idx").on(
      table.userId,
      table.date,
    ),
  }),
);

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
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const liabilities = pgTable("liabilities", {
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
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

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
  categoryName: varchar("category_name", { length: 100 }),
  currentAmount: numeric("current_amount", { precision: 15, scale: 2 }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const netWorthSnapshots = pgTable(
  "net_worth_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    totalAssets: numeric("total_assets", { precision: 15, scale: 2 }).notNull(),
    totalLiabilities: numeric("total_liabilities", {
      precision: 15,
      scale: 2,
    }).notNull(),
    netWorth: numeric("net_worth", { precision: 15, scale: 2 }).notNull(),
    snapshotDate: date("snapshot_date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdDateUniq: uniqueIndex("net_worth_snapshots_user_id_date_uniq").on(
      table.userId,
      table.snapshotDate,
    ),
  }),
);

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Liability = typeof liabilities.$inferSelect;
export type Goal = typeof goals.$inferSelect;

export type NewUser = typeof users.$inferInsert;
export type NewAccount = typeof accounts.$inferInsert;
export type NewTransaction = typeof transactions.$inferInsert;
export type NewCategory = typeof categories.$inferInsert;
export type NewAsset = typeof assets.$inferInsert;
export type NewLiability = typeof liabilities.$inferInsert;
export type NewGoal = typeof goals.$inferInsert;
export type NetWorthSnapshot = typeof netWorthSnapshots.$inferSelect;
export type NewNetWorthSnapshot = typeof netWorthSnapshots.$inferInsert;
