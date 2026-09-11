ALTER TABLE "billing_trials"
  ADD COLUMN IF NOT EXISTS "organization_id" uuid;
--> statement-breakpoint
ALTER TABLE "billing_trials"
  ADD COLUMN IF NOT EXISTS "trial_started_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "billing_trials"
  ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "billing_trials"
SET
  "trial_started_at" = COALESCE("trial_started_at", "created_at", now()),
  "trial_ends_at" = COALESCE(
    "trial_ends_at",
    "trial_started_at",
    "created_at",
    now()
  ) + interval '7 days';
--> statement-breakpoint
ALTER TABLE "billing_trials"
  ALTER COLUMN "trial_started_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "billing_trials"
  ALTER COLUMN "trial_ends_at" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "billing_trials"
  ADD CONSTRAINT "billing_trials_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "billing_trials_organization_id_idx"
  ON "billing_trials" USING btree ("organization_id");
--> statement-breakpoint
DROP INDEX IF EXISTS "billing_trials_checkout_session_id_key";
--> statement-breakpoint
ALTER TABLE "billing_trials"
  DROP COLUMN IF EXISTS "checkout_session_id",
  DROP COLUMN IF EXISTS "interval",
  DROP COLUMN IF EXISTS "plan_code",
  DROP COLUMN IF EXISTS "reserved_until",
  DROP COLUMN IF EXISTS "redeemed_at";
