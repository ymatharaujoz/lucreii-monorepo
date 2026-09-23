/**
 * Public application tables owned by this service. Keep this explicit so the
 * hardening workflow never changes unrelated Supabase-managed objects.
 */
export const APPLICATION_TABLE_NAMES = [
  "ad_costs",
  "account",
  "auth_exchange_ticket",
  "billing_customers",
  "billing_trials",
  "break_even_roas_simulations",
  "companies",
  "daily_metrics",
  "external_fees",
  "external_order_items",
  "external_orders",
  "external_products",
  "fixed_costs",
  "manual_expenses",
  "marketplace_advertising",
  "marketplace_connections",
  "marketplace_webhook_events",
  "mercado_livre_billing_movements",
  "organization_members",
  "organizations",
  "pending_checkouts",
  "product_costs",
  "product_finance_defaults",
  "product_images",
  "product_metrics",
  "product_monthly_performance",
  "products",
  "pricing_simulations",
  "session",
  "subscription_events",
  "subscriptions",
  "sync_runs",
  "user",
  "verification",
] as const;

export type OnlineIndexDefinition = {
  name: string;
  statement: string;
  tableName: (typeof APPLICATION_TABLE_NAMES)[number];
};

/**
 * These indexes deliberately live outside Drizzle migrations because PostgreSQL
 * forbids CREATE INDEX CONCURRENTLY inside the transaction used by the migrator.
 */
export const ONLINE_INDEXES: readonly OnlineIndexDefinition[] = [
  {
    name: "external_orders_org_company_ordered_created_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS external_orders_org_company_ordered_created_idx ON public.external_orders (organization_id, company_id, ordered_at DESC, created_at DESC)",
    tableName: "external_orders",
  },
  {
    name: "external_orders_org_company_provider_ordered_created_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS external_orders_org_company_provider_ordered_created_idx ON public.external_orders (organization_id, company_id, provider, ordered_at DESC, created_at DESC)",
    tableName: "external_orders",
  },
  {
    name: "external_order_items_external_order_id_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS external_order_items_external_order_id_idx ON public.external_order_items (external_order_id)",
    tableName: "external_order_items",
  },
  {
    name: "external_order_items_org_external_product_order_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS external_order_items_org_external_product_order_idx ON public.external_order_items (organization_id, external_product_id, external_order_id)",
    tableName: "external_order_items",
  },
  {
    name: "external_fees_external_order_id_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS external_fees_external_order_id_idx ON public.external_fees (external_order_id)",
    tableName: "external_fees",
  },
  {
    name: "external_fees_org_external_order_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS external_fees_org_external_order_idx ON public.external_fees (organization_id, external_order_id)",
    tableName: "external_fees",
  },
  {
    name: "products_org_company_created_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS products_org_company_created_idx ON public.products (organization_id, company_id, created_at DESC)",
    tableName: "products",
  },
  {
    name: "product_costs_product_effective_created_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS product_costs_product_effective_created_idx ON public.product_costs (product_id, effective_from DESC, created_at DESC)",
    tableName: "product_costs",
  },
  {
    name: "product_costs_org_company_effective_created_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS product_costs_org_company_effective_created_idx ON public.product_costs (organization_id, company_id, effective_from DESC, created_at DESC)",
    tableName: "product_costs",
  },
  {
    name: "external_products_org_company_provider_updated_created_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS external_products_org_company_provider_updated_created_idx ON public.external_products (organization_id, company_id, provider, updated_at DESC, created_at DESC)",
    tableName: "external_products",
  },
  {
    name: "ad_costs_org_company_spent_created_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS ad_costs_org_company_spent_created_idx ON public.ad_costs (organization_id, company_id, spent_at DESC, created_at DESC)",
    tableName: "ad_costs",
  },
  {
    name: "ad_costs_org_company_channel_spent_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS ad_costs_org_company_channel_spent_idx ON public.ad_costs (organization_id, company_id, channel, spent_at DESC, created_at DESC)",
    tableName: "ad_costs",
  },
  {
    name: "manual_expenses_org_company_incurred_created_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS manual_expenses_org_company_incurred_created_idx ON public.manual_expenses (organization_id, company_id, incurred_at DESC, created_at DESC)",
    tableName: "manual_expenses",
  },
  {
    name: "marketplace_advertising_scope_month_provider_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS marketplace_advertising_scope_month_provider_idx ON public.marketplace_advertising (organization_id, user_id, company_id, reference_month DESC, provider)",
    tableName: "marketplace_advertising",
  },
  {
    name: "organization_members_default_user_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS organization_members_default_user_idx ON public.organization_members (user_id) WHERE is_default",
    tableName: "organization_members",
  },
  {
    name: "fixed_costs_scope_month_name_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS fixed_costs_scope_month_name_idx ON public.fixed_costs (organization_id, user_id, company_id, reference_month, name)",
    tableName: "fixed_costs",
  },
  {
    name: "product_monthly_performance_scope_month_channel_sku_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS product_monthly_performance_scope_month_channel_sku_idx ON public.product_monthly_performance (organization_id, user_id, company_id, reference_month DESC, channel, sku)",
    tableName: "product_monthly_performance",
  },
  {
    name: "pricing_simulations_scope_updated_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS pricing_simulations_scope_updated_idx ON public.pricing_simulations (organization_id, user_id, company_id, updated_at DESC)",
    tableName: "pricing_simulations",
  },
  {
    name: "break_even_roas_simulations_scope_updated_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS break_even_roas_simulations_scope_updated_idx ON public.break_even_roas_simulations (organization_id, user_id, company_id, updated_at DESC)",
    tableName: "break_even_roas_simulations",
  },
  {
    name: "sync_runs_completed_cursor_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS sync_runs_completed_cursor_idx ON public.sync_runs (organization_id, company_id, provider, created_at DESC) WHERE status = 'completed'",
    tableName: "sync_runs",
  },
  {
    name: "billing_customers_org_provider_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS billing_customers_org_provider_idx ON public.billing_customers (organization_id, provider)",
    tableName: "billing_customers",
  },
  {
    name: "subscriptions_org_provider_updated_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS subscriptions_org_provider_updated_idx ON public.subscriptions (organization_id, provider, updated_at DESC) WHERE external_subscription_id IS NOT NULL",
    tableName: "subscriptions",
  },
  {
    name: "pending_checkouts_stripe_customer_updated_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS pending_checkouts_stripe_customer_updated_idx ON public.pending_checkouts (stripe_customer_id, updated_at DESC) WHERE stripe_customer_id IS NOT NULL",
    tableName: "pending_checkouts",
  },
  {
    name: "pending_checkouts_stripe_subscription_updated_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS pending_checkouts_stripe_subscription_updated_idx ON public.pending_checkouts (stripe_subscription_id, updated_at DESC) WHERE stripe_subscription_id IS NOT NULL",
    tableName: "pending_checkouts",
  },
  {
    name: "external_orders_external_order_id_trgm_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS external_orders_external_order_id_trgm_idx ON public.external_orders USING gin (external_order_id gin_trgm_ops)",
    tableName: "external_orders",
  },
  {
    name: "external_orders_operation_id_trgm_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS external_orders_operation_id_trgm_idx ON public.external_orders USING gin ((coalesce(metadata ->> 'operationId', '')) gin_trgm_ops)",
    tableName: "external_orders",
  },
  {
    name: "external_orders_pack_id_trgm_idx",
    statement:
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS external_orders_pack_id_trgm_idx ON public.external_orders USING gin ((coalesce(metadata ->> 'packId', '')) gin_trgm_ops)",
    tableName: "external_orders",
  },
] as const;
