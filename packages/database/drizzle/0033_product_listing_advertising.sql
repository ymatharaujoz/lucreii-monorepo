SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
SET LOCAL statement_timeout = '60s';
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "product_listing_advertising" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "company_id" uuid NOT NULL,
  "provider" varchar(32) NOT NULL,
  "reference_month" date NOT NULL,
  "listing_key" varchar(255) NOT NULL,
  "amount" numeric(14, 2) DEFAULT '0' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "product_listing_advertising_provider_valid" CHECK ("provider" in ('mercadolivre', 'shopee', 'shein')),
  CONSTRAINT "product_listing_advertising_reference_month_first_day" CHECK ("reference_month" = date_trunc('month', "reference_month")::date),
  CONSTRAINT "product_listing_advertising_amount_non_negative" CHECK ("amount" >= 0),
  CONSTRAINT "product_listing_advertising_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "product_listing_advertising_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "product_listing_advertising_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_listing_advertising_organization_id_idx" ON "product_listing_advertising" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_listing_advertising_user_id_idx" ON "product_listing_advertising" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_listing_advertising_company_id_idx" ON "product_listing_advertising" USING btree ("company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_listing_advertising_company_listing_month_key" ON "product_listing_advertising" USING btree ("organization_id", "company_id", "provider", "reference_month", "listing_key");
--> statement-breakpoint
ALTER TABLE "product_listing_advertising" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "product_listing_advertising" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DO $$
DECLARE
  application_role text;
BEGIN
  FOR application_role IN
    SELECT rolname
    FROM pg_roles
    WHERE rolname IN ('anon', 'authenticated')
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public.product_listing_advertising FROM %I',
      application_role
    );
  END LOOP;
END $$;
