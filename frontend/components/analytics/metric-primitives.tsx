"use client";

import type React from "react";
import { CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function MetricLabel({
  label,
  tooltip,
  className,
}: {
  label: string;
  tooltip: string;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`About ${label}`}
          >
            <CircleHelp className="size-3.5 shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-pretty">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export function StatCell({
  label,
  tooltip,
  value,
  valueClassName,
  subValue,
  subTooltip,
}: {
  label: string;
  tooltip: string;
  value: string;
  valueClassName?: string;
  subValue?: string;
  subTooltip?: string;
}): React.JSX.Element {
  return (
    <div className="space-y-1">
      <MetricLabel label={label} tooltip={tooltip} />
      <p className={cn("text-xl font-semibold font-mono tabular-nums md:text-2xl", valueClassName)}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-muted-foreground font-mono tabular-nums">
          {subTooltip ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="underline decoration-dotted underline-offset-2">
                  {subValue}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                {subTooltip}
              </TooltipContent>
            </Tooltip>
          ) : (
            subValue
          )}
        </p>
      )}
    </div>
  );
}
