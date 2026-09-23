SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
SET LOCAL statement_timeout = '60s';
--> statement-breakpoint

DROP TABLE IF EXISTS public."verification";
--> statement-breakpoint
DROP TABLE IF EXISTS public."subscription_events";
--> statement-breakpoint
DROP TABLE IF EXISTS public."mercado_livre_billing_movements";
--> statement-breakpoint
DROP TABLE IF EXISTS public."daily_metrics";
--> statement-breakpoint
DROP TABLE IF EXISTS public."product_metrics";
--> statement-breakpoint

DROP INDEX IF EXISTS public."billing_trials_email_key";
--> statement-breakpoint
DROP INDEX IF EXISTS public."marketplace_webhook_events_external_account_idx";
--> statement-breakpoint

ALTER TABLE public."account"
  DROP COLUMN IF EXISTS "access_token",
  DROP COLUMN IF EXISTS "refresh_token",
  DROP COLUMN IF EXISTS "id_token",
  DROP COLUMN IF EXISTS "access_token_expires_at",
  DROP COLUMN IF EXISTS "refresh_token_expires_at",
  DROP COLUMN IF EXISTS "scope";
--> statement-breakpoint
ALTER TABLE public."session"
  DROP COLUMN IF EXISTS "ip_address",
  DROP COLUMN IF EXISTS "user_agent";
--> statement-breakpoint
ALTER TABLE public."auth_exchange_ticket"
  DROP COLUMN IF EXISTS "organization_id",
  DROP COLUMN IF EXISTS "created_at",
  DROP COLUMN IF EXISTS "updated_at";
--> statement-breakpoint
ALTER TABLE public."billing_trials"
  DROP COLUMN IF EXISTS "email";
--> statement-breakpoint
ALTER TABLE public."product_images"
  DROP COLUMN IF EXISTS "external_identifier";
--> statement-breakpoint
ALTER TABLE public."marketplace_webhook_events"
  DROP COLUMN IF EXISTS "notification_id",
  DROP COLUMN IF EXISTS "application_id",
  DROP COLUMN IF EXISTS "external_account_id",
  DROP COLUMN IF EXISTS "resource",
  DROP COLUMN IF EXISTS "topic",
  DROP COLUMN IF EXISTS "sent";
