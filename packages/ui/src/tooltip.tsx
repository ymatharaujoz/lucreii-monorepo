"use client";

import { type ReactNode, useState } from "react";
import { cn } from "./utils";

export type TooltipProps = {
  align?: "center" | "start" | "end";
  children: ReactNode;
  className?: string;
  content: string;
  position?: "top" | "bottom";
};

export function Tooltip({
  align = "center",
  children,
  className,
  content,
  position = "top",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);

  const alignmentStyles = {
    center: "left-1/2 -translate-x-1/2",
    start: "left-0",
    end: "right-0",
  };

  const arrowAlignmentStyles = {
    center: "left-1/2 -translate-x-1/2",
    start: "left-4",
    end: "right-4",
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          className={cn(
            "absolute z-50 w-80 max-w-[calc(100vw-2rem)] whitespace-normal rounded-xl bg-foreground/95 px-3.5 py-3 text-left text-[13px] font-medium normal-case leading-5 tracking-normal text-background ring-1 ring-border/20 shadow-[0_18px_40px_rgba(13,148,136,0.18)] animate-fade-in",
            position === "top" ? "bottom-full mb-2.5" : "top-full mt-2.5",
            alignmentStyles[align],
            className,
          )}
          role="tooltip"
        >
          {content}
          <span
            aria-hidden="true"
            className={cn(
              "absolute h-2.5 w-2.5 rotate-45 bg-foreground/95",
              position === "top" ? "-bottom-1" : "-top-1",
              arrowAlignmentStyles[align],
            )}
          />
        </span>
      )}
    </span>
  );
}
