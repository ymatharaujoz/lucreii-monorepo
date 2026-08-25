CREATE TABLE IF NOT EXISTS "marketplace_webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" varchar(32) NOT NULL,
  "deduplication_key" varchar(512) NOT NULL,
  "notification_id" varchar(255),
  "application_id" varchar(255),
  "external_account_id" varchar(255),
  "resource" text,
  "topic" varchar(128),
  "sent" varchar(64),
  "payload" jsonb NOT NULL,
  "status" varchar(32) DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "available_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_error" text,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_webhook_events_provider_dedup_key"
  ON "marketplace_webhook_events" ("provider", "deduplication_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketplace_webhook_events_pending_idx"
  ON "marketplace_webhook_events" ("status", "available_at", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketplace_webhook_events_external_account_idx"
  ON "marketplace_webhook_events" ("provider", "external_account_id");
