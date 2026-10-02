import { ChevronDown } from "lucide-react";
import { cn } from "@lucreii/ui";

interface VariationToggleProps {
  count: number;
  expanded: boolean;
  onToggle: () => void;
}

/** "N variações" button with chevron, shown under a parent product name. */
export function VariationToggle({
  count,
  expanded,
  onToggle,
}: VariationToggleProps) {
  return (
    <button
      aria-expanded={expanded}
      aria-label={`${expanded ? "Recolher" : "Expandir"} variações`}
      className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground transition-colors hover:text-foreground"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      type="button"
    >
      <span>
        {count} {count === 1 ? "variação" : "variações"}
      </span>
      <ChevronDown
        className={cn(
          "h-3.5 w-3.5 transition-transform duration-[var(--transition-fast)]",
          expanded && "rotate-180",
        )}
      />
    </button>
  );
}

/** Tree connector (GitHub worktree style) drawn before a variation row. */
export function TreeConnector({ isLast }: { isLast: boolean }) {
  return (
    <div className="relative flex h-10 w-8 shrink-0 items-center justify-center">
      <div
        className={cn(
          "absolute left-[11px] top-0 w-px bg-muted-foreground/25",
          isLast ? "h-1/2" : "h-full",
        )}
      />
      <div className="absolute left-[11px] top-1/2 flex -translate-y-1/2 items-center">
        <div className="h-px w-3 bg-muted-foreground/25" />
        <div className="h-2 w-2 rounded-full border border-muted-foreground/40 bg-muted-foreground/20" />
      </div>
    </div>
  );
}
