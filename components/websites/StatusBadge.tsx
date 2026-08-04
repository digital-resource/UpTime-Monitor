"use client";
import { cn } from "@/lib/utils";
import { getStatusBgColor, getStatusLabel } from "@/lib/utils/formatters";
import type { WebsiteStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: WebsiteStatus;
  showDot?: boolean;
  size?: "sm" | "md";
}

const STATUS_DOT_COLORS: Record<WebsiteStatus, string> = {
  up: "bg-emerald-500",
  down: "bg-rose-500",
  degraded: "bg-amber-500",
  paused: "bg-zinc-500",
  pending: "bg-violet-500",
  maintenance: "bg-blue-500",
  never_checked: "bg-zinc-600",
  disabled: "bg-zinc-700",
  unknown: "bg-zinc-600",
};

export function StatusBadge({ status, showDot = true, size = "sm" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide",
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        getStatusBgColor(status)
      )}
    >
      {showDot && (
        <span
          className={cn(
            "rounded-full flex-shrink-0",
            size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
            STATUS_DOT_COLORS[status],
            status === "up" && "animate-pulse"
          )}
        />
      )}
      {getStatusLabel(status)}
    </span>
  );
}
