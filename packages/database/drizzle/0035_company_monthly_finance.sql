SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
SET LOCAL statement_timeout = '60s';
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "company_monthly_finance" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "company_id" uuid NOT NULL,
  "reference_month" date NOT NULL,
  "fixed_cost" numeric(12, 2),
  "tax_rate" numeric(8, 6),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "company_monthly_finance_reference_month_first_day" CHECK ("reference_month" = date_trunc('month', "reference_month")::date),
  CONSTRAINT "company_monthly_finance_fixed_cost_non_negative" CHECK ("fixed_cost" IS NULL OR "fixed_cost" >= 0),
  CONSTRAINT "company_monthly_finance_tax_rate_range" CHECK ("tax_rate" IS NULL OR ("tax_rate" >= 0 AND "tax_rate" <= 1)),
  CONSTRAINT "company_monthly_finance_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "company_monthly_finance_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action,
  CONSTRAINT "company_monthly_finance_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_monthly_finance_organization_id_idx" ON "company_monthly_finance" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_monthly_finance_user_id_idx" ON "company_monthly_finance" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_monthly_finance_company_id_idx" ON "company_monthly_finance" USING btree ("company_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "company_monthly_finance_company_month_key" ON "company_monthly_finance" USING btree ("organization_id", "company_id", "reference_month");
--> statement-breakpoint
ALTER TABLE "company_monthly_finance" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "company_monthly_finance" FORCE ROW LEVEL SECURITY;
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
      'REVOKE ALL PRIVILEGES ON TABLE public.company_monthly_finance FROM %I',
      application_role
    );
  END LOOP;
END $$;
