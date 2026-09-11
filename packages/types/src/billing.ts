export const BILLING_INTERVALS = ["monthly"] as const;
export const BILLING_PLAN_CODES = ["start", "essencial", "pro", "business"] as const;

export type BillingInterval = (typeof BILLING_INTERVALS)[number];
export type BillingPlanCode = (typeof BILLING_PLAN_CODES)[number];

export type BillingPlan = {
  cnpjLimit: number;
  cnpjLimitLabel: string;
  code: BillingPlanCode;
  description: string;
  featured?: boolean;
  features: readonly string[];
  monthlyPrice: string;
  monthlySuffix: string;
  name: string;
  ordersLimit: string;
};

/**
 * Catálogo único para todos os planos autoatendíveis. Enterprise é comercial e
 * deliberadamente não possui Price nem código de assinatura Stripe.
 */
export const BILLING_PLANS: readonly BillingPlan[] = [
  {
    cnpjLimit: 1,
    cnpjLimitLabel: "1 CNPJ",
    code: "start",
    description: "O primeiro passo para mais lucro.",
    features: [
      "Dashboard financeiro",
      "Rentabilidade e ROI por produto",
      "Integração com marketplaces",
    ],
    monthlyPrice: "R$ 49,90",
    monthlySuffix: "/mês",
    name: "Start",
    ordersLimit: "Até 200 pedidos/mês",
  },
  {
    cnpjLimit: 1,
    cnpjLimitLabel: "1 CNPJ",
    code: "essencial",
    description: "Mais controle para o seu negócio.",
    features: [
      "Dashboard financeiro",
      "Calculadora de precificação",
      "Integração com marketplaces",
    ],
    monthlyPrice: "R$ 99,90",
    monthlySuffix: "/mês",
    name: "Essencial",
    ordersLimit: "Até 1.000 pedidos/mês",
  },
  {
    cnpjLimit: 3,
    cnpjLimitLabel: "Até 3 CNPJs",
    code: "pro",
    description: "Para quem já vende em maior escala.",
    featured: true,
    features: [
      "Todos os recursos da Lucreii",
      "Até 3 CNPJs vinculados",
      "Suporte por e-mail e WhatsApp",
    ],
    monthlyPrice: "R$ 179,90",
    monthlySuffix: "/mês",
    name: "Pro",
    ordersLimit: "Até 3.500 pedidos/mês",
  },
  {
    cnpjLimit: 5,
    cnpjLimitLabel: "Até 5 CNPJs",
    code: "business",
    description: "Estrutura para ir ainda mais longe.",
    features: [
      "Todos os recursos da Lucreii",
      "Até 5 CNPJs vinculados",
      "Suporte prioritário",
    ],
    monthlyPrice: "R$ 249,90",
    monthlySuffix: "/mês",
    name: "Business",
    ordersLimit: "Até 7.500 pedidos/mês",
  },
] as const;

export const BILLING_PLAN_BY_CODE: Record<BillingPlanCode, BillingPlan> = {
  business: BILLING_PLANS[3],
  essencial: BILLING_PLANS[1],
  pro: BILLING_PLANS[2],
  start: BILLING_PLANS[0],
};

export function isBillingPlanCode(value: string): value is BillingPlanCode {
  return (BILLING_PLAN_CODES as readonly string[]).includes(value);
}

export function getBillingPlan(code: BillingPlanCode): BillingPlan {
  return BILLING_PLAN_BY_CODE[code];
}
