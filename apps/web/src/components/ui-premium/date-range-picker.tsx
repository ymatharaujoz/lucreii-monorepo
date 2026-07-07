"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@lucreii/ui";

export interface DateRangePickerProps {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  onChange: (from: string, to: string) => void;
  align?: "left" | "right";
  className?: string;
  minDate?: string;
  maxDate?: string;
  hasRangeError?: boolean;
  rangeErrorId?: string;
}

type PresetKey = "today" | "yesterday" | "last7d" | "last30d" | "thisMonth" | "lastMonth" | "allTime" | "custom";

interface PresetOption {
  key: PresetKey;
  label: string;
  getValue: () => { from: string; to: string };
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

const presets: PresetOption[] = [
  { key: "today", label: "Hoje", getValue: () => ({ from: getTodayString(), to: getTodayString() }) },
  { key: "yesterday", label: "Ontem", getValue: () => ({ from: getYesterdayString(), to: getYesterdayString() }) },
  { key: "last7d", label: "Últimos 7 dias", getValue: () => ({ from: getDaysAgoString(6), to: getTodayString() }) },
  { key: "last30d", label: "Últimos 30 dias", getValue: () => ({ from: getDaysAgoString(29), to: getTodayString() }) },
  { key: "thisMonth", label: "Este mês", getValue: () => ({ from: getFirstDayOfThisMonth(), to: getTodayString() }) },
  { key: "lastMonth", label: "Mês passado", getValue: () => ({ from: getFirstDayOfLastMonth(), to: getLastDayOfLastMonth() }) },
  { key: "allTime", label: "Todo o período", getValue: () => ({ from: "", to: "" }) },
];

function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [yyyy, mm, dd] = parts;
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez"
  ];
  const monthName = months[parseInt(mm, 10) - 1];
  return `${dd} ${monthName}, ${yyyy}`;
}

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function DateRangePicker({
  from,
  to,
  onChange,
  align = "left",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Calendar logic states
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (from) {
      const [y, m, d] = from.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  const [tempFrom, setTempFrom] = useState<string>(from);
  const [tempTo, setTempTo] = useState<string>(to);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update temp ranges when external props change
  useEffect(() => {
    setTempFrom(from);
    setTempTo(to);
  }, [from, to]);

  useLayoutEffect(() => {
    if (!open) return;

    function recalc() {
      const trigger = wrapperRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      
      // Calculate viewport overflow to stay within screens
      let left = align === "right" ? rect.right - 440 : rect.left;
      if (left < 10) left = 10;
      if (left + 440 > window.innerWidth) {
        left = window.innerWidth - 450;
      }

      // Height of the calendar menu is 350px
      const calendarHeight = 350;
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
        width: rect.width,
      });
    }

    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [open, align]);

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
      setOpen(false);
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Determine active preset (if any)
  const activePreset = presets.find((p) => {
    const val = p.getValue();
    return val.from === tempFrom && val.to === tempTo;
  })?.key ?? (tempFrom || tempTo ? "custom" : "allTime");

  const handlePresetSelect = (preset: PresetOption) => {
    const val = preset.getValue();
    setTempFrom(val.from);
    setTempTo(val.to);
    
    // Autoapply for non-custom presets
    onChange(val.from, val.to);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempFrom("");
    setTempTo("");
    onChange("", "");
    setOpen(false);
  };

  // Calendar calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
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
    onChange(tempFrom, tempTo);
    setOpen(false);
  };

  // Helper to check selection range
  const isSelected = (dateStr: string) => dateStr === tempFrom || dateStr === tempTo;
  
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

  const isRangeEdge = (dateStr: string) => {
    return dateStr === tempFrom || dateStr === tempTo;
  };

  // Summary label
  const presetLabel = presets.find((p) => {
    const val = p.getValue();
    return val.from === from && val.to === to;
  })?.label;

  const triggerLabel = presetLabel 
    ? (presetLabel === "Todo o período" ? "Todo o período" : presetLabel)
    : from && to 
      ? `${formatDateForDisplay(from)} — ${formatDateForDisplay(to)}`
      : from 
        ? `Desde ${formatDateForDisplay(from)}`
        : to 
          ? `Até ${formatDateForDisplay(to)}`
          : "Qualquer data";

  const hasSelection = !!(from || to);

  const menu = open && position && mounted ? (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-[1000] mt-0 flex h-[350px] w-[440px] select-none overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface-elevated shadow-[var(--shadow-xl)] animate-rise-in backdrop-blur-md"
      )}
      style={{
        left: position.left,
        top: position.top,
      }}
    >
      {/* Sidebar presets */}
      <div className="flex w-[150px] flex-col border-r border-border/60 bg-surface/30 p-1.5 justify-between">
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
                    ? "bg-accent/10 text-accent font-semibold"
                    : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar content */}
      <div className="flex flex-1 flex-col p-4 justify-between bg-white/40 dark:bg-transparent">
        {/* Month Selector */}
        <div className="flex items-center justify-between pb-2">
          <span className="text-[12px] font-bold tracking-wider text-foreground">
            {MONTHS_PT[month]} {year}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-strong hover:bg-foreground/5 text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface-strong hover:bg-foreground/5 text-foreground transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {WEEKDAYS_PT.map((day) => (
            <span key={day} className="text-[10px] font-bold text-muted-foreground/60 uppercase">
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

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => handleDayClick(dateStr)}
                onMouseEnter={() => tempFrom && !tempTo && setHoverDate(dateStr)}
                onMouseLeave={() => setHoverDate(null)}
                className={cn(
                  "relative flex h-7 items-center justify-center text-[11px] transition-all duration-[var(--transition-fast)] outline-none",
                  !isCurrentMonth && "opacity-35",
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
                  selected && tempFrom && !tempTo && "rounded-md"
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
                {tempTo ? <span>Até: {formatDateForDisplay(tempTo)}</span> : <span>Selecione fim...</span>}
              </>
            ) : (
              <span>Selecione período</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-border px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground transition-all hover:border-border-strong hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-md bg-accent px-2.5 py-1.5 text-[10px] font-bold text-accent-foreground shadow-sm transition-all hover:bg-accent-strong"
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
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
        className={cn(
          "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] border bg-background pl-2.5 pr-2.5 text-sm transition-all duration-[var(--transition-fast)] outline-none hover:border-border-strong focus-visible:ring-2 focus-visible:ring-accent/40",
          hasSelection
            ? "border-accent/40 text-foreground ring-1 ring-inset ring-accent/15"
            : "border-border text-foreground",
          open && "border-accent/60 ring-2 ring-accent/20"
        )}
      >
        <Calendar
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-colors",
            hasSelection ? "text-accent" : "text-muted-foreground/70"
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
          {triggerLabel}
        </span>
        {hasSelection ? (
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
              open && "rotate-270 text-accent"
            )}
          />
        )}
      </div>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
