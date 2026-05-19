-- FA-BUDG-001: Monthly budget data model
-- Three new tables: budgets, budget_defaults, user_preferences
-- CHECK constraints enforce: month 1-12, limitAmount >= 0, monthStartDay 1-28

CREATE TABLE IF NOT EXISTS "budgets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "category_name" varchar(100) NOT NULL,
  "year" integer NOT NULL,
  "month" integer NOT NULL,
  "limit_amount" numeric(15, 2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "budgets_month_check" CHECK (month >= 1 AND month <= 12),
  CONSTRAINT "budgets_limit_amount_check" CHECK (limit_amount >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "budget_defaults" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "category_name" varchar(100) NOT NULL,
  "limit_amount" numeric(15, 2) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "budget_defaults_limit_amount_check" CHECK (limit_amount >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE,
  "month_start_day" integer NOT NULL DEFAULT 1,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_preferences_month_start_day_check" CHECK (month_start_day >= 1 AND month_start_day <= 28)
);
--> statement-breakpoint
ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "budget_defaults"
  ADD CONSTRAINT "budget_defaults_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_preferences"
  ADD CONSTRAINT "user_preferences_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_user_category_month_uniq"
  ON "budgets" ("user_id", "category_name", "year", "month");
--> statement-breakpoint
CREATE UNIQUE INDEX "budget_defaults_user_category_uniq"
  ON "budget_defaults" ("user_id", "category_name");
