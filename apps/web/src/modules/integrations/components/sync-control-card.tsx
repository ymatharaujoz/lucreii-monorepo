"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, Button } from "@lucreii/ui";
import { fadeInVariants } from "@/lib/animations";
import { translateApiMessage } from "@/lib/pt-br/api-ui";
import { formatDateTime, formatSyncOrigin } from "../lib/formatters";
import type { SyncStatusResponse } from "../types/integrations";
import { ManualSyncRangeErrorBanner } from "./manual-sync-range-error-banner";
import { DateRangePicker } from "@/components/ui-premium/date-range-picker";

const RANGE_ERROR_DESCRIBED_BY_ID = "manual-sync-range-error";

interface SyncControlCardProps {
  syncStatus?: SyncStatusResponse;
  startDate: string;
  endDate: string;
  minDate: string;
  maxDate: string;
  rangeError: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onSyncClick: () => void;
}

export function SyncControlCard({
  syncStatus,
  startDate,
  endDate,
  minDate,
  maxDate,
  rangeError,
  isLoading,
  isSyncing,
  onStartDateChange,
  onEndDateChange,
  onSyncClick,
}: SyncControlCardProps) {
  const canSync = syncStatus?.availability.canRun ?? false;
  const hasSelectedDates = startDate.length > 0 || endDate.length > 0;
  const hasRangeError = hasSelectedDates && !!rangeError;
  const canSubmitManualSync =
    canSync &&
    !isSyncing &&
    startDate.length > 0 &&
    endDate.length > 0 &&
    !rangeError;

  const statusInfo = (() => {
    if (isLoading || !syncStatus) {
      return {
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        subtitle: "Verificando status",
        title: "Carregando...",
      };
    }
    if (canSync) {
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-success" />,
        subtitle: "Você pode executar uma sincronização agora.",
        title: "Pronto para sincronizar",
      };
    }
    return {
      icon: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
      subtitle:
        translateApiMessage(syncStatus.availability.message) || "Aguarde",
      title: "Sincronização indisponível",
    };
  })();

  const lastSync = syncStatus?.availability.lastSuccessfulSyncAt;

  return (
    <motion.div variants={fadeInVariants}>
      <Card 
        variant="outlined" 
        className="p-6 bg-surface-elevated/40 border border-border/80 rounded-2xl shadow-[var(--shadow-xs)] hover:border-border-strong transition-all duration-300 backdrop-blur-xs"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              Período de Sincronização
            </span>
            <DateRangePicker
              from={startDate}
              to={endDate}
              onChange={(from, to) => {
                onStartDateChange(from);
                onEndDateChange(to);
              }}
              minDate={minDate}
              maxDate={maxDate}
              hasRangeError={hasRangeError}
              rangeErrorId={RANGE_ERROR_DESCRIBED_BY_ID}
              className="w-full sm:w-fit"
            />
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border/50 pt-5">
            <div className="flex items-center gap-3 bg-surface-strong/30 border border-border/60 px-4 py-3 rounded-xl max-w-xl">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-surface-elevated shadow-xs">
                {statusInfo.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-foreground">
                  {statusInfo.title}
                </h3>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  {statusInfo.subtitle}
                </p>
              </div>
            </div>

            <Button
              disabled={!canSubmitManualSync}
              loading={isSyncing}
              onClick={onSyncClick}
              className="shrink-0 gap-2 rounded-xl bg-gradient-to-r from-accent to-accent-strong hover:from-accent-strong hover:to-accent px-6 py-2.5 text-xs font-bold text-white shadow-[0_4px_12px_rgba(14,122,111,0.2)] hover:shadow-[0_6px_20px_rgba(14,122,111,0.3)] transition-all duration-300 hover:-translate-y-0.5 active:scale-97"
            >
              {!isSyncing && <RefreshCw className="h-3.5 w-3.5" />}
              {isSyncing ? "Sincronizando..." : "Sincronizar agora"}
            </Button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {hasSelectedDates && rangeError ? (
              <ManualSyncRangeErrorBanner
                key="range-error"
                error={rangeError}
                describedById={RANGE_ERROR_DESCRIBED_BY_ID}
              />
            ) : null}
          </AnimatePresence>

          {!isLoading && syncStatus && (
            <div className="mt-2 flex gap-6 border-t border-border/40 pt-3 text-[11px]">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Última: {lastSync ? formatDateTime(lastSync) : "Nunca"}
                </span>
              </div>

              {syncStatus.lastCompletedRun && (
                <div className="ml-auto text-muted-foreground">
                  {syncStatus.lastCompletedRun.counts.orders} pedidos na última
                  sincronização ·{" "}
                  {formatSyncOrigin(syncStatus.lastCompletedRun.origin)}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
