ALTER TABLE "external_orders"
ADD COLUMN IF NOT EXISTS "refund_bonus_amount" numeric(14, 2) DEFAULT '0' NOT NULL;
