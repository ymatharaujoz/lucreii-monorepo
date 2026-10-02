"use client";

import { useState } from "react";
import { Button } from "@lucreii/ui";
import { ApiClientError } from "@/lib/api/client";
import {
  formatAdvertisingInput,
  maskAdvertisingInput,
  parseAdvertisingInput,
} from "../utils/advertising-input";

type ProductAdvertisingFieldProps = {
  /** Amount currently saved for the listing. */
  value: number;
  /** Persists the new amount as an API decimal string, e.g. "1234.50". */
  onSave: (amount: string) => Promise<void>;
};

/**
 * BRL input for the monthly advertising of a listing. Edits stay local until
 * the user confirms with Enter or the save button; Escape discards them.
 */
export function ProductAdvertisingField({
  value,
  onSave,
}: ProductAdvertisingFieldProps) {
  // `draft` is only set while the user is typing; otherwise the input shows
  // the saved amount. `saved` bridges the gap between a successful save and
  // the refreshed `value` arriving from the refetched list.
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const baseline = saved ?? value.toFixed(2);
  const displayedValue =
    draft ?? formatAdvertisingInput(Number.parseFloat(baseline));
  const isDirty = draft !== null && parseAdvertisingInput(draft) !== baseline;

  const save = async () => {
    if (draft === null || !isDirty || isSaving) {
      return;
    }

    const amount = parseAdvertisingInput(draft);

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onSave(amount);
      setSaved(amount);
      setDraft(null);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiClientError
          ? error.message
          : "Não foi possível salvar a publicidade.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const discard = () => {
    setDraft(null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground"
          >
            R$
          </span>
          <input
            aria-invalid={errorMessage ? true : undefined}
            aria-label="Publicidade em reais"
            className="h-10 w-full rounded-[var(--radius-md)] border border-border bg-background pl-9 pr-3 text-right text-lg font-bold tabular-nums text-foreground transition-all duration-[var(--transition-fast)] hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            inputMode="numeric"
            onChange={(event) => setDraft(maskAdvertisingInput(event.target.value))}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void save();
              } else if (event.key === "Escape" && isDirty) {
                event.preventDefault();
                event.stopPropagation();
                discard();
              }
            }}
            type="text"
            value={displayedValue}
          />
        </div>
        {isDirty ? (
          <Button
            loading={isSaving}
            onClick={() => void save()}
            size="sm"
            type="button"
          >
            Salvar
          </Button>
        ) : null}
      </div>
      {errorMessage ? (
        <p className="text-xs font-medium text-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
