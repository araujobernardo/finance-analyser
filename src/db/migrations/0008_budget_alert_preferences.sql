-- FA-BUDG-003 T001: Add alert preference columns to user_preferences
ALTER TABLE "user_preferences"
  ADD COLUMN "alert_threshold" integer NOT NULL DEFAULT 80,
  ADD COLUMN "email_alerts_enabled" boolean NOT NULL DEFAULT true,
  ADD COLUMN "last_alert_email_sent_at" date;
--> statement-breakpoint
ALTER TABLE "user_preferences"
  ADD CONSTRAINT "user_preferences_alert_threshold_check"
  CHECK (alert_threshold >= 50 AND alert_threshold <= 100);
