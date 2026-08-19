CREATE TABLE IF NOT EXISTS "pricing_simulations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "company_id" uuid NOT NULL,
  "mode" varchar(32) NOT NULL,
  "product_sku" varchar(128),
  "product_name" varchar(255),
  "target" numeric(14, 6) NOT NULL,
  "product_cost" numeric(14, 6) DEFAULT '0' NOT NULL,
  "packaging_cost" numeric(14, 6) DEFAULT '0' NOT NULL,
  "shipping_fee" numeric(14, 6) DEFAULT '0' NOT NULL,
  "other_fixed_costs" numeric(14, 6) DEFAULT '0' NOT NULL,
  "marketplace_commission_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
  "tax_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
  "affiliate_commission_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
  "store_coupon_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
  "other_variable_cost_rate" numeric(8, 6) DEFAULT '0' NOT NULL,
  "recommended_sale_price" numeric(14, 6) NOT NULL,
  "contribution_margin" numeric(14, 6) NOT NULL,
  "gross_profit" numeric(14, 6) NOT NULL,
  "fixed_costs_total" numeric(14, 6) NOT NULL,
  "variable_rates_total" numeric(8, 6) NOT NULL,
  "calculation_version" varchar(32) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pricing_simulations_mode_valid" CHECK ("pricing_simulations"."mode" in ('contribution-margin', 'desired-profit', 'sale-price')),
  CONSTRAINT "pricing_simulations_identifier_present" CHECK (nullif(trim("pricing_simulations"."product_sku"), '') is not null or nullif(trim("pricing_simulations"."product_name"), '') is not null),
  CONSTRAINT "pricing_simulations_target_non_negative" CHECK ("pricing_simulations"."target" >= 0),
  CONSTRAINT "pricing_simulations_target_mode_valid" CHECK (("pricing_simulations"."mode" <> 'sale-price' or "pricing_simulations"."target" > 0) and ("pricing_simulations"."mode" <> 'contribution-margin' or "pricing_simulations"."target" <= 1)),
  CONSTRAINT "pricing_simulations_product_cost_non_negative" CHECK ("pricing_simulations"."product_cost" >= 0),
  CONSTRAINT "pricing_simulations_packaging_cost_non_negative" CHECK ("pricing_simulations"."packaging_cost" >= 0),
  CONSTRAINT "pricing_simulations_shipping_fee_non_negative" CHECK ("pricing_simulations"."shipping_fee" >= 0),
  CONSTRAINT "pricing_simulations_other_fixed_costs_non_negative" CHECK ("pricing_simulations"."other_fixed_costs" >= 0),
  CONSTRAINT "pricing_simulations_marketplace_rate_range" CHECK ("pricing_simulations"."marketplace_commission_rate" between 0 and 1),
  CONSTRAINT "pricing_simulations_tax_rate_range" CHECK ("pricing_simulations"."tax_rate" between 0 and 1),
  CONSTRAINT "pricing_simulations_affiliate_rate_range" CHECK ("pricing_simulations"."affiliate_commission_rate" between 0 and 1),
  CONSTRAINT "pricing_simulations_store_coupon_rate_range" CHECK ("pricing_simulations"."store_coupon_rate" between 0 and 1),
  CONSTRAINT "pricing_simulations_other_variable_rate_range" CHECK ("pricing_simulations"."other_variable_cost_rate" between 0 and 1),
  CONSTRAINT "pricing_simulations_recommended_price_positive" CHECK ("pricing_simulations"."recommended_sale_price" > 0),
  CONSTRAINT "pricing_simulations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "pricing_simulations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "pricing_simulations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_simulations_organization_id_idx" ON "pricing_simulations" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_simulations_user_id_idx" ON "pricing_simulations" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_simulations_company_created_idx" ON "pricing_simulations" USING btree ("company_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_simulations_company_sku_idx" ON "pricing_simulations" USING btree ("company_id", "product_sku");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pricing_simulations_company_name_idx" ON "pricing_simulations" USING btree ("company_id", "product_name");
--> statement-breakpoint
ALTER TABLE "pricing_simulations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pricing_simulations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "Members can view own pricing simulations"
ON public.pricing_simulations
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = pricing_simulations.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = pricing_simulations.company_id
      AND c.organization_id = pricing_simulations.organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can insert own pricing simulations"
ON public.pricing_simulations
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = pricing_simulations.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = pricing_simulations.company_id
      AND c.organization_id = pricing_simulations.organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can update own pricing simulations"
ON public.pricing_simulations
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = pricing_simulations.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = pricing_simulations.company_id
      AND c.organization_id = pricing_simulations.organization_id
      AND c.user_id = auth.uid()::text
  )
)
WITH CHECK (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = pricing_simulations.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = pricing_simulations.company_id
      AND c.organization_id = pricing_simulations.organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can delete own pricing simulations"
ON public.pricing_simulations
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = pricing_simulations.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = pricing_simulations.company_id
      AND c.organization_id = pricing_simulations.organization_id
      AND c.user_id = auth.uid()::text
  )
);
