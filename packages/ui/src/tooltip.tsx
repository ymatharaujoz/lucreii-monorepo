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
            "absolute z-50 w-72 max-w-[calc(100vw-2rem)] whitespace-normal break-words rounded-md bg-neutral-700 px-3 py-2 text-left text-sm font-medium normal-case leading-5 tracking-normal text-white shadow-sm animate-fade-in",
            position === "top" ? "bottom-full mb-2" : "top-full mt-2",
            alignmentStyles[align],
            className,
          )}
          role="tooltip"
        >
          {content}
        </span>
      )}
    </span>
  );
}
