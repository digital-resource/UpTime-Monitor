"use client";
import { Shield, ShieldAlert, ShieldOff, ShieldCheck, MoreHorizontal, ExternalLink, Play, Pencil, Clock, AlertCircle, History, Copy, Trash2, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/websites/StatusBadge";
import { cn } from "@/lib/utils";
import {
  formatRelativeTime,
  formatResponseTime,
  getProviderLabel,
  getSourceLabel,
} from "@/lib/utils/formatters";
import type { Website } from "@/lib/types";

interface WebsiteRowProps {
  website: Website;
  isSelected: boolean;
  onSelectChange: (checked: boolean) => void;
  onRunCheck: (id: string) => void;
  onPauseResume: (id: string, isPaused: boolean) => void;
  onDelete: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
}

function HttpStatusCell({ status }: { status: number | null }) {
  if (status === null) return <span className="text-zinc-500 font-mono text-xs">—</span>;
  const colorClass =
    status >= 200 && status < 300
      ? "text-emerald-400"
      : status >= 400 && status < 500
      ? "text-amber-400"
      : status >= 500
      ? "text-rose-400"
      : "text-zinc-400";
  return <span className={cn("font-mono text-xs", colorClass)}>{status}</span>;
}

function ResponseTimeCell({ ms }: { ms: number | null }) {
  if (ms === null) return <span className="text-zinc-500 font-mono text-xs">—</span>;
  const colorClass =
    ms < 500 ? "text-emerald-400" : ms <= 2000 ? "text-amber-400" : "text-rose-400";
  return <span className={cn("font-mono text-xs", colorClass)}>{formatResponseTime(ms)}</span>;
}

function SslCell({ ssl }: { ssl: Website["ssl"] }) {
  if (!ssl) return <span className="text-zinc-600 text-xs">—</span>;
  if (!ssl.valid || ssl.daysRemaining === null) {
    return (
      <span className="inline-flex items-center gap-1 text-rose-400 text-xs">
        <ShieldOff className="w-3.5 h-3.5" />
        <span className="font-mono">Invalid</span>
      </span>
    );
  }
  if (ssl.daysRemaining <= 30) {
    return (
      <span className="inline-flex items-center gap-1 text-amber-400 text-xs">
        <ShieldAlert className="w-3.5 h-3.5" />
        <span className="font-mono">{ssl.daysRemaining}d</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
      <ShieldCheck className="w-3.5 h-3.5" />
      <span className="font-mono">{ssl.daysRemaining}d</span>
    </span>
  );
}

function UptimeCell({ uptime }: { uptime: number | null }) {
  if (uptime === null) return <span className="text-zinc-500 font-mono text-xs">—</span>;
  const colorClass =
    uptime >= 99.9 ? "text-emerald-400" : uptime >= 99 ? "text-amber-400" : "text-rose-400";
  return <span className={cn("font-mono text-xs", colorClass)}>{uptime.toFixed(2)}%</span>;
}

const MONITORING_STATE_COLORS: Record<Website["monitoringState"], string> = {
  enabled: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paused: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  disabled: "bg-zinc-800 text-zinc-600 border-zinc-700",
};

const MONITORING_STATE_LABELS: Record<Website["monitoringState"], string> = {
  enabled: "Monitoring",
  paused: "Paused",
  disabled: "Disabled",
};

export function WebsiteRow({
  website,
  isSelected,
  onSelectChange,
  onRunCheck,
  onPauseResume,
  onDelete,
  onDuplicate,
}: WebsiteRowProps) {
  const isPaused = website.monitoringState === "paused";

  return (
    <div className="grid grid-cols-[32px_auto_1fr_auto_auto_auto_auto_auto_auto_auto_auto_auto_auto] gap-x-3 px-4 py-3 items-center hover:bg-zinc-800/30 transition-colors group text-sm">
      {/* Checkbox */}
      <div className="flex items-center justify-center">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(v) => onSelectChange(Boolean(v))}
          className="border-zinc-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
        />
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        <StatusBadge status={website.status} size="sm" />
      </div>

      {/* Name + URL */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-100 truncate">{website.name}</p>
        <p className="text-xs text-zinc-500 font-mono truncate mt-0.5">{website.url}</p>
      </div>

      {/* Client */}
      <div className="text-xs text-zinc-400 truncate max-w-[100px]">
        {website.client ?? <span className="text-zinc-600">—</span>}
      </div>

      {/* Source */}
      <div>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-700/50 text-zinc-400 border border-zinc-700">
          {getSourceLabel(website.source)}
        </span>
      </div>

      {/* Provider */}
      <div>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
          {getProviderLabel(website.provider)}
        </span>
      </div>

      {/* HTTP Status */}
      <div className="text-right">
        <HttpStatusCell status={website.httpStatus} />
      </div>

      {/* Response Time */}
      <div className="text-right">
        <ResponseTimeCell ms={website.responseTime} />
      </div>

      {/* SSL */}
      <div className="text-right">
        <SslCell ssl={website.ssl} />
      </div>

      {/* Uptime 30D */}
      <div className="text-right">
        <UptimeCell uptime={website.uptime30d} />
      </div>

      {/* Last Checked */}
      <div className="text-right">
        <span className="text-xs text-zinc-500">
          {formatRelativeTime(website.lastCheckedAt)}
        </span>
      </div>

      {/* Monitoring State */}
      <div>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
            MONITORING_STATE_COLORS[website.monitoringState]
          )}
        >
          {MONITORING_STATE_LABELS[website.monitoringState]}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-600 hover:text-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#27272A] border-[#3F3F46] w-52">
            <DropdownMenuItem
              className="text-zinc-100 hover:bg-zinc-700 cursor-pointer gap-2"
              onClick={() => window.open(website.url, "_blank")}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Details
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-zinc-100 hover:bg-zinc-700 cursor-pointer gap-2"
              onClick={() => onRunCheck(website.id)}
            >
              <Play className="w-3.5 h-3.5" /> Run Manual Check
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#3F3F46]" />
            <DropdownMenuItem className="text-zinc-100 hover:bg-zinc-700 cursor-pointer gap-2">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-zinc-100 hover:bg-zinc-700 cursor-pointer gap-2"
              onClick={() => onPauseResume(website.id, isPaused)}
            >
              {isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5" /> Resume
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem className="text-zinc-100 hover:bg-zinc-700 cursor-pointer gap-2">
              <Clock className="w-3.5 h-3.5" /> Enter Maintenance Mode
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#3F3F46]" />
            <DropdownMenuItem className="text-zinc-100 hover:bg-zinc-700 cursor-pointer gap-2">
              <AlertCircle className="w-3.5 h-3.5" /> View Incidents
            </DropdownMenuItem>
            <DropdownMenuItem className="text-zinc-100 hover:bg-zinc-700 cursor-pointer gap-2">
              <History className="w-3.5 h-3.5" /> View Check History
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#3F3F46]" />
            <DropdownMenuItem
              className="text-zinc-100 hover:bg-zinc-700 cursor-pointer gap-2"
              onClick={() => onDuplicate(website.id)}
            >
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-rose-400 hover:bg-rose-500/10 cursor-pointer gap-2"
              onClick={() => onDelete(website.id, website.name)}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
