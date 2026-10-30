import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { BillingTrial } from "@lucreii/types";

type ActiveTrial = NonNullable<BillingTrial>;

const URGENT_THRESHOLD_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

function getTrialProgress(trial: ActiveTrial) {
  const startedAt = Date.parse(trial.startedAt);
  const endsAt = Date.parse(trial.endsAt);
  const totalDays = Math.round((endsAt - startedAt) / DAY_MS);

  if (!Number.isFinite(totalDays) || totalDays <= 0) {
    return null;
  }

  const usedDays = Math.min(
    totalDays,
    Math.max(0, totalDays - trial.remainingDays),
  );

  return Math.round((usedDays / totalDays) * 100);
}

function getHeadline(remainingDays: number) {
  if (remainingDays <= 0) return "Seu teste gratuito termina hoje";
  if (remainingDays === 1) return "Último dia do seu teste gratuito";
  return `Restam ${remainingDays} dias do seu teste gratuito`;
}

export function TrialBanner({
  trial,
  canManageBilling,
}: {
  trial: ActiveTrial;
  canManageBilling: boolean;
}) {
  const isUrgent = trial.remainingDays <= URGENT_THRESHOLD_DAYS;
  const progress = getTrialProgress(trial);

  return (
    <div className="border-b border-accent/15 bg-gradient-to-r from-accent/[0.10] via-accent/[0.05] to-transparent px-6 py-3 sm:px-8 md:px-10 lg:px-12 xl:px-14">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              isUrgent
                ? "bg-warning/15 text-warning"
                : "bg-accent/15 text-accent"
            }`}
          >
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {getHeadline(trial.remainingDays)}
            </p>
            <p className="text-xs text-muted-foreground">
              {isUrgent
                ? "Assine agora para não perder o acesso aos seus relatórios de lucro, precificação e integrações."
                : "Garanta seu plano e continue acompanhando o lucro real de cada venda, sem interrupções."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          {progress !== null ? (
            <div
              className="hidden w-32 md:block"
              role="progressbar"
              aria-label="Progresso do período de teste"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <div
                  className={`h-full rounded-full ${isUrgent ? "bg-warning" : "bg-accent"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                {progress}% do teste utilizado
              </p>
            </div>
          ) : null}
          {canManageBilling ? (
            <Link
              className="group inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-glow)] transition-all duration-[var(--transition-fast)] hover:bg-accent-strong"
              href="/app/billing"
            >
              Assinar agora
              <ArrowRight className="h-4 w-4 transition-transform duration-[var(--transition-fast)] group-hover:translate-x-0.5" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
