"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import type { PricingSimulation } from "@lucreii/types";
import { pricingSimulationApiResponseSchema } from "@lucreii/validation";
import { Badge, Button, Modal } from "@lucreii/ui";
import { ApiClientError, apiClient } from "@/lib/api/client";
import { containerVariants, itemVariants } from "@/lib/animations";
import { PricingCalculator } from "./pricing-calculator";

const QUERY_KEY = "pricing-simulation";

function modeLabel(mode: PricingSimulation["mode"]) {
  return {
    "contribution-margin": "Margem de Contribuição",
    "desired-profit": "Lucro Desejado",
    "sale-price": "Preço de Venda",
  }[mode];
}

function readSelectedCompanyId() {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    /(?:^|;\s*)lucreii_selected_company_id=([^;]+)/i,
  );

  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
      <AlertTriangle className="h-8 w-8 text-error/80" />
      <h1 className="mt-4 text-base font-semibold text-foreground">
        Não foi possível carregar esta simulação
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {error instanceof ApiClientError
          ? error.message
          : "Verifique a conexão com a API e tente novamente."}
      </p>
      <div className="mt-5 flex items-center gap-2">
        <Button asChild size="sm" variant="secondary">
          <Link href="/app/pricing/simulations">
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar para Simulações
          </Link>
        </Button>
        <Button onClick={onRetry} size="sm">
          Tentar novamente
        </Button>
      </div>
    </div>
  );
}

export function PricingSimulationDetailPage({
  simulationId,
}: {
  simulationId: string;
}) {
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const queryClient = useQueryClient();
  const selectedCompanyId = readSelectedCompanyId();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const query = useQuery({
    enabled: Boolean(selectedCompanyId && simulationId),
    queryFn: () =>
      apiClient.getValidatedData<PricingSimulation>(
        `/pricing/simulations/${simulationId}`,
        pricingSimulationApiResponseSchema,
      ),
    queryKey: [QUERY_KEY, selectedCompanyId, simulationId],
  });

  async function deleteSimulation() {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiClient.delete<{ data: { id: string }; error: null }>(
        `/pricing/simulations/${simulationId}`,
      );
      await queryClient.invalidateQueries({
        queryKey: ["pricing-simulations"],
      });
      router.replace("/app/pricing/simulations");
    } catch (error) {
      setDeleteError(
        error instanceof ApiClientError
          ? error.message
          : "Não foi possível excluir a simulação.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <motion.div
      animate="visible"
      className="space-y-7 pb-8"
      initial={reducedMotion ? false : "hidden"}
      variants={containerVariants}
    >
      <motion.header className="space-y-6" variants={itemVariants}>
        <Link
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-accent"
          href="/app/pricing/simulations"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para Simulações
        </Link>
        {query.data && (
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
                <Calculator className="h-4 w-4" />
                <span>Editar Simulação</span>
                <span className="text-muted-foreground/50">/</span>
                <span className="text-muted-foreground">
                  {modeLabel(query.data.mode)}
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                {query.data.productIdentifier}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Revise as premissas e atualize o preço recomendado deste
                cenário.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Badge className="border-accent/15 bg-accent-soft text-accent-strong">
                Editando
              </Badge>
              <Button
                className="shadow-[var(--shadow-sm)]"
                onClick={() => {
                  setDeleteError(null);
                  setIsDeleteOpen(true);
                }}
                size="sm"
                variant="danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir simulação
              </Button>
            </div>
          </div>
        )}
      </motion.header>

      {query.isPending ? (
        <div className="space-y-5">
          {[0, 1, 2].map((section) => (
            <div
              className="h-40 animate-pulse rounded-[var(--radius-xl)] border border-border/60 bg-surface-strong/60"
              key={section}
            />
          ))}
        </div>
      ) : query.isError || !query.data ? (
        <motion.section
          className="rounded-[var(--radius-xl)] border border-border/70 bg-surface-strong/70 shadow-[var(--shadow-sm)]"
          variants={itemVariants}
        >
          <ErrorState
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        </motion.section>
      ) : (
        <PricingCalculator
          embedded
          initialSimulation={query.data}
          key={`${query.data.id}-${query.data.updatedAt}`}
          mode={query.data.mode}
          onSaved={(updated) => {
            queryClient.setQueryData(
              [QUERY_KEY, selectedCompanyId, simulationId],
              updated,
            );
            void queryClient.invalidateQueries({
              queryKey: ["pricing-simulations"],
            });
          }}
        />
      )}

      <Modal
        onClose={() => {
          if (!isDeleting) setIsDeleteOpen(false);
        }}
        open={isDeleteOpen}
        title="Excluir Simulação?"
      >
        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Esta ação remove o cenário salvo da empresa ativa. Os dados não
            poderão ser recuperados depois.
          </p>
          {deleteError && (
            <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-error/20 bg-error-soft px-3 py-2.5 text-xs text-error">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              disabled={isDeleting}
              onClick={() => setIsDeleteOpen(false)}
              size="sm"
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button
              disabled={isDeleting}
              onClick={() => void deleteSimulation()}
              size="sm"
              variant="danger"
            >
              {isDeleting ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
