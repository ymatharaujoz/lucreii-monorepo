/**
 * Client-safe branding: Next.js inlines `NEXT_PUBLIC_*` at build time.
 * Defaults mirror `readPublicEnv` in `@/lib/env`.
 */
export const PUBLIC_BRAND = {
  icon: process.env.NEXT_PUBLIC_APP_ICON ?? "M",
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Lucreii",
  priceMonthlyLabel: process.env.NEXT_PUBLIC_PRICE_MONTHLY_LABEL ?? "R$ 99",
} as const;
