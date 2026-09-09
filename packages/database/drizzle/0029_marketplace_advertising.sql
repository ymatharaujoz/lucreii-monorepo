CREATE TABLE IF NOT EXISTS "marketplace_advertising" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "company_id" uuid NOT NULL,
  "provider" varchar(32) NOT NULL,
  "reference_month" date NOT NULL,
  "amount" numeric(14, 2) DEFAULT '0' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "marketplace_advertising_provider_valid" CHECK ("provider" in ('mercadolivre', 'shopee', 'shein')),
  CONSTRAINT "marketplace_advertising_reference_month_first_day" CHECK ("reference_month" = date_trunc('month', "reference_month")::date),
  CONSTRAINT "marketplace_advertising_amount_non_negative" CHECK ("amount" >= 0),
  CONSTRAINT "marketplace_advertising_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "marketplace_advertising_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "marketplace_advertising_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketplace_advertising_organization_id_idx" ON "marketplace_advertising" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketplace_advertising_user_id_idx" ON "marketplace_advertising" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketplace_advertising_company_id_idx" ON "marketplace_advertising" USING btree ("company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_advertising_company_provider_month_key" ON "marketplace_advertising" USING btree ("organization_id", "company_id", "provider", "reference_month");
--> statement-breakpoint
ALTER TABLE "marketplace_advertising" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "marketplace_advertising" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "Members can view own marketplace advertising"
ON public.marketplace_advertising
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = marketplace_advertising.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = marketplace_advertising.company_id
      AND c.organization_id = marketplace_advertising.organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can insert own marketplace advertising"
ON public.marketplace_advertising
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = marketplace_advertising.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = marketplace_advertising.company_id
      AND c.organization_id = marketplace_advertising.organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can update own marketplace advertising"
ON public.marketplace_advertising
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = marketplace_advertising.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = marketplace_advertising.company_id
      AND c.organization_id = marketplace_advertising.organization_id
      AND c.user_id = auth.uid()::text
  )
)
WITH CHECK (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = marketplace_advertising.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = marketplace_advertising.company_id
      AND c.organization_id = marketplace_advertising.organization_id
      AND c.user_id = auth.uid()::text
  )
);
