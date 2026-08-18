"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  Calculator,
  CircleHelp,
  Percent,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Badge, Button, cn } from "@lucreii/ui";
import { containerVariants, itemVariants } from "@/lib/animations";
import {
  calculatePricing,
  type PricingError,
  type PricingField,
  type PricingInputs,
  type PricingMode,
} from "../calculations/pricing-calculations";

type FormValues = Record<PricingField, string>;

type FieldKind = "currency" | "percent";

type FieldConfig = {
  field: Exclude<PricingField, "target">;
  label: string;
  kind: FieldKind;
  placeholder: string;
};

type PricingCalculatorProps = {
  mode: PricingMode;
};

type ComputationState =
  | { status: "empty" }
  | { status: "invalid"; errors: PricingError[] }
  | {
      status: "ready";
      result: Extract<
        ReturnType<typeof calculatePricing>,
        { ok: true }
      >["result"];
    };

const EMPTY_FORM: FormValues = {
  target: "",
  productCost: "",
  packagingCost: "",
  shippingFee: "",
  otherFixedCosts: "",
  marketplaceCommissionRate: "",
  taxRate: "",
  affiliateCommissionRate: "",
  storeCouponRate: "",
  otherVariableCostRate: "",
};

const COST_FIELDS: FieldConfig[] = [
  {
    field: "productCost",
    label: "Custo produto",
    kind: "currency",
    placeholder: "0,00",
  },
  {
    field: "packagingCost",
    label: "Embalagem",
    kind: "currency",
    placeholder: "0,00",
  },
  {
    field: "shippingFee",
    label: "Taxa / frete",
    kind: "currency",
    placeholder: "0,00",
  },
  {
    field: "otherFixedCosts",
    label: "Outros custos R$",
    kind: "currency",
    placeholder: "0,00",
  },
];

const RATE_FIELDS: FieldConfig[] = [
  {
    field: "marketplaceCommissionRate",
    label: "Comissão marketplace",
    kind: "percent",
    placeholder: "0,00",
  },
  { field: "taxRate", label: "Imposto", kind: "percent", placeholder: "0,00" },
  {
    field: "affiliateCommissionRate",
    label: "Comissão afiliado",
    kind: "percent",
    placeholder: "0,00",
  },
  {
    field: "storeCouponRate",
    label: "Cupom loja",
    kind: "percent",
    placeholder: "0,00",
  },
  {
    field: "otherVariableCostRate",
    label: "Outros custos %",
    kind: "percent",
    placeholder: "0,00",
  },
];

const MODE_CONFIG: Record<
  PricingMode,
  {
    eyebrow: string;
    title: string;
    description: string;
    targetLabel: string;
    targetKind: FieldKind;
    targetPlaceholder: string;
    targetHelper: string;
    resultLabel: string;
  }
> = {
  "contribution-margin": {
    eyebrow: "Margem de contribuição",
    title: "Defina sua margem. Encontre seu preço.",
    description:
      "Informe a margem desejada e os custos da venda para calcular o preço recomendado.",
    targetLabel: "Margem de contribuição alvo",
    targetKind: "percent",
    targetPlaceholder: "36,00",
    targetHelper: "Percentual que deve permanecer após custos fixos e taxas.",
    resultLabel: "Preço de Venda Recomendado",
  },
  "desired-profit": {
    eyebrow: "Lucro desejado",
    title: "Transforme seu objetivo em preço.",
    description:
      "Parta do lucro que deseja obter e simule o preço necessário para alcançá-lo.",
    targetLabel: "Lucro desejado",
    targetKind: "currency",
    targetPlaceholder: "9,91",
    targetHelper: "Valor líquido que você deseja preservar em cada venda.",
    resultLabel: "Preço de Venda Recomendado",
  },
  "sale-price": {
    eyebrow: "Preço de venda",
    title: "Teste o preço que você pratica.",
    description:
      "Informe um preço de venda e veja instantaneamente sua margem e lucro bruto.",
    targetLabel: "Preço de venda",
    targetKind: "currency",
    targetPlaceholder: "27,54",
    targetHelper: "Preço informado para análise do cenário.",
    resultLabel: "Preço de Venda Informado",
  },
};

function parseLocalizedNumber(value: string): number | null {
  const cleaned = value
    .trim()
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "");

  if (!cleaned || cleaned === "-" || cleaned === "," || cleaned === ".") {
    return null;
  }

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSeparator = lastComma > lastDot ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    normalized = cleaned
      .split(thousandsSeparator)
      .join("")
      .replace(decimalSeparator, ".");
  } else if (lastComma >= 0) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatEditableValue(value: string, kind: FieldKind) {
  const parsed = parseLocalizedNumber(value);

  if (parsed === null) {
    return value;
  }

  return parsed.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: kind === "currency" ? 2 : 2,
  });
}

function formatMoney(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "percent",
  }).format(value);
}

function getFieldError(errors: PricingError[], field: PricingField) {
  return errors.find((error) => error.field === field)?.message;
}

function NumericField({
  error,
  helper,
  id,
  kind,
  label,
  onBlur,
  onChange,
  placeholder,
  value,
}: {
  error?: string;
  helper?: string;
  id: string;
  kind: FieldKind;
  label: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const prefix = kind === "currency" ? "R$" : undefined;
  const suffix = kind === "percent" ? "%" : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label
        className="text-[12px] font-semibold tracking-tight text-foreground"
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-medium text-muted-foreground">
            {prefix}
          </span>
        )}
        <input
          aria-describedby={helper || error ? `${id}-hint` : undefined}
          aria-invalid={Boolean(error)}
          className={cn(
            "h-11 w-full rounded-[var(--radius-md)] border bg-surface-strong text-sm font-medium tabular-nums text-foreground outline-none transition-all duration-[var(--transition-fast)] placeholder:text-muted",
            prefix ? "pl-10" : "pl-3.5",
            suffix ? "pr-9" : "pr-3.5",
            error
              ? "border-error focus:border-error focus:ring-4 focus:ring-error/10"
              : "border-border hover:border-border-strong focus:border-border-focus focus:ring-4 focus:ring-accent/10",
          )}
          id={id}
          inputMode="decimal"
          onBlur={onBlur}
          onChange={(event) =>
            onChange(event.target.value.replace(/[^\d,.-]/g, ""))
          }
          placeholder={placeholder}
          type="text"
          value={value}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {(helper || error) && (
        <p
          className={cn(
            "text-[11px] leading-relaxed",
            error ? "text-error" : "text-muted-foreground",
          )}
          id={`${id}-hint`}
        >
          {error || helper}
        </p>
      )}
    </div>
  );
}

function ResultMetric({
  label,
  negative,
  value,
}: {
  label: string;
  negative?: boolean;
  value: string;
}) {
  return (
    <motion.div
      layout
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "rounded-[var(--radius-lg)] border p-4 transition-colors",
        negative
          ? "border-error/20 bg-error-soft/40"
          : "border-border/60 bg-surface/70",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-xl font-bold tracking-tight tabular-nums",
          negative ? "text-error" : "text-foreground",
        )}
      >
        {value}
      </p>
    </motion.div>
  );
}

function PricingResultPanel({
  computation,
  mode,
  resultLabel,
}: {
  computation: ComputationState;
  mode: PricingMode;
  resultLabel: string;
}) {
  const result = computation.status === "ready" ? computation.result : null;
  const isSalePriceMode = mode === "sale-price";

  return (
    <motion.aside
      variants={itemVariants}
      className="order-first lg:order-last lg:sticky lg:top-6 lg:self-start"
    >
      <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-accent/20 bg-surface-strong/80 p-5 shadow-[var(--shadow-card)] backdrop-blur-xl sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-accent">
                <Sparkles className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em]">
                  Resultado principal
                </span>
              </div>
              <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
                {resultLabel}
              </h2>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/15">
              <Wallet className="h-4 w-4" />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {computation.status === "ready" && result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6"
              >
                <p className="text-4xl font-bold tracking-[-0.05em] text-accent sm:text-[42px]">
                  {formatMoney(result.recommendedSalePrice)}
                </p>
                <p className="mt-2 max-w-[28ch] text-xs leading-relaxed text-muted-foreground">
                  {isSalePriceMode
                    ? "Preço informado para análise do cenário atual."
                    : "Preço calculado para sustentar seu objetivo de margem ou lucro."}
                </p>
              </motion.div>
            ) : computation.status === "invalid" ? (
              <motion.div
                key="invalid"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 rounded-[var(--radius-lg)] border border-error/20 bg-error-soft/50 p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                  <div>
                    <p className="text-sm font-semibold text-error">
                      Revise os dados
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-error/80">
                      {computation.errors[0]?.message ??
                        "Não foi possível calcular este cenário."}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-6 rounded-[var(--radius-lg)] border border-dashed border-border-strong bg-background/30 p-5"
              >
                <Calculator className="h-5 w-5 text-muted-foreground" />
                <p className="mt-4 text-sm font-semibold text-foreground">
                  Pronto para simular
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Preencha o objetivo e os custos para ver o preço calculado
                  aqui.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <ResultMetric
              label="Margem de contribuição"
              negative={result ? result.contributionMargin < 0 : false}
              value={result ? formatPercent(result.contributionMargin) : "—"}
            />
            <ResultMetric
              label="Lucro bruto"
              negative={result ? result.grossProfit < 0 : false}
              value={result ? formatMoney(result.grossProfit) : "—"}
            />
          </div>

          {result && (
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4 text-xs">
              <span className="text-muted-foreground">Custos fixos</span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatMoney(result.fixedCosts)}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

export function PricingCalculator({ mode }: PricingCalculatorProps) {
  const config = MODE_CONFIG[mode];
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const reducedMotion = useReducedMotion();

  const computation = useMemo<ComputationState>(() => {
    const target = parseLocalizedNumber(form.target);

    if (target === null) {
      return { status: "empty" };
    }

    const rawFields = [...COST_FIELDS, ...RATE_FIELDS];
    const parsingErrors: PricingError[] = rawFields.flatMap(({ field }) => {
      if (!form[field].trim() || parseLocalizedNumber(form[field]) !== null) {
        return [];
      }

      return [
        {
          code: "invalid-number" as const,
          field,
          message: "Informe um número válido.",
        },
      ];
    });

    if (parsingErrors.length > 0) {
      return { errors: parsingErrors, status: "invalid" };
    }

    const numericValue = (field: PricingField) =>
      parseLocalizedNumber(form[field]) ?? 0;
    const inputs: PricingInputs = {
      affiliateCommissionRate: numericValue("affiliateCommissionRate") / 100,
      marketplaceCommissionRate:
        numericValue("marketplaceCommissionRate") / 100,
      otherFixedCosts: numericValue("otherFixedCosts"),
      otherVariableCostRate: numericValue("otherVariableCostRate") / 100,
      packagingCost: numericValue("packagingCost"),
      productCost: numericValue("productCost"),
      shippingFee: numericValue("shippingFee"),
      storeCouponRate: numericValue("storeCouponRate") / 100,
      target: config.targetKind === "percent" ? target / 100 : target,
      taxRate: numericValue("taxRate") / 100,
    };
    const calculation = calculatePricing(mode, inputs);

    return calculation.ok
      ? { result: calculation.result, status: "ready" }
      : { errors: calculation.errors, status: "invalid" };
  }, [config.targetKind, form, mode]);

  function updateField(field: PricingField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function blurField(field: PricingField, kind: FieldKind) {
    setForm((current) => ({
      ...current,
      [field]: formatEditableValue(current[field], kind),
    }));
  }

  return (
    <motion.div
      className="space-y-8 pb-8"
      initial={reducedMotion ? false : "hidden"}
      animate="visible"
      variants={containerVariants}
    >
      <motion.header
        variants={itemVariants}
        className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
            <Calculator className="h-4 w-4" />
            <span>Precificação</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-muted-foreground">{config.eyebrow}</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            {config.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {config.description}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge className="border-accent/15 bg-accent-soft text-accent-strong">
            <ShieldCheck className="h-3 w-3" />
            Não salvo
          </Badge>
          <Button
            aria-label="Limpar calculadora"
            onClick={() => setForm(EMPTY_FORM)}
            size="sm"
            variant="secondary"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Limpar
          </Button>
        </div>
      </motion.header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:gap-8">
        <motion.div variants={itemVariants} className="space-y-5">
          <section className="rounded-[var(--radius-xl)] border border-border/70 bg-surface-strong/70 p-5 shadow-[var(--shadow-sm)] sm:p-7">
            <div className="flex items-start gap-3 border-b border-border/60 pb-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/15">
                {config.targetKind === "percent" ? (
                  <Percent className="h-4 w-4" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                  Objetivo do cenário
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  Comece pelo número que importa
                </h2>
              </div>
            </div>
            <div className="mt-5 max-w-md">
              <NumericField
                error={getFieldError(
                  computation.status === "invalid" ? computation.errors : [],
                  "target",
                )}
                helper={config.targetHelper}
                id={`${mode}-target`}
                kind={config.targetKind}
                label={config.targetLabel}
                onBlur={() => blurField("target", config.targetKind)}
                onChange={(value) => updateField("target", value)}
                placeholder={config.targetPlaceholder}
                value={form.target}
              />
            </div>
          </section>

          <section className="rounded-[var(--radius-xl)] border border-border/70 bg-surface-strong/70 p-5 shadow-[var(--shadow-sm)] sm:p-7">
            <div className="flex items-start gap-3 border-b border-border/60 pb-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.05] text-muted-foreground ring-1 ring-border">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Custos em reais
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  Composição fixa da venda
                </h2>
              </div>
              <CircleHelp className="ml-auto mt-1 h-4 w-4 text-muted-foreground/60" />
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {COST_FIELDS.map((field) => (
                <NumericField
                  key={field.field}
                  error={getFieldError(
                    computation.status === "invalid" ? computation.errors : [],
                    field.field,
                  )}
                  id={`${mode}-${field.field}`}
                  kind={field.kind}
                  label={field.label}
                  onBlur={() => blurField(field.field, field.kind)}
                  onChange={(value) => updateField(field.field, value)}
                  placeholder={field.placeholder}
                  value={form[field.field]}
                />
              ))}
            </div>
          </section>

          <section className="rounded-[var(--radius-xl)] border border-border/70 bg-surface-strong/70 p-5 shadow-[var(--shadow-sm)] sm:p-7">
            <div className="flex items-start gap-3 border-b border-border/60 pb-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.05] text-muted-foreground ring-1 ring-border">
                <Percent className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Percentuais sobre venda
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  Taxas e descontos
                </h2>
              </div>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {RATE_FIELDS.map((field) => (
                <NumericField
                  key={field.field}
                  error={getFieldError(
                    computation.status === "invalid" ? computation.errors : [],
                    field.field,
                  )}
                  id={`${mode}-${field.field}`}
                  kind={field.kind}
                  label={field.label}
                  onBlur={() => blurField(field.field, field.kind)}
                  onChange={(value) => updateField(field.field, value)}
                  placeholder={field.placeholder}
                  value={form[field.field]}
                />
              ))}
            </div>
          </section>

          <motion.div
            variants={itemVariants}
            className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-accent/15 bg-accent-soft/30 px-4 py-3.5 text-xs text-muted-foreground"
          >
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p>
              Esta simulação acontece somente nesta tela. Seus valores não são
              enviados nem gravados na base de dados.
            </p>
          </motion.div>
        </motion.div>

        <PricingResultPanel
          computation={computation}
          mode={mode}
          resultLabel={config.resultLabel}
        />
      </div>
    </motion.div>
  );
}
