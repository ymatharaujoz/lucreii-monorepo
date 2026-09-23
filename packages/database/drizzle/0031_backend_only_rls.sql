SET LOCAL lock_timeout = '5s';
--> statement-breakpoint
SET LOCAL statement_timeout = '60s';
--> statement-breakpoint

ALTER TABLE "billing_trials" ALTER COLUMN "email" DROP NOT NULL;
--> statement-breakpoint

DO $$
DECLARE
  application_table text;
BEGIN
  FOREACH application_table IN ARRAY ARRAY[
    'ad_costs',
    'account',
    'auth_exchange_ticket',
    'billing_customers',
    'billing_trials',
    'break_even_roas_simulations',
    'companies',
    'daily_metrics',
    'external_fees',
    'external_order_items',
    'external_orders',
    'external_products',
    'fixed_costs',
    'manual_expenses',
    'marketplace_advertising',
    'marketplace_connections',
    'marketplace_webhook_events',
    'mercado_livre_billing_movements',
    'organization_members',
    'organizations',
    'pending_checkouts',
    'product_costs',
    'product_finance_defaults',
    'product_images',
    'product_metrics',
    'product_monthly_performance',
    'products',
    'pricing_simulations',
    'session',
    'subscription_events',
    'subscriptions',
    'sync_runs',
    'user',
    'verification'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', application_table);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', application_table);
  END LOOP;
END $$;
--> statement-breakpoint

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'ad_costs',
        'account',
        'auth_exchange_ticket',
        'billing_customers',
        'billing_trials',
        'break_even_roas_simulations',
        'companies',
        'daily_metrics',
        'external_fees',
        'external_order_items',
        'external_orders',
        'external_products',
        'fixed_costs',
        'manual_expenses',
        'marketplace_advertising',
        'marketplace_connections',
        'marketplace_webhook_events',
        'mercado_livre_billing_movements',
        'organization_members',
        'organizations',
        'pending_checkouts',
        'product_costs',
        'product_finance_defaults',
        'product_images',
        'product_metrics',
        'product_monthly_performance',
        'products',
        'pricing_simulations',
        'session',
        'subscription_events',
        'subscriptions',
        'sync_runs',
        'user',
        'verification'
      ])
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  END LOOP;
END $$;
--> statement-breakpoint

DO $$
DECLARE
  application_table text;
  application_role text;
BEGIN
  FOR application_role IN
    SELECT rolname
    FROM pg_roles
    WHERE rolname IN ('anon', 'authenticated')
  LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON SCHEMA public FROM %I', application_role);

    FOREACH application_table IN ARRAY ARRAY[
      'ad_costs',
      'account',
      'auth_exchange_ticket',
      'billing_customers',
      'billing_trials',
      'break_even_roas_simulations',
      'companies',
      'daily_metrics',
      'external_fees',
      'external_order_items',
      'external_orders',
      'external_products',
      'fixed_costs',
      'manual_expenses',
      'marketplace_advertising',
      'marketplace_connections',
      'marketplace_webhook_events',
      'mercado_livre_billing_movements',
      'organization_members',
      'organizations',
      'pending_checkouts',
      'product_costs',
      'product_finance_defaults',
      'product_images',
      'product_metrics',
      'product_monthly_performance',
      'products',
      'pricing_simulations',
      'session',
      'subscription_events',
      'subscriptions',
      'sync_runs',
      'user',
      'verification'
    ]
    LOOP
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I',
        application_table,
        application_role
      );
    END LOOP;
  END LOOP;
END $$;
--> statement-breakpoint

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
