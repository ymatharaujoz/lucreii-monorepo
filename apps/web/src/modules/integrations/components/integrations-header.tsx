"use client";

import { motion } from "framer-motion";
import { Activity, ArrowUpRight, CheckCircle2, Link2 } from "lucide-react";
import { StatusBadge } from "@/components/ui-premium/status-badge";
import { fadeInVariants } from "@/lib/animations";
import { formatDateTime } from "../lib/formatters";

interface IntegrationsHeaderProps {
  organizationName: string;
  isConnected?: boolean;
  connectedCount?: number;
  totalCount?: number;
  lastActivityAt?: string | null;
}

export function IntegrationsHeader({
  organizationName,
  isConnected = false,
  connectedCount = 0,
  totalCount = 0,
  lastActivityAt = null,
}: IntegrationsHeaderProps) {
  const hasActivity = Boolean(lastActivityAt);
  const connectionSummary = totalCount > 0
    ? `${connectedCount} de ${totalCount} ativas`
    : "Nenhum canal conectado";

  return (
    <motion.header
      variants={fadeInVariants}
      initial="hidden"
      animate="visible"
      className="relative isolate overflow-hidden rounded-[var(--radius-2xl)] border border-border/80 bg-surface-elevated/80 shadow-[var(--shadow-card)] backdrop-blur-xl"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-72 rounded-full bg-success/5 blur-3xl"
      />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end lg:gap-12 lg:p-10">
        <div className="max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_0_4px_var(--accent-soft)]" />
              Workspace de operações
            </span>
            <span className="h-1 w-1 rounded-full bg-border-strong" />
            <span className="text-xs text-muted-foreground">{organizationName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl font-semibold leading-[0.95] tracking-[-0.065em] text-foreground sm:text-5xl lg:text-6xl">
              Tudo conectado.
              <br />
              Sem perder o pulso.
            </h1>
            <StatusBadge
              status={isConnected ? "success" : "inactive"}
              label={isConnected ? "Operando" : "Aguardando conexão"}
              className="mt-1 self-start"
            />
          </div>

          <p className="mt-6 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
            Gerencie seus marketplaces, acompanhe a saúde da operação e escolha o próximo movimento para manter seus pedidos em dia.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
          <SummaryMetric
            icon={Link2}
            label="Canais ativos"
            value={connectionSummary}
            tone={connectedCount > 0 ? "accent" : "muted"}
          />
          <SummaryMetric
            icon={Activity}
            label="Última atividade"
            value={hasActivity ? formatDateTime(lastActivityAt) : "Ainda não"}
            tone={hasActivity ? "success" : "muted"}
          />
          <div className="col-span-2 flex items-center justify-between rounded-2xl border border-border/70 bg-background/35 px-4 py-3.5 sm:col-span-1 lg:col-span-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Próximo passo
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                Revise suas conexões
              </p>
            </div>
            <ArrowUpRight className="h-4 w-4 text-accent" aria-hidden />
          </div>
        </div>
      </div>
    </motion.header>
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Link2;
  label: string;
  value: string;
  tone: "accent" | "success" | "muted";
}) {
  const toneClasses = {
    accent: "bg-accent/10 text-accent",
    success: "bg-success/10 text-success",
    muted: "bg-muted/12 text-muted-foreground",
  } as const;

  return (
    <div className="rounded-2xl border border-border/70 bg-background/35 px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        {tone === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden />}
      </div>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}
