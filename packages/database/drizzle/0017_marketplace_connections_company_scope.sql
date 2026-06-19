ALTER TABLE "marketplace_connections"
ADD COLUMN IF NOT EXISTS "company_id" uuid;

ALTER TABLE "sync_runs"
ADD COLUMN IF NOT EXISTS "company_id" uuid;

ALTER TABLE "external_products"
ADD COLUMN IF NOT EXISTS "company_id" uuid;

ALTER TABLE "external_orders"
ADD COLUMN IF NOT EXISTS "company_id" uuid;

WITH organization_default_company AS (
  SELECT DISTINCT ON (c.organization_id)
    c.organization_id,
    c.id AS company_id
  FROM "companies" c
  WHERE c.is_active = true
  ORDER BY
    c.organization_id,
    c.created_at ASC
)
UPDATE "marketplace_connections" mc
SET "company_id" = odc.company_id
FROM organization_default_company odc
WHERE mc.organization_id = odc.organization_id
  AND mc.company_id IS NULL;

UPDATE "sync_runs" sr
SET "company_id" = mc.company_id
FROM "marketplace_connections" mc
WHERE sr.marketplace_connection_id = mc.id
  AND sr.company_id IS NULL;

WITH organization_default_company AS (
  SELECT DISTINCT ON (c.organization_id)
    c.organization_id,
    c.id AS company_id
  FROM "companies" c
  WHERE c.is_active = true
  ORDER BY
    c.organization_id,
    c.created_at ASC
)
UPDATE "sync_runs" sr
SET "company_id" = odc.company_id
FROM organization_default_company odc
WHERE sr.organization_id = odc.organization_id
  AND sr.company_id IS NULL;

UPDATE "external_products" ep
SET "company_id" = mc.company_id
FROM "marketplace_connections" mc
WHERE ep.marketplace_connection_id = mc.id
  AND ep.company_id IS NULL;

WITH organization_default_company AS (
  SELECT DISTINCT ON (c.organization_id)
    c.organization_id,
    c.id AS company_id
  FROM "companies" c
  WHERE c.is_active = true
  ORDER BY
    c.organization_id,
    c.created_at ASC
)
UPDATE "external_products" ep
SET "company_id" = odc.company_id
FROM organization_default_company odc
WHERE ep.organization_id = odc.organization_id
  AND ep.company_id IS NULL;

UPDATE "external_orders" eo
SET "company_id" = mc.company_id
FROM "marketplace_connections" mc
WHERE eo.marketplace_connection_id = mc.id
  AND eo.company_id IS NULL;

WITH organization_default_company AS (
  SELECT DISTINCT ON (c.organization_id)
    c.organization_id,
    c.id AS company_id
  FROM "companies" c
  WHERE c.is_active = true
  ORDER BY
    c.organization_id,
    c.created_at ASC
)
UPDATE "external_orders" eo
SET "company_id" = odc.company_id
FROM organization_default_company odc
WHERE eo.organization_id = odc.organization_id
  AND eo.company_id IS NULL;

ALTER TABLE "marketplace_connections"
ALTER COLUMN "company_id" SET NOT NULL;

ALTER TABLE "sync_runs"
ALTER COLUMN "company_id" SET NOT NULL;

ALTER TABLE "external_products"
ALTER COLUMN "company_id" SET NOT NULL;

ALTER TABLE "external_orders"
ALTER COLUMN "company_id" SET NOT NULL;

ALTER TABLE "marketplace_connections"
ADD CONSTRAINT "marketplace_connections_company_id_companies_id_fk"
FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id")
ON DELETE cascade ON UPDATE no action;

ALTER TABLE "sync_runs"
ADD CONSTRAINT "sync_runs_company_id_companies_id_fk"
FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id")
ON DELETE cascade ON UPDATE no action;

ALTER TABLE "external_products"
ADD CONSTRAINT "external_products_company_id_companies_id_fk"
FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id")
ON DELETE cascade ON UPDATE no action;

ALTER TABLE "external_orders"
ADD CONSTRAINT "external_orders_company_id_companies_id_fk"
FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id")
ON DELETE cascade ON UPDATE no action;

DROP INDEX IF EXISTS "marketplace_connections_org_provider_key";
DROP INDEX IF EXISTS "marketplace_connections_org_provider_idx";
DROP INDEX IF EXISTS "sync_runs_org_provider_created_idx";
DROP INDEX IF EXISTS "external_products_org_provider_external_key";
DROP INDEX IF EXISTS "external_orders_org_provider_external_key";

CREATE INDEX IF NOT EXISTS "marketplace_connections_company_id_idx"
ON "marketplace_connections" USING btree ("company_id");

CREATE INDEX IF NOT EXISTS "sync_runs_company_id_idx"
ON "sync_runs" USING btree ("company_id");

CREATE INDEX IF NOT EXISTS "external_products_company_id_idx"
ON "external_products" USING btree ("company_id");

CREATE INDEX IF NOT EXISTS "external_orders_company_id_idx"
ON "external_orders" USING btree ("company_id");

CREATE INDEX IF NOT EXISTS "marketplace_connections_org_provider_idx"
ON "marketplace_connections" USING btree ("organization_id","company_id","provider");

CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_connections_org_provider_key"
ON "marketplace_connections" USING btree ("organization_id","company_id","provider");

CREATE INDEX IF NOT EXISTS "sync_runs_org_provider_created_idx"
ON "sync_runs" USING btree ("organization_id","company_id","provider","created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "external_products_org_provider_external_key"
ON "external_products" USING btree ("organization_id","company_id","provider","external_product_id");

CREATE UNIQUE INDEX IF NOT EXISTS "external_orders_org_provider_external_key"
ON "external_orders" USING btree ("organization_id","company_id","provider","external_order_id");
