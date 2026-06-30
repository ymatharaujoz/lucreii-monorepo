"use client";

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Store, X } from "lucide-react";
import { cn } from "@lucreii/ui";

export type MultiSelectOption = {
  id: string;
  label: string;
  icon?: ReactNode;
  swatch?: string;
};

type MenuPosition = {
  left: number;
  top: number;
  width: number;
};

export type MultiSelectDropdownProps = {
  align?: "left" | "right";
  className?: string;
  emptyLabel?: string;
  label?: string;
  menuClassName?: string;
  onChange: (selected: string[]) => void;
  options: MultiSelectOption[];
  selected: string[];
  triggerIcon?: ReactNode;
};

export function MultiSelectDropdown({
  align = "left",
  className,
  emptyLabel = "Todos",
  label,
  menuClassName,
  onChange,
  options,
  selected,
  triggerIcon,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;

    function recalc() {
      const trigger = wrapperRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      setPosition({
        left: align === "right" ? rect.right : rect.left,
        top: rect.bottom + 8,
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

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((entry) => entry !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const allSelected = selected.length === options.length;
  const hasSelection = selected.length > 0;
  const summary = !hasSelection
    ? emptyLabel
    : selected.length === 1
      ? options.find((option) => option.id === selected[0])?.label ?? emptyLabel
      : `${selected.length} ${label?.toLowerCase() ?? "selecionados"}`;

  const trigger = (
    <div
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-md)] border bg-background px-2.5 text-sm transition-all duration-[var(--transition-fast)]",
        hasSelection
          ? "border-accent/40 text-foreground ring-1 ring-inset ring-accent/15"
          : "border-border text-foreground hover:border-border-strong",
        open && "border-accent/60 ring-2 ring-accent/20",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center transition-colors",
          hasSelection ? "text-accent" : "text-muted-foreground/70",
        )}
      >
        {triggerIcon ?? <Store className="h-3.5 w-3.5" />}
      </span>
      {label ? (
        <span className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70 md:inline">
          {label}
        </span>
      ) : null}
      <span
        className={cn(
          "max-w-[140px] truncate font-medium",
          hasSelection ? "text-foreground" : "text-foreground",
        )}
        title={summary}
      >
        {summary}
      </span>
      {hasSelection ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onChange([]);
          }}
          className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground"
          aria-label="Limpar seleção"
        >
          <X className="h-3 w-3" />
        </button>
      ) : (
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-[var(--transition-fast)]",
            open && "rotate-180 text-accent",
          )}
        />
      )}
    </div>
  );

  const menu = open && position && mounted ? (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-[1000] mt-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface-strong shadow-[var(--shadow-lg)] animate-rise-in",
        align === "right" ? "-translate-x-full" : "translate-x-0",
        menuClassName,
      )}
      role="menu"
      style={{
        left: position.left,
        minWidth: Math.max(position.width, 220),
        top: position.top,
      }}
    >
      <div className="max-h-[320px] overflow-y-auto p-1.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-foreground/15 hover:[&::-webkit-scrollbar-thumb]:bg-foreground/30">
        <button
          type="button"
          onClick={() => onChange(allSelected ? [] : options.map((option) => option.id))}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm transition-colors",
            !hasSelection
              ? "bg-foreground/[0.04] text-foreground"
              : "text-foreground hover:bg-foreground/[0.04]",
          )}
          role="menuitem"
        >
          <span
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
              !hasSelection
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-background",
            )}
          >
            {!hasSelection ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
          </span>
          <span className="flex-1 font-medium">Todos os canais</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {options.length}
          </span>
        </button>

        <div className="my-1 h-px bg-border/60" />

        {options.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm transition-colors",
                isSelected
                  ? "bg-foreground/[0.04] text-foreground"
                  : "text-foreground hover:bg-foreground/[0.04]",
              )}
              role="menuitem"
              aria-pressed={isSelected}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                  isSelected
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-background",
                )}
              >
                {isSelected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
              </span>
              {option.swatch ? (
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full ring-1 ring-inset ring-foreground/10"
                  style={{ backgroundColor: option.swatch }}
                />
              ) : option.icon ? (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
                  {option.icon}
                </span>
              ) : null}
              <span className="flex-1 font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>

      {hasSelection ? (
        <div className="flex items-center justify-between border-t border-border/60 bg-surface/40 px-2.5 py-2 text-xs">
          <span className="text-muted-foreground">
            {selected.length} de {options.length} selecionados
          </span>
          <button
            type="button"
            onClick={() => onChange([])}
            className="font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Limpar
          </button>
        </div>
      ) : null}
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
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex cursor-pointer items-center outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {trigger}
      </div>

      {mounted && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
