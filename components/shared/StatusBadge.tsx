import { cn } from "@/lib/utils";
import { getStatusBgColor, getStatusLabel } from "@/lib/utils/formatters";
import type { WebsiteStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: WebsiteStatus;
  className?: string;
  showDot?: boolean;
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

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
        getStatusBgColor(status),
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full flex-shrink-0",
            STATUS_DOT_COLORS[status],
            status === "up" && "animate-pulse"
          )}
        />
      )}
      {getStatusLabel(status)}
    </span>
  );
}
