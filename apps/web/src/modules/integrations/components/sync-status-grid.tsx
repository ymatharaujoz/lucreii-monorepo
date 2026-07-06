"use client";

import { motion } from "framer-motion";
import { RefreshCw, Clock, CheckCircle2, Ban, Activity } from "lucide-react";
import { Card, Skeleton, cn } from "@lucreii/ui";
import { containerVariants, itemVariants, hoverTransition } from "@/lib/animations";
import { translateApiMessage } from "@/lib/pt-br/api-ui";
import { formatDateTime, formatSyncOrigin } from "../lib/formatters";
import type { SyncStatusResponse, SyncRunRecord } from "../types/integrations";

interface SyncStatusGridProps {
  syncStatus?: SyncStatusResponse;
  lastRun?: SyncRunRecord;
  isLoading: boolean;
}

export function SyncStatusGrid({ syncStatus, lastRun, isLoading }: SyncStatusGridProps) {
  if (isLoading || !syncStatus) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="outlined" className="p-5">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="mt-3 h-6 w-24" />
            <Skeleton className="mt-2 h-3 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  const canRun = syncStatus.availability.canRun;
  const lastSync = syncStatus.availability.lastSuccessfulSyncAt;
  const isActive = !!syncStatus.activeRun;

  const cards = [
    {
      key: "status",
      icon: canRun ? CheckCircle2 : Ban,
      iconColor: canRun ? "text-success" : "text-error",
      iconBg: canRun ? "bg-success/8" : "bg-error/8",
      label: "Status",
      value: canRun ? "Disponível" : "Bloqueada",
      description: canRun
        ? "Pronto para sincronizar"
        : translateApiMessage(syncStatus.availability.message) || "Aguarde",
      gradient: canRun ? "from-success/5 to-transparent" : "from-error/5 to-transparent",
      accentBg: canRun ? "bg-success" : "bg-error",
    },
    {
      key: "last",
      icon: Clock,
      iconColor: lastSync ? "text-foreground-soft" : "text-warning",
      iconBg: lastSync ? "bg-foreground/5" : "bg-warning/8",
      label: "Última Sincronização",
      value: lastSync ? formatDateTime(lastSync) : "Nunca",
      description: lastRun
        ? `${lastRun.counts.orders} pedidos importados · ${formatSyncOrigin(lastRun.origin)}`
        : "Nenhuma sincronização realizada",
      gradient: lastSync ? "from-foreground/[0.02] to-transparent" : "from-warning/5 to-transparent",
      accentBg: lastSync ? "bg-border-strong" : "bg-warning",
    },
    {
      key: "active",
      icon: isActive ? RefreshCw : Activity,
      iconColor: isActive ? "text-accent" : "text-muted-foreground",
      iconBg: isActive ? "bg-accent/8" : "bg-foreground/5",
      isSpinning: isActive,
      label: "Execução Ativa",
      value: isActive ? "Em andamento" : "Nenhuma",
      description: isActive
        ? `${formatSyncOrigin(syncStatus.activeRun!.origin)} · iniciada ${formatDateTime(syncStatus.activeRun!.startedAt)}`
        : "Sistema aguardando",
      gradient: isActive ? "from-accent/5 to-transparent" : "from-foreground/[0.02] to-transparent",
      accentBg: isActive ? "bg-accent" : "bg-border",
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-3 gap-4"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.key}
            variants={itemVariants}
            whileHover={{
              y: -3,
              transition: hoverTransition,
            }}
            className="group"
          >
            <Card
              variant="outlined"
              padding="none"
              className={cn(
                "relative h-full overflow-hidden p-5 transition-all duration-[var(--transition-normal)] rounded-xl border border-border shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)]",
                "bg-surface-elevated/40 backdrop-blur-xs",
                card.key === "status" && !canRun && "border-error/15 bg-error-soft/3 hover:border-error/25",
                card.key === "status" && canRun && "border-success/15 bg-success-soft/3 hover:border-success/25",
                card.key === "last" && !lastSync && "border-warning/15 bg-warning-soft/3 hover:border-warning/25",
                card.key === "active" && isActive && "border-accent/15 bg-accent-soft/3 hover:border-accent/25"
              )}
            >
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px] transition-opacity duration-[var(--transition-fast)] opacity-80 group-hover:opacity-100",
                  card.accentBg
                )}
              />
              
              <div 
                aria-hidden
                className={cn(
                  "absolute inset-0 pointer-events-none bg-gradient-to-br to-transparent opacity-60 z-0", 
                  card.gradient
                )} 
              />
              
              <div className="relative z-10 flex items-start gap-4">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-105",
                    card.iconBg
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5 transition-colors", 
                      card.iconColor,
                      card.isSpinning && "animate-spin"
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    {card.label}
                  </p>
                  <p className="mt-1.5 text-base font-semibold tracking-tight text-foreground">
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground/75">
                    {card.description}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
