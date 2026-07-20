"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  IntegrationConnectionRecord,
  IntegrationConnectResponse,
  IntegrationProviderSlug,
  OrderSpreadsheetImportResult,
  RunSyncRequest,
  RunSyncResponse,
  SyncStatusResponse,
} from "@lucreii/types";
import { apiClient } from "@/lib/api/client";
import { ordersQueryKey } from "@/modules/orders";

const integrationsQueryKey = ["integrations"] as const;
async function fetchIntegrations(): Promise<IntegrationConnectionRecord[]> {
  const response = await apiClient.get<{
    data: IntegrationConnectionRecord[];
    error: null;
  }>("/integrations");
  return response.data;
}

async function fetchSyncStatus(
  provider: IntegrationProviderSlug,
): Promise<SyncStatusResponse> {
  const response = await apiClient.get<{
    data: SyncStatusResponse;
    error: null;
  }>(`/sync/status?provider=${provider}`);
  return response.data;
}

export interface UseIntegrationsDataOptions {
  onError?: (error: Error, context: { type: string }) => void;
  onSyncSuccess?: (data: RunSyncResponse) => void;
}

export type SpreadsheetImportStage =
  | "idle"
  | "selected"
  | "validation"
  | "uploading"
  | "processing"
  | "finalizing"
  | "success"
  | "error";

export function useIntegrationsData(
  syncProvider: IntegrationProviderSlug,
  options: UseIntegrationsDataOptions = {},
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [spreadsheetImportProgress, setSpreadsheetImportProgress] =
    useState(0);
  const [spreadsheetImportStage, setSpreadsheetImportStage] =
    useState<SpreadsheetImportStage>("idle");
  const [spreadsheetImportFile, setSpreadsheetImportFile] =
    useState<File | null>(null);
  const [spreadsheetImportError, setSpreadsheetImportError] = useState<Error | null>(
    null,
  );
  const [spreadsheetImportResult, setSpreadsheetImportResult] =
    useState<OrderSpreadsheetImportResult | null>(null);
  const spreadsheetProgressRef = useRef(0);
  const processingTimerRef = useRef<number | null>(null);
  const completionAnimationRef = useRef<number | null>(null);
  const processingStartedAtRef = useRef<number | null>(null);

  const updateSpreadsheetProgress = (
    next: number | ((current: number) => number),
  ) => {
    setSpreadsheetImportProgress((current) => {
      const resolved = typeof next === "function" ? next(current) : next;
      spreadsheetProgressRef.current = resolved;
      return resolved;
    });
  };

  const clearProgressTimers = () => {
    if (processingTimerRef.current !== null) {
      window.clearInterval(processingTimerRef.current);
      processingTimerRef.current = null;
    }
    if (completionAnimationRef.current !== null) {
      window.cancelAnimationFrame(completionAnimationRef.current);
      completionAnimationRef.current = null;
    }
  };

  const startProcessingProgress = (file: File) => {
    clearProgressTimers();
    updateSpreadsheetProgress((current) => Math.max(48, current));
    setSpreadsheetImportStage("processing");

    const fileWeight = Math.min(3, Math.max(0.75, file.size / (1024 * 1024)));
    const analysisDuration = 1_800 + fileWeight * 450;
    const persistenceDuration = 2_600 + fileWeight * 700;
    const startedAt = performance.now();
    processingStartedAtRef.current = startedAt;

    processingTimerRef.current = window.setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const analysisRatio = Math.min(1, elapsed / analysisDuration);
      const persistenceRatio = Math.min(
        1,
        Math.max(0, (elapsed - analysisDuration) / persistenceDuration),
      );
      let nextProgress = 48;

      if (analysisRatio < 1) {
        nextProgress += (1 - Math.pow(1 - analysisRatio, 3)) * 20;
      } else if (persistenceRatio < 1) {
        nextProgress = 68 + (1 - Math.pow(1 - persistenceRatio, 3)) * 27;
      } else {
        nextProgress = 96;
      }

      updateSpreadsheetProgress((current) =>
        Math.max(current, Math.min(96, Math.round(nextProgress))),
      );
    }, 120);
  };

  const ensureVisibleProcessingTime = () => {
    const startedAt = processingStartedAtRef.current;
    if (!startedAt) return Promise.resolve();

    const minimumDuration = 4_200;
    const remaining = Math.max(0, minimumDuration - (performance.now() - startedAt));
    if (remaining === 0) return Promise.resolve();

    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, remaining);
    });
  };

  const animateCompletion = () =>
    new Promise<void>((resolve) => {
      const startedAt = performance.now();
      const initialProgress = Math.min(97, spreadsheetProgressRef.current);
      const duration = 900;

      const tick = () => {
        const ratio = Math.min(1, (performance.now() - startedAt) / duration);
        const eased = 1 - Math.pow(1 - ratio, 3);
        updateSpreadsheetProgress(
          Math.round(initialProgress + (100 - initialProgress) * eased),
        );

        if (ratio < 1) {
          completionAnimationRef.current = window.requestAnimationFrame(tick);
        } else {
          completionAnimationRef.current = null;
          resolve();
        }
      };

      completionAnimationRef.current = window.requestAnimationFrame(tick);
    });

  useEffect(() => {
    return () => {
      if (processingTimerRef.current !== null) {
        window.clearInterval(processingTimerRef.current);
      }
      if (completionAnimationRef.current !== null) {
        window.cancelAnimationFrame(completionAnimationRef.current);
      }
    };
  }, []);

  const integrationsQuery = useQuery({
    queryFn: fetchIntegrations,
    queryKey: integrationsQueryKey,
  });

  const syncStatusQuery = useQuery({
    queryFn: () => fetchSyncStatus(syncProvider),
    queryKey: ["sync-status", syncProvider],
  });

  const connectMutation = useMutation({
    mutationFn: async (provider: IntegrationProviderSlug) => {
      const response = await apiClient.post<{
        data: IntegrationConnectResponse;
        error: null;
      }>(`/integrations/${provider}/connect`);
      return response.data;
    },
    onSuccess: (data) => {
      window.location.assign(data.authorizationUrl);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (provider: IntegrationProviderSlug) => {
      const response = await apiClient.post<{
        data: IntegrationConnectionRecord;
        error: null;
      }>(`/integrations/${provider}/disconnect`);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: integrationsQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["sync-status"] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (payload: RunSyncRequest) => {
      const response = await apiClient.post<{
        data: RunSyncResponse;
        error: null;
      }>("/sync/run", {
        body: payload,
      });
      return response.data;
    },
    onSuccess: async (data) => {
      options.onSyncSuccess?.(data);
      await queryClient.invalidateQueries({ queryKey: integrationsQueryKey });
      await queryClient.invalidateQueries({
        queryKey: ["sync-status", syncProvider],
      });
      await queryClient.invalidateQueries({ queryKey: ordersQueryKey });
      router.refresh();
    },
  });

  const spreadsheetImportMutation = useMutation({
    mutationFn: async (file: File) => {
      setSpreadsheetImportStage("validation");
      clearProgressTimers();
      updateSpreadsheetProgress(0);
      setSpreadsheetImportError(null);
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      updateSpreadsheetProgress(6);
      setSpreadsheetImportStage("uploading");
      try {
        const response = await apiClient.postMultipartWithProgress<{
          data: OrderSpreadsheetImportResult;
          error: null;
        }>(
          `/integrations/${syncProvider}/orders/import`,
          file,
          (uploadProgress) => {
            const scaledProgress = 6 + Math.round(uploadProgress * 0.84);
            updateSpreadsheetProgress((current) =>
              Math.max(current, Math.min(48, scaledProgress)),
            );
          },
          () => startProcessingProgress(file),
        );
        await ensureVisibleProcessingTime();
        clearProgressTimers();
        setSpreadsheetImportStage("finalizing");
        await animateCompletion();
        return response.data;
      } finally {
        clearProgressTimers();
        processingStartedAtRef.current = null;
      }
    },
    onError: (error) => {
      setSpreadsheetImportError(error instanceof Error ? error : new Error("Não foi possível importar a planilha."));
      setSpreadsheetImportStage("error");
    },
    onSuccess: async (data) => {
      setSpreadsheetImportResult(data);
      setSpreadsheetImportStage("success");
      await queryClient.invalidateQueries({ queryKey: ordersQueryKey });
      router.refresh();
    },
  });

  const selectSpreadsheetFile = (file: File | null) => {
    setSpreadsheetImportFile(file);
    setSpreadsheetImportResult(null);
    setSpreadsheetImportError(null);
    clearProgressTimers();
    processingStartedAtRef.current = null;
    updateSpreadsheetProgress(0);
    setSpreadsheetImportStage(file ? "selected" : "idle");
  };

  const importSpreadsheet = () => {
    if (!spreadsheetImportFile || spreadsheetImportMutation.isPending) return;
    if (!spreadsheetImportFile.name.toLowerCase().endsWith(".xlsx")) {
      setSpreadsheetImportError(new Error("Apenas arquivos .xlsx são aceitos."));
      setSpreadsheetImportStage("error");
      return;
    }
    spreadsheetImportMutation.mutate(spreadsheetImportFile);
  };

  const refetchAll = () => {
    integrationsQuery.refetch();
    syncStatusQuery.refetch();
  };

  const activeConnection = integrationsQuery.data?.find(
    (c) => c.provider === syncProvider,
  );

  return {
    integrationsQuery: {
      data: integrationsQuery.data,
      isLoading: integrationsQuery.isLoading,
      isFetching: integrationsQuery.isFetching,
      error: integrationsQuery.error,
    },
    syncStatusQuery: {
      data: syncStatusQuery.data,
      isLoading: syncStatusQuery.isLoading,
      error: syncStatusQuery.error,
    },
    connectMutation: {
      isPending: connectMutation.isPending,
      mutate: connectMutation.mutate,
    },
    disconnectMutation: {
      isPending: disconnectMutation.isPending,
      mutate: disconnectMutation.mutate,
    },
    syncMutation: {
      isPending: syncMutation.isPending,
      mutate: syncMutation.mutate,
    },
    spreadsheetImport: {
      error: spreadsheetImportError,
      file: spreadsheetImportFile,
      import: importSpreadsheet,
      isPending: spreadsheetImportMutation.isPending,
      progress: spreadsheetImportProgress,
      result: spreadsheetImportResult,
      selectFile: selectSpreadsheetFile,
      stage: spreadsheetImportStage,
    },
    refetchAll,
    activeConnection,
    syncProvider,
  };
}
