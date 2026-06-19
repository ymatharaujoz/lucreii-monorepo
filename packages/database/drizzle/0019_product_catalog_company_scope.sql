DELETE FROM "ad_costs";
DELETE FROM "product_costs";
DELETE FROM "manual_expenses";
DELETE FROM "product_images";
DELETE FROM "product_finance_defaults";
DELETE FROM "products";

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "company_id" uuid;
ALTER TABLE "product_costs" ADD COLUMN IF NOT EXISTS "company_id" uuid;
ALTER TABLE "ad_costs" ADD COLUMN IF NOT EXISTS "company_id" uuid;
ALTER TABLE "manual_expenses" ADD COLUMN IF NOT EXISTS "company_id" uuid;

DO $$ BEGIN
 ALTER TABLE "products"
  ADD CONSTRAINT "products_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id")
  ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "product_costs"
  ADD CONSTRAINT "product_costs_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id")
  ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "ad_costs"
  ADD CONSTRAINT "ad_costs_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id")
  ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "manual_expenses"
  ADD CONSTRAINT "manual_expenses_company_id_companies_id_fk"
  FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id")
  ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "products" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "product_costs" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "ad_costs" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "manual_expenses" ALTER COLUMN "company_id" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "products_company_id_idx" ON "products" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "product_costs_company_id_idx" ON "product_costs" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "ad_costs_company_id_idx" ON "ad_costs" USING btree ("company_id");
CREATE INDEX IF NOT EXISTS "manual_expenses_company_id_idx" ON "manual_expenses" USING btree ("company_id");

DROP INDEX IF EXISTS "products_org_normalized_sku_key";
CREATE UNIQUE INDEX IF NOT EXISTS "products_company_normalized_sku_key"
  ON "products" USING btree ("company_id", upper(trim("sku")))
  WHERE "sku" IS NOT NULL AND char_length(trim("sku")) > 0;
