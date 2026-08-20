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
import type { BreakEvenRoasSimulation } from "@lucreii/types";
import { breakEvenRoasSimulationApiResponseSchema } from "@lucreii/validation";
import { Badge, Button, Modal } from "@lucreii/ui";
import { ApiClientError, apiClient } from "@/lib/api/client";
import { containerVariants, itemVariants } from "@/lib/animations";
import { BreakEvenRoasCalculator } from "./break-even-roas-calculator";

const QUERY_KEY = "break-even-roas-simulation";

function readSelectedCompanyId() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    /(?:^|;\s*)lucreii_selected_company_id=([^;]+)/i,
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function BreakEvenRoasSimulationDetailPage({
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
      apiClient.getValidatedData<BreakEvenRoasSimulation>(
        `/pricing/break-even-roas/simulations/${simulationId}`,
        breakEvenRoasSimulationApiResponseSchema,
      ),
    queryKey: [QUERY_KEY, selectedCompanyId, simulationId],
  });

  async function deleteSimulation() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiClient.delete<{ data: { id: string }; error: null }>(
        `/pricing/break-even-roas/simulations/${simulationId}`,
      );
      await queryClient.invalidateQueries({
        queryKey: ["break-even-roas-simulations"],
      });
      router.replace("/app/pricing/break-even-roas/simulations");
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
          href="/app/pricing/break-even-roas/simulations"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para Simulações
        </Link>
        {query.data && (
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
              <Calculator className="h-4 w-4" />
              <span>Editar Simulação</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="text-muted-foreground">ROAS de Equilíbrio</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
              {query.data.productIdentifier}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Revise a margem de contribuição e atualize o ROAS mínimo deste
              cenário.
            </p>
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
          <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
            <AlertTriangle className="h-8 w-8 text-error/80" />
            <h1 className="mt-4 text-base font-semibold text-foreground">
              Não foi possível carregar esta simulação
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {query.error instanceof ApiClientError
                ? query.error.message
                : "Verifique a conexão com a API e tente novamente."}
            </p>
            <div className="mt-5 flex items-center gap-2">
              <Button asChild size="sm" variant="secondary">
                <Link href="/app/pricing/break-even-roas/simulations">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Voltar
                </Link>
              </Button>
              <Button onClick={() => void query.refetch()} size="sm">
                Tentar novamente
              </Button>
            </div>
          </div>
        </motion.section>
      ) : (
        <BreakEvenRoasCalculator
          embedded
          embeddedActions={
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
          }
          embeddedStatus={
            <Badge className="border-accent/15 bg-accent-soft text-accent-strong">
              Editando
            </Badge>
          }
          initialSimulation={query.data}
          key={`${query.data.id}-${query.data.updatedAt}`}
          onSaved={(updated) => {
            queryClient.setQueryData(
              [QUERY_KEY, selectedCompanyId, simulationId],
              updated,
            );
            void queryClient.invalidateQueries({
              queryKey: ["break-even-roas-simulations"],
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
              loading={isDeleting}
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
