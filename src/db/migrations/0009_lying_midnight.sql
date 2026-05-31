CREATE TABLE "akahu_account_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"akahu_account_id" varchar(50) NOT NULL,
	"finance_account_id" uuid NOT NULL,
	"akahu_account_name" varchar(200) NOT NULL,
	"akahu_account_type" varchar(50),
	"last_balance" numeric(15, 2),
	"last_transaction_synced_at" timestamp with time zone,
	"sync_status" varchar(20) DEFAULT 'active' NOT NULL,
	"sync_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "akahu_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"akahu_user_id" varchar(50) NOT NULL,
	"encrypted_user_token" text NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_defaults" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_name" varchar(100) NOT NULL,
	"limit_amount" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_name" varchar(100) NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"limit_amount" numeric(15, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "net_worth_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_assets" numeric(15, 2) NOT NULL,
	"total_liabilities" numeric(15, 2) NOT NULL,
	"net_worth" numeric(15, 2) NOT NULL,
	"snapshot_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"month_start_day" integer DEFAULT 1 NOT NULL,
	"alert_threshold" integer DEFAULT 80 NOT NULL,
	"email_alerts_enabled" boolean DEFAULT true NOT NULL,
	"last_alert_email_sent_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "auto_sync" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "balance_clamped" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "category_name" varchar(100);--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "current_amount" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "liabilities" ADD COLUMN "auto_sync" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "liabilities" ADD COLUMN "balance_clamped" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "akahu_account_links" ADD CONSTRAINT "akahu_account_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "akahu_account_links" ADD CONSTRAINT "akahu_account_links_finance_account_id_accounts_id_fk" FOREIGN KEY ("finance_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "akahu_connections" ADD CONSTRAINT "akahu_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_defaults" ADD CONSTRAINT "budget_defaults_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "net_worth_snapshots" ADD CONSTRAINT "net_worth_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "akahu_account_links_user_akahu_idx" ON "akahu_account_links" USING btree ("user_id","akahu_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "akahu_account_links_finance_account_idx" ON "akahu_account_links" USING btree ("finance_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "akahu_connections_user_id_idx" ON "akahu_connections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_defaults_user_category_uniq" ON "budget_defaults" USING btree ("user_id","category_name");--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_user_category_month_uniq" ON "budgets" USING btree ("user_id","category_name","year","month");--> statement-breakpoint
CREATE UNIQUE INDEX "net_worth_snapshots_user_id_date_uniq" ON "net_worth_snapshots" USING btree ("user_id","snapshot_date");