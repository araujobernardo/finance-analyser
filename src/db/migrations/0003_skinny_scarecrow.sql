ALTER TABLE "assets" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "liabilities" ADD COLUMN "linked_account_id" uuid;--> statement-breakpoint
ALTER TABLE "liabilities" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "liabilities" ADD CONSTRAINT "liabilities_linked_account_id_accounts_id_fk" FOREIGN KEY ("linked_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;