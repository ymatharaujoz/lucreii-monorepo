SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
SET LOCAL statement_timeout = '60s';
--> statement-breakpoint

ALTER TABLE "product_finance_defaults"
  ADD COLUMN IF NOT EXISTS "other_variable_cost_percent" numeric(5, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_finance_defaults"
  ADD COLUMN IF NOT EXISTS "other_variable_cost_amount" numeric(12, 2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_finance_defaults"
  ADD CONSTRAINT "product_finance_defaults_other_variable_cost_percent_range"
  CHECK ("other_variable_cost_percent" >= 0 AND "other_variable_cost_percent" <= 100);
--> statement-breakpoint
ALTER TABLE "product_finance_defaults"
  ADD CONSTRAINT "product_finance_defaults_other_variable_cost_amount_non_negative"
  CHECK ("other_variable_cost_amount" >= 0);
