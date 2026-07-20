"use client";

import { useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Button, Card, cn } from "@lucreii/ui";
import type { IntegrationProviderSlug, OrderSpreadsheetImportResult } from "@lucreii/types";
import type { SpreadsheetImportStage } from "../hooks/use-integrations-data";

type SpreadsheetImportCardProps = {
  provider: IntegrationProviderSlug;
  file: File | null;
  stage: SpreadsheetImportStage;
  progress: number;
  result: OrderSpreadsheetImportResult | null;
  error: Error | null;
  isPending: boolean;
  onSelectFile: (file: File | null) => void;
  onImport: () => void;
};

const providerCopy: Record<IntegrationProviderSlug, { name: string; active: boolean }> = {
  mercadolivre: { name: "Mercado Livre", active: true },
  shein: { name: "Shein", active: false },
  shopee: { name: "Shopee", active: false },
};

function stageLabel(stage: SpreadsheetImportStage) {
  switch (stage) {
    case "validation":
      return "Validando o arquivo";
    case "uploading":
      return "Enviando a planilha";
    case "processing":
      return "Analisando e importando pedidos";
    case "finalizing":
      return "Finalizando a importação";
    case "success":
      return "Importação concluída";
    case "error":
      return "Não foi possível concluir";
    case "selected":
      return "Arquivo pronto para importar";
    default:
      return "Escolha uma planilha de vendas";
  }
}

export function SpreadsheetImportCard({
  provider,
  file,
  stage,
  progress,
  result,
  error,
  isPending,
  onSelectFile,
  onImport,
}: SpreadsheetImportCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const copy = providerCopy[provider];
  const isDisabled = !copy.active;
  const importErrors = result?.errors ?? [];
  const hasErrors = importErrors.length > 0;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.35 }}
    >
      <Card
        variant="outlined"
        padding="none"
        className={cn(
          "relative overflow-hidden rounded-[var(--radius-2xl)] border border-border/80 bg-surface-elevated/65 p-6 shadow-[var(--shadow-card)] backdrop-blur-sm",
          isDisabled && "opacity-70",
          isPending && "ring-1 ring-accent/15 shadow-[0_18px_50px_rgba(14,139,129,0.12)]",
        )}
      >
        <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-accent/8 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-foreground">
                    Importar histórico por planilha
                  </h3>
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                </div>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  Envie o export do {copy.name} e traga suas vendas históricas para a Lucreii.
                </p>
              </div>
            </div>
            <span className="w-fit rounded-full border border-accent/20 bg-accent/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
              {copy.active ? "Disponível" : "Em breve"}
            </span>
          </div>

          {isDisabled ? (
            <div className="rounded-xl border border-dashed border-border bg-surface-strong/40 px-4 py-3 text-xs text-muted-foreground">
              O modelo de planilha deste marketplace será habilitado em breve.
            </div>
          ) : (
            <>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                disabled={isPending}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "group flex min-h-28 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-accent/35 bg-accent/[0.035] px-5 py-5 text-center transition-all duration-300 hover:border-accent/70 hover:bg-accent/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2",
                  isPending && "cursor-wait",
                )}
              >
                <UploadCloud className="mb-2 h-6 w-6 text-accent transition-transform duration-300 group-hover:-translate-y-1" />
                <span className="text-sm font-semibold text-foreground">
                  {file ? file.name : "Selecionar planilha .xlsx"}
                </span>
                <span className="mt-1 text-[11px] text-muted-foreground">
                  {file ? "Clique para trocar o arquivo" : "O cabeçalho pode estar em qualquer linha do arquivo"}
                </span>
              </button>

              <AnimatePresence mode="wait" initial={false}>
                {(isPending || stage === "success" || stage === "error") && (
                  <motion.div
                    key={stage}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.28,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <div className="rounded-2xl border border-border/70 bg-surface-strong/35 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                            {isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-accent" /> : stage === "success" ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <AlertCircle className="h-3.5 w-3.5 text-error" />}
                            Importação em andamento
                          </span>
                          <p className="mt-1.5 text-sm font-semibold text-foreground">{stageLabel(stage)}</p>
                        </div>
                        <span className="text-2xl font-semibold tabular-nums tracking-[-0.05em] text-accent">
                          {progress}%
                        </span>
                      </div>
                    <div
                      className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-border/60"
                      role="progressbar"
                      aria-label="Progresso da importação"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                    >
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-strong shadow-[0_0_14px_rgba(14,139,129,0.35)]"
                        style={{ transformOrigin: "left center" }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: progress / 100 }}
                        transition={
                          shouldReduceMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 70, damping: 18, mass: 0.7 }
                        }
                      />
                      {isPending && !shouldReduceMotion && (
                        <motion.span
                          aria-hidden
                          className="pointer-events-none absolute inset-y-0 w-1/3 bg-white/35 blur-sm"
                          animate={{ x: ["-120%", "340%"] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                        />
                      )}
                    </div>
                    <div className="mt-3 flex flex-col gap-1 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                      <span>{isPending ? "Processamento em etapas" : "Resultado recebido"}</span>
                      <span>{progress < 100 ? "A conclusão será confirmada pelo servidor" : "Importação confirmada"}</span>
                    </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {result && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Importados", result.imported],
                    ["Criados", result.created],
                    ["Atualizados", result.updated],
                    ["Flex pendentes", result.pendingFlex],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-border/70 bg-surface-strong/35 px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              {error && <p className="text-xs text-error">{error.message}</p>}
              {hasErrors && (
                <div className="rounded-xl border border-warning/25 bg-warning/8 px-3 py-2 text-xs text-foreground">
                  <p>
                    {importErrors.length} ocorrência{importErrors.length === 1 ? "" : "s"} ficou{importErrors.length === 1 ? "" : "aram"} pendente{importErrors.length === 1 ? "" : "s"}; o restante foi importado.
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                    {importErrors.slice(0, 5).map((rowError) => (
                      <li key={`${rowError.row}-${rowError.saleId ?? "row"}`}>
                        Linha {rowError.row}: {rowError.message}
                        {rowError.saleId ? ` · venda ${rowError.saleId}` : ""}
                      </li>
                    ))}
                    {importErrors.length > 5 ? (
                      <li>+ {importErrors.length - 5} outras ocorrências</li>
                    ) : null}
                  </ul>
                </div>
              )}

              <div className="flex flex-col justify-end gap-3 lg:flex-row lg:items-center">
                <span className="text-[11px] text-muted-foreground">
                  {stage === "success" ? "Você pode reimportar para atualizar os pedidos." : "A importação é idempotente e não duplica vendas."}
                </span>
                <Button
                  type="button"
                  disabled={!file || isPending}
                  loading={isPending}
                  onClick={onImport}
                  className="gap-2 rounded-xl bg-accent px-5 text-xs font-bold text-white shadow-[0_6px_18px_rgba(14,122,111,0.2)] transition-all hover:-translate-y-0.5 hover:bg-accent-strong"
                >
                  {!isPending && <UploadCloud className="h-3.5 w-3.5" />}
                  {isPending ? "Importando..." : "Importar pedidos"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
