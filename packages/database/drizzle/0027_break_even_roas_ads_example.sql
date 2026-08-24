ALTER TABLE "break_even_roas_simulations"
  ADD COLUMN IF NOT EXISTS "ads_investment" numeric(18, 6),
  ADD COLUMN IF NOT EXISTS "ads_roas" numeric(18, 6),
  ADD COLUMN IF NOT EXISTS "ads_attributed_revenue" numeric(18, 6);
--> statement-breakpoint
ALTER TABLE "break_even_roas_simulations"
  ADD CONSTRAINT "break_even_roas_simulations_ads_investment_non_negative"
    CHECK ("ads_investment" IS NULL OR "ads_investment" >= 0),
  ADD CONSTRAINT "break_even_roas_simulations_ads_roas_non_negative"
    CHECK ("ads_roas" IS NULL OR "ads_roas" >= 0),
  ADD CONSTRAINT "break_even_roas_simulations_ads_revenue_non_negative"
    CHECK ("ads_attributed_revenue" IS NULL OR "ads_attributed_revenue" >= 0);
