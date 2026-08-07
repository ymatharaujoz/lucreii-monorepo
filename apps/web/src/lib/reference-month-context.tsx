"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  startTransition,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  clampReferenceMonth,
  getSaoPauloCurrentReferenceMonth,
  mergeDescendingReferenceMonthChoices,
} from "./reference-month";

const REFERENCE_MONTH_HISTORY = 6;
const STORAGE_KEY_PREFIX = "lucreii_reference_month";

type ReferenceMonthContextValue = {
  referenceMonth: string;
  referenceMonthOptions: readonly string[];
  setReferenceMonth: (next: string) => void;
};

const ReferenceMonthContext = createContext<ReferenceMonthContextValue | null>(
  null,
);

function getStorageKey(companyId: string | null) {
  return `${STORAGE_KEY_PREFIX}:${companyId ?? "default"}`;
}

function getDefaultReferenceMonth() {
  return getSaoPauloCurrentReferenceMonth();
}

export function ReferenceMonthProvider({
  children,
  companyId,
}: {
  children: ReactNode;
  companyId: string | null;
}) {
  const [referenceMonth, setReferenceMonthState] = useState(
    getDefaultReferenceMonth,
  );

  useEffect(() => {
    const fallback = getDefaultReferenceMonth();

    try {
      const stored = window.localStorage.getItem(getStorageKey(companyId));
      startTransition(() => {
        setReferenceMonthState(
          stored ? (clampReferenceMonth(stored) ?? fallback) : fallback,
        );
      });
    } catch {
      startTransition(() => {
        setReferenceMonthState(fallback);
      });
    }
  }, [companyId]);

  const setReferenceMonth = useCallback(
    (next: string) => {
      const effective = clampReferenceMonth(next);

      if (!effective) {
        return;
      }

      setReferenceMonthState(effective);

      try {
        window.localStorage.setItem(getStorageKey(companyId), effective);
      } catch {
        // Storage can be unavailable in restricted browser contexts.
      }
    },
    [companyId],
  );

  const referenceMonthOptions = useMemo(
    () =>
      mergeDescendingReferenceMonthChoices(
        referenceMonth,
        getSaoPauloCurrentReferenceMonth(),
        REFERENCE_MONTH_HISTORY,
      ),
    [referenceMonth],
  );

  const value = useMemo(
    () => ({ referenceMonth, referenceMonthOptions, setReferenceMonth }),
    [referenceMonth, referenceMonthOptions, setReferenceMonth],
  );

  return (
    <ReferenceMonthContext.Provider value={value}>
      {children}
    </ReferenceMonthContext.Provider>
  );
}

export function useReferenceMonth() {
  const context = useContext(ReferenceMonthContext);

  if (!context) {
    throw new Error(
      "useReferenceMonth must be used within a ReferenceMonthProvider.",
    );
  }

  return context;
}
