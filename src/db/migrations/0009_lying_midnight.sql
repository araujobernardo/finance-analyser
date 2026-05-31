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
ALTER TABLE "akahu_account_links" ADD CONSTRAINT "akahu_account_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "akahu_account_links" ADD CONSTRAINT "akahu_account_links_finance_account_id_accounts_id_fk" FOREIGN KEY ("finance_account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "akahu_connections" ADD CONSTRAINT "akahu_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "akahu_account_links_user_akahu_idx" ON "akahu_account_links" USING btree ("user_id","akahu_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "akahu_account_links_finance_account_idx" ON "akahu_account_links" USING btree ("finance_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "akahu_connections_user_id_idx" ON "akahu_connections" USING btree ("user_id");
