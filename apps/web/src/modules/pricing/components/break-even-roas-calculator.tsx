"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  Megaphone,
  Percent,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Badge, cn } from "@lucreii/ui";
import { containerVariants, itemVariants } from "@/lib/animations";

type CalculationState =
  | { status: "empty"; message: string }
  | { status: "invalid"; message: string }
  | { status: "ready"; result: number };

type NumericFieldProps = {
  error?: string;
  helper: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  suffix?: string;
  value: string;
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

export function calculateBreakEvenRoas(
  marginPercentage: number,
): number | null {
  if (
    !Number.isFinite(marginPercentage) ||
    marginPercentage <= 0 ||
    marginPercentage > 100
  ) {
    return null;
  }

  return 1 / (marginPercentage / 100);
}

function formatRoas(value: number) {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function NumericField({
  error,
  helper,
  id,
  label,
  onChange,
  placeholder,
  suffix,
  value,
}: NumericFieldProps) {
  return (
    <div className="space-y-2">
      <label
        className="block text-xs font-semibold text-foreground"
        htmlFor={id}
      >
        {label}
      </label>
      <div
        className={cn(
          "flex h-12 items-center rounded-xl border bg-surface px-3 transition-all duration-[var(--transition-fast)]",
          "border-border hover:border-border-strong focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10",
          error &&
            "border-error/50 focus-within:border-error focus-within:ring-error/10",
        )}
      >
        <input
          aria-describedby={`${id}-helper`}
          aria-invalid={Boolean(error)}
          className="min-w-0 flex-1 bg-transparent text-sm font-medium tabular-nums text-foreground outline-none placeholder:text-muted-foreground/55"
          id={id}
          inputMode="decimal"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type="text"
          value={value}
        />
        {suffix && (
          <span className="ml-3 text-xs font-semibold text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      <p
        className={cn(
          "text-[11px] leading-relaxed",
          error ? "text-error" : "text-muted-foreground",
        )}
        id={`${id}-helper`}
      >
        {error ?? helper}
      </p>
    </div>
  );
}

export function BreakEvenRoasCalculator() {
  const [percentage, setPercentage] = useState("");
  const reducedMotion = useReducedMotion();

  const calculation = useMemo<CalculationState>(() => {
    const parsedPercentage = parseLocalizedNumber(percentage);

    if (!percentage.trim()) {
      return {
        message: "Informe a Margem de Contribuição (%) para calcular o ROAS.",
        status: "empty",
      };
    }

    if (parsedPercentage === null) {
      return {
        message: "Informe uma Margem de Contribuição válida.",
        status: "invalid",
      };
    }

    if (parsedPercentage <= 0 || parsedPercentage > 100) {
      return {
        message: "A Margem de Contribuição deve estar entre 0,01% e 100%.",
        status: "invalid",
      };
    }

    const result = calculateBreakEvenRoas(parsedPercentage);

    return result === null
      ? {
          message: "Revise os valores informados para calcular o ROAS.",
          status: "invalid",
        }
      : { result, status: "ready" };
  }, [percentage]);

  const parsedPercentage = parseLocalizedNumber(percentage);

  return (
    <motion.div
      animate="visible"
      className="space-y-8 pb-8"
      initial={reducedMotion ? false : "hidden"}
      variants={containerVariants}
    >
      <motion.header
        className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
        variants={itemVariants}
      >
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
            <Calculator className="h-4 w-4" />
            <span>Calculadora</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="text-muted-foreground">ROAS de Equilíbrio</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Encontre o ROAS que protege sua margem.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Descubra o retorno mínimo que sua publicidade precisa gerar para que
            o investimento em ADS não consuma toda a margem do produto.
          </p>
        </div>
        <Badge className="self-start border-accent/15 bg-accent-soft text-accent-strong sm:self-auto">
          <Sparkles className="h-3 w-3" />
          Cálculo instantâneo
        </Badge>
      </motion.header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] lg:gap-8">
        <motion.div className="space-y-5" variants={itemVariants}>
          <section className="rounded-[var(--radius-xl)] border border-accent/15 bg-accent-soft/20 p-5 shadow-[var(--shadow-xs)] sm:p-7">
            <div className="flex items-start gap-3 border-b border-accent/15 pb-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/15">
                <Percent className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                  Base do cálculo
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  Configure sua margem de contribuição
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Informe a margem que deseja preservar após custos e
                  publicidade.
                </p>
              </div>
            </div>

            <div className="mt-5 max-w-md">
              <NumericField
                error={
                  calculation.status === "invalid" &&
                  (parsedPercentage === null ||
                    parsedPercentage <= 0 ||
                    parsedPercentage > 100)
                    ? calculation.message
                    : undefined
                }
                helper="Margem percentual usada como base do cálculo do ROAS."
                id="break-even-roas-percentage"
                label="Margem de Contribuição (%)"
                onChange={setPercentage}
                placeholder="Ex.: 15"
                suffix="%"
                value={percentage}
              />
            </div>
          </section>

          <section className="rounded-[var(--radius-xl)] border border-border/70 bg-surface-strong/70 p-5 shadow-[var(--shadow-sm)] sm:p-7">
            <div className="flex items-start gap-3 border-b border-border/60 pb-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground/[0.05] text-muted-foreground ring-1 ring-border">
                <Megaphone className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Leitura do resultado
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  O que é o ROAS de Equilíbrio?
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <p className="text-sm leading-7 text-muted-foreground">
                É o ROAS mínimo necessário para que o investimento em
                publicidade não consuma toda a margem do produto.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-error/15 bg-error-soft/30 p-4">
                  <ArrowDownRight className="h-4 w-4 text-error" />
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    Abaixo dele: Prejuízo com ADS.
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    O investimento em publicidade supera o retorno que sua
                    margem consegue absorver.
                  </p>
                </div>
                <div className="rounded-2xl border border-success/15 bg-success-soft/30 p-4">
                  <ArrowUpRight className="h-4 w-4 text-success" />
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    Acima dele: o produto gera lucro após o investimento em Ads.
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Cada ponto acima do equilíbrio cria espaço para preservar
                    resultado depois da mídia.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-accent/15 bg-accent-soft/30 p-5">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Exemplo prático
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <ExampleMetric
                    label="Investimento em Ads"
                    value="R$ 289,00"
                  />
                  <ExampleMetric label="ROAS" value="3x" />
                  <ExampleMetric
                    label="Faturamento atribuído aos Ads"
                    value="R$ 867,00"
                  />
                </div>
                <p className="mt-4 border-t border-accent/15 pt-4 text-xs leading-relaxed text-muted-foreground">
                  R$ 289,00 investidos em ADS com ROAS de 3x geram R$ 867,00 em
                  faturamento atribuído à publicidade.
                </p>
              </div>
            </div>
          </section>
        </motion.div>

        <motion.section
          className="rounded-[var(--radius-xl)] border border-accent/20 bg-accent-soft/30 p-5 shadow-[var(--shadow-md)] sm:p-7 lg:sticky lg:top-6"
          variants={itemVariants}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                Resultado principal
              </p>
              <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                ROAS de Equilíbrio
              </h2>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/15">
              <Wallet className="h-4 w-4" />
            </div>
          </div>

          <AnimatePresence initial={false} mode="wait">
            {calculation.status === "ready" ? (
              <motion.div
                aria-live="polite"
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                key="ready"
                transition={{ duration: reducedMotion ? 0 : 0.22 }}
              >
                <p className="text-5xl font-semibold tracking-[-0.06em] text-accent-strong">
                  {formatRoas(calculation.result)}
                  <span className="ml-1 text-3xl">x</span>
                </p>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Este é o retorno mínimo para que os Ads não consumam toda a
                  margem considerada.
                </p>
              </motion.div>
            ) : (
              <motion.div
                aria-live="polite"
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
                initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                key={calculation.status}
                transition={{ duration: reducedMotion ? 0 : 0.22 }}
              >
                <p className="text-5xl font-semibold tracking-[-0.06em] text-muted-foreground/40">
                  —<span className="ml-1 text-3xl">x</span>
                </p>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  {calculation.message}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-7">
            <ResultMetric
              label="Margem de Contribuição"
              value={
                parsedPercentage === null
                  ? "—"
                  : `${parsedPercentage.toLocaleString("pt-BR")}%`
              }
            />
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-accent/15 pt-4 text-xs">
            <span className="text-muted-foreground">Fórmula aplicada</span>
            <span className="font-semibold tabular-nums text-foreground">
              1 ÷ Margem de Contribuição (%)
            </span>
          </div>

          {calculation.status === "invalid" && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-error/15 bg-error-soft/30 px-3 py-2.5 text-xs text-error">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{calculation.message}</span>
            </div>
          )}
        </motion.section>
      </div>
    </motion.div>
  );
}

function ExampleMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface/60 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface/60 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
