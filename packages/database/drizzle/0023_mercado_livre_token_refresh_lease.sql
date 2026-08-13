ALTER TABLE "marketplace_connections"
  ADD COLUMN IF NOT EXISTS "token_refresh_lease_id" varchar(64),
  ADD COLUMN IF NOT EXISTS "token_refresh_lease_expires_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "marketplace_connections_provider_token_expiry_idx"
  ON "marketplace_connections" ("provider", "status", "token_expires_at");
