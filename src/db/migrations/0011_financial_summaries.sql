-- FA-AI-001: AI-generated financial summaries
-- Creates the financial_summaries table with a self-referential FK and a
-- composite index on (user_id, generated_at DESC) for efficient latest-first queries.

CREATE TABLE IF NOT EXISTS "financial_summaries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "generated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "content" text NOT NULL,
  "previous_summary_id" uuid
);
--> statement-breakpoint
ALTER TABLE "financial_summaries"
  ADD CONSTRAINT "financial_summaries_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "financial_summaries"
  ADD CONSTRAINT "financial_summaries_previous_summary_id_fk"
  FOREIGN KEY ("previous_summary_id") REFERENCES "public"."financial_summaries"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "financial_summaries_user_id_generated_at_idx"
  ON "financial_summaries" USING btree ("user_id", "generated_at" DESC);
