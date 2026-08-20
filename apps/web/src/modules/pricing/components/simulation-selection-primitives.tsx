"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCheck, Trash2, X } from "lucide-react";
import { Button } from "@lucreii/ui";

export function SimulationSelectionActionBar({
  allVisibleSelected,
  isDeleting,
  onClear,
  onDelete,
  onSelectPage,
  selectedCount,
  visibleCount,
}: {
  allVisibleSelected: boolean;
  isDeleting: boolean;
  onClear: () => void;
  onDelete: () => void;
  onSelectPage: () => void;
  selectedCount: number;
  visibleCount: number;
}) {
  return (
    <AnimatePresence initial={false} mode="wait">
      {selectedCount > 0 ? (
        <motion.div
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative mx-5 my-4 flex flex-col gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-accent/25 bg-gradient-to-r from-accent/[0.08] via-accent/[0.035] to-transparent p-3 shadow-[var(--shadow-sm)] sm:mx-7 sm:flex-row sm:items-center sm:justify-between"
          exit={{ opacity: 0, y: -8, scale: 0.985 }}
          initial={{ opacity: 0, y: -8, scale: 0.985 }}
          key="simulation-selection-bar"
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-[var(--shadow-sm)]">
              <CheckCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                {selectedCount} simulaç{selectedCount === 1 ? "ão" : "ões"}{" "}
                selecionada{selectedCount === 1 ? "" : "s"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                A seleção continua ativa ao trocar de página ou filtro.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {visibleCount > 0 && !allVisibleSelected && (
              <Button onClick={onSelectPage} size="sm" variant="ghost">
                Selecionar página
              </Button>
            )}
            <Button onClick={onClear} size="sm" variant="ghost">
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
            <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
            <Button
              disabled={isDeleting}
              loading={isDeleting}
              onClick={onDelete}
              size="sm"
              variant="danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir selecionados
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
