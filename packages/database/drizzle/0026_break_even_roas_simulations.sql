CREATE TABLE IF NOT EXISTS "break_even_roas_simulations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "company_id" uuid NOT NULL,
  "product_identifier" varchar(255) NOT NULL,
  "contribution_margin_rate" numeric(8, 6) NOT NULL,
  "break_even_roas" numeric(14, 6) NOT NULL,
  "calculation_version" varchar(32) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "break_even_roas_simulations_identifier_present" CHECK (nullif(trim("break_even_roas_simulations"."product_identifier"), '') is not null),
  CONSTRAINT "break_even_roas_simulations_margin_range" CHECK ("break_even_roas_simulations"."contribution_margin_rate" > 0 and "break_even_roas_simulations"."contribution_margin_rate" <= 1),
  CONSTRAINT "break_even_roas_simulations_roas_positive" CHECK ("break_even_roas_simulations"."break_even_roas" > 0),
  CONSTRAINT "break_even_roas_simulations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "break_even_roas_simulations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "break_even_roas_simulations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "break_even_roas_simulations_organization_id_idx" ON "break_even_roas_simulations" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "break_even_roas_simulations_user_id_idx" ON "break_even_roas_simulations" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "break_even_roas_simulations_company_created_idx" ON "break_even_roas_simulations" USING btree ("company_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "break_even_roas_simulations_company_identifier_idx" ON "break_even_roas_simulations" USING btree ("company_id", "product_identifier");
--> statement-breakpoint
ALTER TABLE "break_even_roas_simulations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "break_even_roas_simulations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "Members can view own break-even ROAS simulations"
ON public.break_even_roas_simulations
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = break_even_roas_simulations.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = break_even_roas_simulations.company_id
      AND c.organization_id = break_even_roas_simulations.organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can insert own break-even ROAS simulations"
ON public.break_even_roas_simulations
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = break_even_roas_simulations.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = break_even_roas_simulations.company_id
      AND c.organization_id = break_even_roas_simulations.organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can update own break-even ROAS simulations"
ON public.break_even_roas_simulations
FOR UPDATE
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = break_even_roas_simulations.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = break_even_roas_simulations.company_id
      AND c.organization_id = break_even_roas_simulations.organization_id
      AND c.user_id = auth.uid()::text
  )
)
WITH CHECK (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = break_even_roas_simulations.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = break_even_roas_simulations.company_id
      AND c.organization_id = break_even_roas_simulations.organization_id
      AND c.user_id = auth.uid()::text
  )
);
--> statement-breakpoint
CREATE POLICY "Members can delete own break-even ROAS simulations"
ON public.break_even_roas_simulations
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()::text
  AND EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = break_even_roas_simulations.organization_id
      AND om.user_id = auth.uid()::text
  )
  AND EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = break_even_roas_simulations.company_id
      AND c.organization_id = break_even_roas_simulations.organization_id
      AND c.user_id = auth.uid()::text
  )
);
