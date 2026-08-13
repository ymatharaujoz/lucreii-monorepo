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
            "absolute z-50 w-72 max-w-[calc(100vw-2rem)] whitespace-normal break-words rounded-md px-3 py-2 text-left text-sm font-medium normal-case leading-5 tracking-normal animate-fade-in",
            position === "top" ? "bottom-full mb-2" : "top-full mt-2",
            alignmentStyles[align],
            className,
          )}
          role="tooltip"
          style={{
            backgroundColor: "var(--tooltip-background, #2f3733)",
            border: "1px solid var(--tooltip-border, rgba(255, 255, 255, 0.1))",
            boxShadow: "var(--tooltip-shadow, 0 12px 28px rgba(15, 25, 22, 0.24))",
            color: "var(--tooltip-foreground, #f8faf9)",
            opacity: 1,
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}
