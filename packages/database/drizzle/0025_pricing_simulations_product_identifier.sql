ALTER TABLE "pricing_simulations"
  ADD COLUMN IF NOT EXISTS "product_identifier" varchar(255);
--> statement-breakpoint
UPDATE "pricing_simulations"
SET "product_identifier" = COALESCE(
  NULLIF(trim("product_name"), ''),
  NULLIF(trim("product_sku"), '')
)
WHERE "product_identifier" IS NULL;
--> statement-breakpoint
ALTER TABLE "pricing_simulations"
  ALTER COLUMN "product_identifier" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "pricing_simulations"
  DROP CONSTRAINT IF EXISTS "pricing_simulations_identifier_present";
--> statement-breakpoint
ALTER TABLE "pricing_simulations"
  ADD CONSTRAINT "pricing_simulations_identifier_present"
  CHECK (nullif(trim("product_identifier"), '') is not null);
--> statement-breakpoint
DROP INDEX IF EXISTS "pricing_simulations_company_sku_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "pricing_simulations_company_name_idx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_simulations_company_identifier_idx"
  ON "pricing_simulations" USING btree ("company_id", "product_identifier");
--> statement-breakpoint
ALTER TABLE "pricing_simulations"
  DROP COLUMN IF EXISTS "product_sku";
--> statement-breakpoint
ALTER TABLE "pricing_simulations"
  DROP COLUMN IF EXISTS "product_name";
