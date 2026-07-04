import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
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
  // FA-NW-004 — auto-sync columns added by migration 0006_auto_sync_flag.sql
  autoSync: boolean("auto_sync").notNull().default(true),
  balanceClamped: boolean("balance_clamped").notNull().default(false),
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
  // FA-NW-004 — auto-sync columns added by migration 0006_auto_sync_flag.sql
  autoSync: boolean("auto_sync").notNull().default(true),
  balanceClamped: boolean("balance_clamped").notNull().default(false),
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
  // FA-GOAL-001 Phase 2 — new columns added by migration 0005_goals_schema_complete.sql
  categoryName: varchar("category_name", { length: 100 }), // nullable; for spending_limit goals only
  currentAmount: numeric("current_amount", { precision: 15, scale: 2 }), // nullable; populated by FA-GOAL-003
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

// FA-BUDG-001 — Monthly budget data model (migration 0007_budget_data_model.sql)

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryName: varchar("category_name", { length: 100 }).notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    limitAmount: numeric("limit_amount", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userCategoryMonthUniq: uniqueIndex("budgets_user_category_month_uniq").on(
      table.userId,
      table.categoryName,
      table.year,
      table.month,
    ),
  }),
);

export const budgetDefaults = pgTable(
  "budget_defaults",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryName: varchar("category_name", { length: 100 }).notNull(),
    limitAmount: numeric("limit_amount", { precision: 15, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userCategoryUniq: uniqueIndex("budget_defaults_user_category_uniq").on(
      table.userId,
      table.categoryName,
    ),
  }),
);

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  monthStartDay: integer("month_start_day").notNull().default(1),
  // FA-BUDG-003 T002: alert preference columns (migration 0008_budget_alert_preferences.sql)
  alertThreshold: integer("alert_threshold").notNull().default(80),
  emailAlertsEnabled: boolean("email_alerts_enabled").notNull().default(true),
  lastAlertEmailSentAt: date("last_alert_email_sent_at"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// FA-BANK-001 — Akahu bank connection

export const akahuConnections = pgTable(
  "akahu_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    akahuUserId: varchar("akahu_user_id", { length: 50 }).notNull(),
    encryptedUserToken: text("encrypted_user_token").notNull(),
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userIdUniq: uniqueIndex("akahu_connections_user_id_idx").on(t.userId),
  }),
);

export type AkahuConnection = typeof akahuConnections.$inferSelect;
export type NewAkahuConnection = typeof akahuConnections.$inferInsert;

// FA-AI-001 — AI-generated financial summaries

export const financialSummaries = pgTable(
  "financial_summaries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    content: text("content").notNull(),
    previousSummaryId: uuid("previous_summary_id").references(
      (): AnyPgColumn => financialSummaries.id,
      { onDelete: "set null" },
    ),
  },
  (table) => ({
    userGeneratedAtIdx: index(
      "financial_summaries_user_id_generated_at_idx",
    ).on(table.userId, table.generatedAt),
  }),
);

export const akahuAccountLinks = pgTable(
  "akahu_account_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    akahuAccountId: varchar("akahu_account_id", { length: 50 }).notNull(),
    // FA-BANK-002: nullable — unlinked discovery rows have no Finance Analyser account yet
    financeAccountId: uuid("finance_account_id").references(() => accounts.id, {
      onDelete: "cascade",
    }),
    akahuAccountName: varchar("akahu_account_name", { length: 200 }).notNull(),
    akahuAccountType: varchar("akahu_account_type", { length: 50 }),
    lastBalance: numeric("last_balance", { precision: 15, scale: 2 }), // postgres-js returns numeric as string; call parseFloat() before arithmetic
    lastTransactionSyncedAt: timestamp("last_transaction_synced_at", {
      withTimezone: true,
    }),
    syncStatus: varchar("sync_status", { length: 20 })
      .notNull()
      .default("active"),
    syncError: text("sync_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userAkahuUniq: uniqueIndex("akahu_account_links_user_akahu_idx").on(
      t.userId,
      t.akahuAccountId,
    ),
    financeAccountUniq: uniqueIndex(
      "akahu_account_links_finance_account_idx",
    ).on(t.financeAccountId),
  }),
);

export type AkahuAccountLink = typeof akahuAccountLinks.$inferSelect;
export type NewAkahuAccountLink = typeof akahuAccountLinks.$inferInsert;

// Inferred types — tsc -b verified 0 errors (FA-GOAL-001 T008, 2026-05-17)
// Goal includes: categoryName: string | null, currentAmount: string | null, updatedAt: Date
export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Liability = typeof liabilities.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type BudgetDefault = typeof budgetDefaults.$inferSelect;
export type NewBudgetDefault = typeof budgetDefaults.$inferInsert;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;

export type NewUser = typeof users.$inferInsert;
export type NewAccount = typeof accounts.$inferInsert;
export type NewTransaction = typeof transactions.$inferInsert;
export type NewCategory = typeof categories.$inferInsert;
export type NewAsset = typeof assets.$inferInsert;
export type NewLiability = typeof liabilities.$inferInsert;
export type NewGoal = typeof goals.$inferInsert;
export type NetWorthSnapshot = typeof netWorthSnapshots.$inferSelect;
export type NewNetWorthSnapshot = typeof netWorthSnapshots.$inferInsert;
export type FinancialSummary = typeof financialSummaries.$inferSelect;
export type NewFinancialSummary = typeof financialSummaries.$inferInsert;
