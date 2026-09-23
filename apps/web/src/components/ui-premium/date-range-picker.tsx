"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@lucreii/ui";

export interface DateRangePickerProps {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  onChange?: (from: string, to: string) => void;
  align?: "left" | "right";
  className?: string;
  minDate?: string;
  maxDate?: string;
  hasRangeError?: boolean;
  rangeErrorId?: string;
  presets?: readonly DateRangePickerPreset[];
  referenceMonthSelection?: DateRangePickerReferenceMonthSelection;
}

export interface DateRangePickerPreset {
  key: string;
  label: string;
  from: string;
  to: string;
}

export interface DateRangePickerReferenceMonthSelection {
  referenceMonth: string;
  options: readonly string[];
  getBounds: (referenceMonth: string) => {
    minDate: string;
    maxDate: string;
  };
  getDefaultRange: (referenceMonth: string) => {
    from: string;
    to: string;
  };
  onApply: (selection: {
    referenceMonth: string;
    from: string;
    to: string;
  }) => void;
}

// Date helpers
function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDaysAgoString(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getFirstDayOfThisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function getFirstDayOfLastMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function getLastDayOfLastMonth(): string {
  const d = new Date();
  d.setDate(0); // 0th day of current month is last day of previous month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDefaultPresets(): DateRangePickerPreset[] {
  return [
    {
      key: "today",
      label: "Hoje",
      from: getTodayString(),
      to: getTodayString(),
    },
    {
      key: "yesterday",
      label: "Ontem",
      from: getYesterdayString(),
      to: getYesterdayString(),
    },
    {
      key: "last7d",
      label: "Últimos 7 dias",
      from: getDaysAgoString(6),
      to: getTodayString(),
    },
    {
      key: "last30d",
      label: "Últimos 30 dias",
      from: getDaysAgoString(29),
      to: getTodayString(),
    },
    {
      key: "thisMonth",
      label: "Este mês",
      from: getFirstDayOfThisMonth(),
      to: getTodayString(),
    },
    {
      key: "lastMonth",
      label: "Mês passado",
      from: getFirstDayOfLastMonth(),
      to: getLastDayOfLastMonth(),
    },
    { key: "allTime", label: "Todo o período", from: "", to: "" },
  ];
}

function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [yyyy, mm, dd] = parts;
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const monthName = months[parseInt(mm, 10) - 1];
  return `${dd} ${monthName}, ${yyyy}`;
}

function formatReferenceRangeForDisplay(from: string, to: string): string {
  const fromParts = from.split("-");
  const toParts = to.split("-");
  if (fromParts.length !== 3 || toParts.length !== 3) {
    return formatDateForDisplay(from) || formatDateForDisplay(to);
  }

  const shortMonths = [
    "jan.",
    "fev.",
    "mar.",
    "abr.",
    "mai.",
    "jun.",
    "jul.",
    "ago.",
    "set.",
    "out.",
    "nov.",
    "dez.",
  ];
  const fromMonth = shortMonths[Number(fromParts[1]) - 1] ?? fromParts[1];
  const toMonth = shortMonths[Number(toParts[1]) - 1] ?? toParts[1];

  if (from === to) {
    return `${Number(fromParts[2])} ${fromMonth} ${fromParts[0]}`;
  }

  return `${Number(fromParts[2])} ${fromMonth} — ${Number(toParts[2])} ${toMonth} ${toParts[0]}`;
}

function dateFromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day || 1);
}

const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function DateRangePicker({
  from,
  to,
  onChange,
  align = "left",
  className,
  minDate,
  maxDate,
  presets: suppliedPresets,
  referenceMonthSelection,
}: DateRangePickerProps) {
  const isReferenceMonthMode = referenceMonthSelection !== undefined;
  const presets = isReferenceMonthMode
    ? []
    : (suppliedPresets ?? getDefaultPresets());
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const [mounted] = useState(() => typeof document !== "undefined");

  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Calendar logic states
  const [viewDate, setViewDate] = useState<Date>(() =>
    from ? dateFromIso(from) : new Date(),
  );
  const [draftReferenceMonth, setDraftReferenceMonth] = useState(
    referenceMonthSelection?.referenceMonth,
  );

  const [tempFrom, setTempFrom] = useState<string>(from);
  const [tempTo, setTempTo] = useState<string>(to);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const activeReferenceMonth =
    draftReferenceMonth ?? referenceMonthSelection?.referenceMonth;
  const activeBounds =
    referenceMonthSelection && activeReferenceMonth
      ? referenceMonthSelection.getBounds(activeReferenceMonth)
      : { minDate, maxDate };
  const activeMinDate = activeBounds.minDate;
  const activeMaxDate = activeBounds.maxDate;
  const menuWidth = isReferenceMonthMode ? 390 : 440;
  const menuHeight = isReferenceMonthMode ? 430 : 350;

  const resetDraft = useCallback(() => {
    setTempFrom(from);
    setTempTo(to);
    setHoverDate(null);
    setDraftReferenceMonth(referenceMonthSelection?.referenceMonth);
    setViewDate(
      referenceMonthSelection?.referenceMonth
        ? dateFromIso(referenceMonthSelection.referenceMonth)
        : from
          ? dateFromIso(from)
          : new Date(),
    );
  }, [from, referenceMonthSelection, to]);

  const closeWithoutApplying = useCallback(() => {
    resetDraft();
    setOpen(false);
  }, [resetDraft]);

  useLayoutEffect(() => {
    if (!open) return;

    function recalc() {
      const trigger = wrapperRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();

      // Calculate viewport overflow to stay within screens, including narrow
      // mobile viewports where the menu must shrink instead of overflowing.
      const renderedWidth = Math.min(menuWidth, window.innerWidth - 20);
      let left = align === "right" ? rect.right - renderedWidth : rect.left;
      left = Math.max(
        10,
        Math.min(left, window.innerWidth - renderedWidth - 10),
      );

      const calendarHeight = menuHeight;
      let top = rect.bottom + 8;

      if (top + calendarHeight > window.innerHeight) {
        // If it doesn't fit below, check if it fits above
        if (rect.top - 8 - calendarHeight > 0) {
          top = rect.top - 8 - calendarHeight;
        } else {
          // If it fits neither, position it relative to viewport bottom with some padding
          top = Math.max(10, window.innerHeight - calendarHeight - 10);
        }
      }

      setPosition({
        left,
        top,
        width: renderedWidth,
      });
    }

    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [align, menuHeight, menuWidth, open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        wrapperRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      closeWithoutApplying();
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeWithoutApplying();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [closeWithoutApplying, open]);

  // Determine active preset (if any)
  const activePreset =
    presets.find((p) => {
      return p.from === tempFrom && p.to === tempTo;
    })?.key ?? (tempFrom || tempTo ? "custom" : "allTime");

  const constrainRangeToBounds = (nextFrom: string, nextTo: string) => {
    const constrainedFrom =
      activeMinDate && nextFrom && nextFrom < activeMinDate
        ? activeMinDate
        : activeMaxDate && nextFrom && nextFrom > activeMaxDate
          ? activeMaxDate
          : nextFrom;
    const constrainedTo =
      activeMinDate && nextTo && nextTo < activeMinDate
        ? activeMinDate
        : activeMaxDate && nextTo && nextTo > activeMaxDate
          ? activeMaxDate
          : nextTo;

    if (constrainedFrom && constrainedTo && constrainedFrom > constrainedTo) {
      return { from: constrainedTo, to: constrainedFrom };
    }

    return { from: constrainedFrom, to: constrainedTo };
  };

  const handlePresetSelect = (preset: DateRangePickerPreset) => {
    const value = constrainRangeToBounds(preset.from, preset.to);
    setTempFrom(value.from);
    setTempTo(value.to);

    // Autoapply for non-custom presets
    onChange?.(value.from, value.to);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempFrom("");
    setTempTo("");
    onChange?.("", "");
    setOpen(false);
  };

  const handleReferenceMonthChange = (nextReferenceMonth: string) => {
    if (!referenceMonthSelection) return;
    const nextRange =
      referenceMonthSelection.getDefaultRange(nextReferenceMonth);
    setDraftReferenceMonth(nextReferenceMonth);
    setTempFrom(nextRange.from);
    setTempTo(nextRange.to);
    setViewDate(dateFromIso(nextReferenceMonth));
    setHoverDate(null);
  };

  // Calendar calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = () => {
    const previousMonth = new Date(year, month - 1, 1);
    const previousMonthEnd = new Date(
      previousMonth.getFullYear(),
      previousMonth.getMonth() + 1,
      0,
    );
    const previousMonthEndIso = `${previousMonthEnd.getFullYear()}-${String(previousMonthEnd.getMonth() + 1).padStart(2, "0")}-${String(previousMonthEnd.getDate()).padStart(2, "0")}`;
    if (activeMinDate && previousMonthEndIso < activeMinDate) return;
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(year, month + 1, 1);
    const nextMonthStartIso = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
    if (activeMaxDate && nextMonthStartIso > activeMaxDate) return;
    setViewDate(new Date(year, month + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = new Date(year, month, 1).getDay(); // Sunday=0
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Create grid cells (42 total)
  const cells: { dateStr: string; day: number; isCurrentMonth: boolean }[] = [];

  // Previous month overflow days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonthIdx = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const dateStr = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ dateStr, day, isCurrentMonth: false });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ dateStr, day, isCurrentMonth: true });
  }

  // Next month overflow days to complete 42 cells
  const remaining = 42 - cells.length;
  for (let day = 1; day <= remaining; day++) {
    const nextMonthIdx = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    const dateStr = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ dateStr, day, isCurrentMonth: false });
  }

  const handleDayClick = (dateStr: string) => {
    if (
      (activeMinDate && dateStr < activeMinDate) ||
      (activeMaxDate && dateStr > activeMaxDate)
    ) {
      return;
    }

    // If no start date exists, or both are set, select starting date
    if (!tempFrom || (tempFrom && tempTo)) {
      setTempFrom(dateStr);
      setTempTo("");
    } else {
      // Start exists, we are picking the end date
      if (dateStr >= tempFrom) {
        setTempTo(dateStr);
      } else {
        // Clicked date is before start date -> set it as new start date
        setTempFrom(dateStr);
        setTempTo("");
      }
    }
  };

  const handleApply = () => {
    const value = constrainRangeToBounds(tempFrom, tempTo);
    if (
      isReferenceMonthMode &&
      referenceMonthSelection &&
      activeReferenceMonth
    ) {
      referenceMonthSelection.onApply({
        from: value.from,
        referenceMonth: activeReferenceMonth,
        to: value.to,
      });
      setOpen(false);
      return;
    }

    onChange?.(value.from, value.to);
    setOpen(false);
  };

  // Helper to check selection range
  const isSelected = (dateStr: string) =>
    dateStr === tempFrom || dateStr === tempTo;

  const isInRange = (dateStr: string) => {
    if (tempFrom && tempTo) {
      return dateStr > tempFrom && dateStr < tempTo;
    }
    // Preview range on hover if only start is selected
    if (tempFrom && !tempTo && hoverDate) {
      if (hoverDate >= tempFrom) {
        return dateStr > tempFrom && dateStr <= hoverDate;
      }
    }
    return false;
  };

  // Summary label
  const presetLabel = presets.find((p) => {
    return p.from === from && p.to === to;
  })?.label;

  const triggerLabel = presetLabel
    ? presetLabel === "Todo o período"
      ? "Todo o período"
      : presetLabel
    : from && to
      ? `${formatDateForDisplay(from)} — ${formatDateForDisplay(to)}`
      : from
        ? `Desde ${formatDateForDisplay(from)}`
        : to
          ? `Até ${formatDateForDisplay(to)}`
          : "Qualquer data";
  const referenceTriggerLabel =
    isReferenceMonthMode && from && to
      ? formatReferenceRangeForDisplay(from, to)
      : triggerLabel;

  const hasSelection = !!(from || to);

  const menu =
    open && position && mounted ? (
      <div
        ref={menuRef}
        role="dialog"
        aria-label="Selecionar período"
        className={cn(
          "fixed z-[1000] mt-0 flex select-none overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface-elevated shadow-[var(--shadow-xl)] animate-rise-in backdrop-blur-md",
          isReferenceMonthMode
            ? "h-[430px] w-[390px] max-w-[calc(100vw-20px)]"
            : "h-[350px] w-[440px] max-w-[calc(100vw-20px)]",
        )}
        style={{
          left: position.left,
          top: position.top,
          width: position.width,
        }}
      >
        {!isReferenceMonthMode ? (
          <div className="flex w-[150px] flex-col justify-between border-r border-border/60 bg-surface/30 p-1.5">
            <div className="space-y-0.5">
              {presets.map((preset) => {
                const isActive = activePreset === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      "w-full rounded-[var(--radius-sm)] px-2.5 py-1.5 text-left text-[11px] font-medium transition-all duration-[var(--transition-fast)]",
                      isActive
                        ? "bg-accent/10 font-semibold text-accent"
                        : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Calendar content */}
        <div className="flex flex-1 flex-col p-4 justify-between bg-white/40 dark:bg-transparent">
          {/* Month Selector */}
          <div className="space-y-2 pb-2">
            {isReferenceMonthMode && referenceMonthSelection ? (
              <label className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Mês de referência
                </span>
                <select
                  aria-label="Mês de referência"
                  className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-xs font-semibold text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  onChange={(event) =>
                    handleReferenceMonthChange(event.target.value)
                  }
                  value={activeReferenceMonth}
                >
                  {referenceMonthSelection.options.map((option) => (
                    <option key={option} value={option}>
                      {MONTHS_PT[Number(option.slice(5, 7)) - 1]}{" "}
                      {option.slice(0, 4)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold tracking-wider text-foreground">
                  {MONTHS_PT[month]} {year}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-strong text-foreground transition-colors hover:bg-foreground/5"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-strong text-foreground transition-colors hover:bg-foreground/5"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
            {isReferenceMonthMode ? (
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Início
                  </span>
                  <input
                    aria-label="Data inicial"
                    className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    max={activeMaxDate}
                    min={activeMinDate}
                    onChange={(event) => {
                      const nextFrom = event.target.value;
                      if (!nextFrom) return;
                      setTempFrom(nextFrom);
                      if (tempTo && nextFrom > tempTo) setTempTo(nextFrom);
                    }}
                    type="date"
                    value={tempFrom}
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                    Fim
                  </span>
                  <input
                    aria-label="Data final"
                    className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                    max={activeMaxDate}
                    min={activeMinDate}
                    onChange={(event) => {
                      const nextTo = event.target.value;
                      if (!nextTo) return;
                      setTempTo(nextTo);
                      if (tempFrom && nextTo < tempFrom) setTempFrom(nextTo);
                    }}
                    type="date"
                    value={tempTo}
                  />
                </label>
              </div>
            ) : null}
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAYS_PT.map((day) => (
              <span
                key={day}
                className="text-[10px] font-bold text-muted-foreground/60 uppercase"
              >
                {day}
              </span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-1 text-center py-2">
            {cells.map(({ dateStr, day, isCurrentMonth }) => {
              const selected = isSelected(dateStr);
              const inRange = isInRange(dateStr);
              const isStart = dateStr === tempFrom;
              const isEnd = dateStr === tempTo;
              const disabled =
                (activeMinDate !== undefined && dateStr < activeMinDate) ||
                (activeMaxDate !== undefined && dateStr > activeMaxDate);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleDayClick(dateStr)}
                  onMouseEnter={() =>
                    !disabled && tempFrom && !tempTo && setHoverDate(dateStr)
                  }
                  onMouseLeave={() => setHoverDate(null)}
                  disabled={disabled}
                  className={cn(
                    "relative flex h-7 items-center justify-center text-[11px] transition-all duration-[var(--transition-fast)] outline-none",
                    !isCurrentMonth && "opacity-35",
                    disabled &&
                      "cursor-not-allowed opacity-25 hover:bg-transparent",
                    // In range highlighting
                    inRange && "bg-accent/10 text-accent font-medium",
                    inRange && isCurrentMonth && "hover:bg-accent/20",
                    // Selected date styling
                    selected && "bg-accent text-accent-foreground font-bold",
                    // Hover styling for general days
                    !selected && !inRange && "hover:bg-foreground/5 rounded-md",
                    // Round edges of select range
                    isStart && tempTo && "rounded-l-md",
                    isEnd && tempFrom && "rounded-r-md",
                    selected && !tempTo && !tempFrom && "rounded-md",
                    selected && tempFrom && !tempTo && "rounded-md",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between border-t border-border/50 pt-3">
            <div className="flex flex-col text-[10px] text-muted-foreground truncate max-w-[120px]">
              {tempFrom ? (
                <>
                  <span>De: {formatDateForDisplay(tempFrom)}</span>
                  {tempTo ? (
                    <span>Até: {formatDateForDisplay(tempTo)}</span>
                  ) : (
                    <span>Selecione fim...</span>
                  )}
                </>
              ) : (
                <span>Selecione período</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={closeWithoutApplying}
                className="rounded-md border border-border px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground transition-all hover:border-border-strong hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={isReferenceMonthMode && (!tempFrom || !tempTo)}
                className="rounded-md bg-accent px-2.5 py-1.5 text-[10px] font-bold text-accent-foreground shadow-sm transition-all hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div className={cn("relative inline-flex", className)} ref={wrapperRef}>
      <div
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            closeWithoutApplying();
            return;
          }
          resetDraft();
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (open) {
              closeWithoutApplying();
              return;
            }
            resetDraft();
            setOpen(true);
          }
        }}
        className={cn(
          "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border bg-background pl-2.5 pr-2.5 text-sm transition-all duration-[var(--transition-fast)] outline-none hover:border-border-strong focus-visible:ring-2 focus-visible:ring-accent/40",
          hasSelection
            ? "border-accent/40 text-foreground ring-1 ring-inset ring-accent/15"
            : "border-border text-foreground",
          open && "border-accent/60 ring-2 ring-accent/20",
        )}
      >
        <Calendar
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-colors",
            hasSelection ? "text-accent" : "text-muted-foreground/70",
          )}
        />
        <span className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70 md:inline">
          Período
        </span>
        <span
          aria-hidden
          className="hidden h-3 w-px shrink-0 bg-border/70 md:inline-block"
        />
        <span className="max-w-[170px] truncate font-medium text-foreground text-xs">
          {referenceTriggerLabel}
        </span>
        {hasSelection && !isReferenceMonthMode ? (
          <button
            type="button"
            onClick={handleClear}
            className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
            aria-label="Limpar datas"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <ChevronRight
            className={cn(
              "h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-[var(--transition-fast)] rotate-90",
              open && "rotate-270 text-accent",
            )}
          />
        )}
      </div>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
