ALTER TABLE "product_monthly_performance"
  ADD COLUMN IF NOT EXISTS "product_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_monthly_performance_product_id_products_id_fk'
  ) THEN
    ALTER TABLE "product_monthly_performance"
      ADD CONSTRAINT "product_monthly_performance_product_id_products_id_fk"
      FOREIGN KEY ("product_id")
      REFERENCES "products"("id")
      ON DELETE SET NULL
      ON UPDATE NO ACTION;
  END IF;
END $$;

UPDATE "product_monthly_performance" AS pmp
SET "product_id" = p."id"
FROM "products" AS p
WHERE pmp."product_id" IS NULL
  AND pmp."organization_id" = p."organization_id"
  AND pmp."company_id" = p."company_id"
  AND upper(trim(pmp."sku")) = upper(trim(p."sku"));

DROP INDEX IF EXISTS "product_monthly_performance_org_company_month_channel_sku_key";

CREATE INDEX IF NOT EXISTS "product_monthly_performance_product_id_idx"
  ON "product_monthly_performance" USING btree ("product_id");

CREATE UNIQUE INDEX IF NOT EXISTS "product_monthly_performance_org_company_month_channel_product_key"
  ON "product_monthly_performance" USING btree (
    "organization_id",
    "company_id",
    "reference_month",
    "channel",
    "product_id"
  );

CREATE UNIQUE INDEX IF NOT EXISTS "product_monthly_performance_org_company_month_channel_sku_legacy_key"
  ON "product_monthly_performance" USING btree (
    "organization_id",
    "company_id",
    "reference_month",
    "channel",
    "sku"
  )
  WHERE "product_id" IS NULL;
