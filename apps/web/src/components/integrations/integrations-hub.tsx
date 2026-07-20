"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, AlertCircle, Sparkles } from "lucide-react";
import { ApiClientError } from "@/lib/api/client";
import { translateApiMessage } from "@/lib/pt-br/api-ui";
import { containerVariants, fadeInVariants } from "@/lib/animations";
import {
  ConnectedMarketplacesSection,
  ErrorState,
  IntegrationsHeader,
  LoadingIntegrations,
  SpreadsheetImportCard,
  SyncControlCard,
  SyncStatusGrid,
  useIntegrationsData,
} from "@/modules/integrations";
import {
  buildManualSyncPayload,
  getManualSyncDateBounds,
  validateManualSyncRange,
} from "@/modules/integrations/lib/manual-sync-range";
import type { IntegrationProviderSlug, RunSyncResponse } from "@lucreii/types";

interface IntegrationsHubProps {
  initialMessage: string | null;
  initialStatus: "error" | "success" | null;
  organizationName: string;
}

export function IntegrationsHub({
  initialMessage,
  initialStatus,
  organizationName,
}: IntegrationsHubProps) {
  const [syncProvider, setSyncProvider] = useState<IntegrationProviderSlug>("mercadolivre");
  const [actionMode, setActionMode] = useState<"period" | "spreadsheet">("period");
  const [message, setMessage] = useState<string | null>(() => {
    if (!initialMessage) return null;
    const translated = translateApiMessage(initialMessage) || initialMessage;
    if (translated === "Mercado Livre conectado com sucesso.") return null;
    return translated;
  });
  const [messageTone, setMessageTone] = useState<"critical" | "neutral">(
    initialStatus === "error" ? "critical" : "neutral",
  );
  const [busyProvider, setBusyProvider] = useState<IntegrationProviderSlug | null>(null);
  const [busyAction, setBusyAction] = useState<"connect" | "disconnect" | null>(null);
  const [manualSyncDates, setManualSyncDates] = useState({
    endDate: "",
    startDate: "",
  });

  const {
    integrationsQuery,
    syncStatusQuery,
    connectMutation,
    disconnectMutation,
    syncMutation,
    spreadsheetImport,
    refetchAll,
  } = useIntegrationsData(syncProvider, {
    onSyncSuccess: (data: RunSyncResponse) => {
      const count = data.run.counts.orders;
      setMessage(
        `Sincronização finalizada com ${count} pedido${count === 1 ? "" : "s"} importado${count === 1 ? "" : "s"}.`,
      );
      setMessageTone("neutral");
    },
  });

  const handleConnect = useCallback(
    (provider: IntegrationProviderSlug) => {
      setBusyAction("connect");
      setBusyProvider(provider);
      setMessage(null);
      connectMutation.mutate(provider);
    },
    [connectMutation],
  );

  const handleDisconnect = useCallback(
    (provider: IntegrationProviderSlug) => {
      setBusyAction("disconnect");
      setBusyProvider(provider);
      setMessage(null);
      disconnectMutation.mutate(provider, {
        onSuccess: (record) => {
          setMessage(`${record.displayName} desconectado.`);
          setMessageTone("neutral");
        },
        onError: (error) => {
          setMessage(
            error instanceof ApiClientError
              ? error.message
              : "Não foi possível desconectar.",
          );
          setMessageTone("critical");
          setBusyAction(null);
          setBusyProvider(null);
        },
      });
    },
    [disconnectMutation],
  );

  const handleSyncClick = useCallback(() => {
    setMessage(null);

    if (syncStatusQuery.isLoading) return;

    if (syncStatusQuery.error) {
      setMessage(
        syncStatusQuery.error instanceof Error
          ? syncStatusQuery.error.message
          : "Erro ao carregar status.",
      );
      setMessageTone("critical");
      return;
    }

    const status = syncStatusQuery.data;
    if (!status) {
      setMessage("Aguarde o carregamento do status.");
      setMessageTone("neutral");
      return;
    }

    if (!status.availability.canRun) {
      const msg =
        translateApiMessage(status.availability.message) ||
        status.availability.message ||
        "Sincronização indisponível.";
      setMessage(msg);
      const criticalReasons = new Set([
        "provider_disconnected",
        "provider_needs_reconnect",
        "provider_unavailable",
        "provider_sync_unsupported",
      ]);
      setMessageTone(
        criticalReasons.has(status.availability.reason) ? "critical" : "neutral",
      );
      return;
    }

    const validation = validateManualSyncRange(manualSyncDates);
    if (!validation.isValid) {
      setMessage(validation.error);
      setMessageTone("critical");
      return;
    }

    syncMutation.mutate(buildManualSyncPayload(syncProvider, manualSyncDates));
  }, [manualSyncDates, syncMutation, syncProvider, syncStatusQuery]);

  if (integrationsQuery.isLoading) {
    return <LoadingIntegrations cardCount={1} />;
  }

  if (integrationsQuery.error) {
    return <ErrorState error={integrationsQuery.error} onRetry={refetchAll} />;
  }

  const displayMessage = message
    ? translateApiMessage(message) || message
    : null;
  const connections = integrationsQuery.data ?? [];
  const activeConnection = connections.find((connection) => connection.provider === syncProvider);
  const isConnected = activeConnection?.status === "connected";
  const connectedCount = connections.filter((connection) => connection.status === "connected").length;
  const lastCompletedRun = syncStatusQuery.data?.lastCompletedRun;
  const lastActivityAt = activeConnection?.lastSyncedAt ?? lastCompletedRun?.finishedAt ?? null;
  const manualSyncValidation = validateManualSyncRange(manualSyncDates);
  const manualSyncBounds = getManualSyncDateBounds();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-12 pb-8 lg:space-y-16"
    >
      {displayMessage && (
        <motion.div
          role="status"
          variants={fadeInVariants}
          initial="hidden"
          animate="visible"
          className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-[var(--shadow-xs)] ${
            messageTone === "critical"
              ? "border-error/20 bg-error-soft/80"
              : "border-success/20 bg-success-soft/80"
          }`}
        >
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
              messageTone === "critical" ? "bg-error/10" : "bg-success/10"
            }`}
          >
            <AlertCircle
              className={`h-3.5 w-3.5 ${
                messageTone === "critical" ? "text-error" : "text-success"
              }`}
              aria-hidden
            />
          </span>
          <p className="text-sm leading-6 text-foreground">{displayMessage}</p>
        </motion.div>
      )}

      <IntegrationsHeader
        organizationName={organizationName}
        isConnected={isConnected}
        connectedCount={connectedCount}
        totalCount={connections.length}
        lastActivityAt={lastActivityAt}
      />

      <ConnectedMarketplacesSection
        connections={connections}
        isLoading={integrationsQuery.isLoading}
        isFetching={integrationsQuery.isFetching}
        busyProvider={busyProvider}
        busyAction={busyAction}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <section className="space-y-6" aria-labelledby="sync-workspace-heading">
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center gap-2 text-accent">
              <Sparkles className="h-4 w-4" aria-hidden />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]">
                Deck operacional
              </span>
            </div>
            <h2
              id="sync-workspace-heading"
              className="text-2xl font-semibold tracking-[-0.045em] text-foreground sm:text-3xl"
            >
              Acompanhe. Decida. Sincronize.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Consulte a saúde do canal selecionado e escolha uma ação sem sair do fluxo.
            </p>
          </div>

          <div className="flex w-full max-w-xl overflow-x-auto rounded-2xl border border-border/80 bg-surface-strong/70 p-1 shadow-[var(--shadow-xs)] sm:w-fit">
            {(
              [
                ["mercadolivre", "Mercado Livre"],
                ["shopee", "Shopee"],
                ["shein", "Shein"],
              ] as const
            ).map(([provider, label]) => {
              const isActive = syncProvider === provider;
              return (
                <button
                  key={provider}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setSyncProvider(provider)}
                  className="relative min-w-max rounded-xl px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-4"
                >
                  {isActive && (
                    <motion.span
                      layoutId="provider-tab-indicator"
                      className="absolute inset-0 rounded-xl bg-background shadow-[var(--shadow-sm)]"
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  <span className={`relative z-10 ${isActive ? "text-foreground" : ""}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-10">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Activity className="h-4 w-4 text-accent" aria-hidden />
                Status da sincronização
              </div>
              {syncStatusQuery.isLoading && (
                <span className="text-xs text-muted-foreground">Atualizando status…</span>
              )}
            </div>
            <SyncStatusGrid
              syncStatus={syncStatusQuery.data}
              lastRun={lastCompletedRun ?? undefined}
              isLoading={syncStatusQuery.isLoading}
              layout="compact"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Activity className="h-4 w-4 text-accent" aria-hidden />
                Ações de sincronização
              </div>
              <span className="text-xs text-muted-foreground">Escolha um método</span>
            </div>

            <div className="flex w-full max-w-md rounded-2xl border border-border/80 bg-surface-strong/70 p-1 shadow-[var(--shadow-xs)]">
              {(
                [
                  ["period", "Por período"],
                  ["spreadsheet", "Por planilha"],
                ] as const
              ).map(([mode, label]) => {
                const isActive = actionMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActionMode(mode)}
                    className="relative flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="action-mode-indicator"
                        className="absolute inset-0 rounded-xl bg-background shadow-[var(--shadow-sm)]"
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      />
                    )}
                    <span className={`relative z-10 ${isActive ? "text-foreground" : ""}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {actionMode === "period" ? (
                <motion.div
                  key="period"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                >
                  {isConnected ? (
                    <SyncControlCard
                      syncStatus={syncStatusQuery.data}
                      endDate={manualSyncDates.endDate}
                      isLoading={syncStatusQuery.isLoading}
                      isSyncing={syncMutation.isPending}
                      maxDate={manualSyncBounds.maxDate}
                      minDate={manualSyncBounds.minDate}
                      onEndDateChange={(value) =>
                        setManualSyncDates((current) => ({ ...current, endDate: value }))
                      }
                      onStartDateChange={(value) =>
                        setManualSyncDates((current) => ({
                          ...current,
                          startDate: value,
                        }))
                      }
                      onSyncClick={handleSyncClick}
                      rangeError={manualSyncValidation.error}
                      startDate={manualSyncDates.startDate}
                    />
                  ) : (
                    <div className="flex min-h-[220px] flex-col justify-between rounded-[var(--radius-xl)] border border-dashed border-border bg-surface-strong/35 p-5">
                      <div>
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/15 text-muted-foreground">
                          <Activity className="h-5 w-5" aria-hidden />
                        </span>
                        <h3 className="mt-5 text-base font-semibold tracking-tight text-foreground">
                          Sincronização por período
                        </h3>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                          Conecte o marketplace selecionado para escolher um intervalo e importar seus pedidos.
                        </p>
                      </div>
                      <span className="mt-6 inline-flex w-fit items-center gap-2 text-xs font-semibold text-muted-foreground">
                        Conexão necessária <span aria-hidden>→</span>
                      </span>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="spreadsheet"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                >
                  <SpreadsheetImportCard
                    provider={syncProvider}
                    file={spreadsheetImport.file}
                    stage={spreadsheetImport.stage}
                    progress={spreadsheetImport.progress}
                    result={spreadsheetImport.result}
                    error={spreadsheetImport.error}
                    isPending={spreadsheetImport.isPending}
                    onSelectFile={spreadsheetImport.selectFile}
                    onImport={spreadsheetImport.import}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
