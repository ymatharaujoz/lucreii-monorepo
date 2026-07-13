ALTER TABLE "external_orders"
  ADD COLUMN IF NOT EXISTS "refund_bonus_cents" bigint DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "refund_bonus_status" varchar(30) DEFAULT 'PENDING' NOT NULL,
  ADD COLUMN IF NOT EXISTS "refund_bonus_source" varchar(50),
  ADD COLUMN IF NOT EXISTS "refund_bonus_resolved_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "refund_bonus_last_checked_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "refund_bonus_attempts" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "refund_bonus_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;

CREATE TABLE IF NOT EXISTS "mercado_livre_billing_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "marketplace_connection_id" uuid NOT NULL REFERENCES "marketplace_connections"("id") ON DELETE CASCADE,
  "external_order_id" varchar(255), "external_pack_id" varchar(255),
  "external_payment_id" varchar(255), "external_shipment_id" varchar(255),
  "external_movement_id" varchar(255) NOT NULL, "deduplication_key" varchar(512) NOT NULL,
  "period_key" varchar(10) NOT NULL, "billing_group" varchar(4) NOT NULL,
  "document_type" varchar(64) NOT NULL, "amount_cents" bigint NOT NULL,
  "currency" varchar(8) DEFAULT 'BRL' NOT NULL, "is_seller_credit" boolean DEFAULT false NOT NULL,
  "payload" jsonb NOT NULL, "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "meli_billing_movements_connection_dedupe_key" ON "mercado_livre_billing_movements" ("marketplace_connection_id", "deduplication_key");
CREATE INDEX IF NOT EXISTS "meli_billing_movements_organization_id_idx" ON "mercado_livre_billing_movements" ("organization_id");
CREATE INDEX IF NOT EXISTS "meli_billing_movements_company_id_idx" ON "mercado_livre_billing_movements" ("company_id");
CREATE INDEX IF NOT EXISTS "meli_billing_movements_order_id_idx" ON "mercado_livre_billing_movements" ("external_order_id");
