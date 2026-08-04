"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  Database,
  GitBranch,
  Hash,
  LayoutTemplate,
  Mail,
  RefreshCw,
  Rocket,
  Search,
  Shield,
  Triangle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { integrationService } from "@/lib/services/integrationService";
import { formatRelativeTime } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { SyncRun, SyncLog, SyncResult, SyncTrigger } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDurationShort(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatMonoDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return "—";
  }
}

// ─── Integration icon ─────────────────────────────────────────────────────────

function IntegIcon({ provider }: { provider: string }) {
  const lower = provider.toLowerCase();
  const cls = "w-4 h-4 flex-shrink-0";
  if (lower.includes("cloudflare")) return <Shield className={cn(cls, "text-orange-400")} />;
  if (lower.includes("rocket")) return <Rocket className={cn(cls, "text-blue-400")} />;
  if (lower.includes("webflow")) return <LayoutTemplate className={cn(cls, "text-purple-400")} />;
  if (lower.includes("slack")) return <Hash className={cn(cls, "text-emerald-400")} />;
  if (lower.includes("mailgun") || lower.includes("mail")) return <Mail className={cn(cls, "text-rose-400")} />;
  if (lower.includes("vercel")) return <Triangle className={cn(cls, "text-zinc-100")} />;
  if (lower.includes("supabase")) return <Database className={cn(cls, "text-green-400")} />;
  if (lower.includes("github")) return <GitBranch className={cn(cls, "text-zinc-300")} />;
  return <RefreshCw className={cn(cls, "text-zinc-500")} />;
}

// ─── Result badge ─────────────────────────────────────────────────────────────

function ResultBadge({ result }: { result: SyncResult | null }) {
  if (!result) {
    return (
      <span className="inline-flex items-center rounded-full border text-[11px] uppercase tracking-wide px-2.5 py-0.5 font-medium bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1">
        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
        In Progress
      </span>
    );
  }
  const map: Record<SyncResult, string> = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    failed: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    partial: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    cancelled: "bg-zinc-800 text-zinc-500 border-zinc-700",
  };
  const labels: Record<SyncResult, string> = {
    success: "Success",
    failed: "Failed",
    partial: "Partial",
    cancelled: "Cancelled",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border text-[11px] uppercase tracking-wide px-2.5 py-0.5 font-medium",
        map[result]
      )}
    >
      {labels[result]}
    </span>
  );
}

// ─── Trigger chip ─────────────────────────────────────────────────────────────

function TriggerChip({ trigger }: { trigger: SyncTrigger }) {
  const map: Record<SyncTrigger, string> = {
    scheduled: "bg-zinc-800 text-zinc-400 border-zinc-700",
    manual: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    webhook: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border text-[11px] uppercase tracking-wide px-2.5 py-0.5 font-medium",
        map[trigger]
      )}
    >
      {trigger === "scheduled" ? "Scheduled" : trigger === "manual" ? "Manual" : "Webhook"}
    </span>
  );
}

// ─── Log line ─────────────────────────────────────────────────────────────────

function LogLine({ log }: { log: SyncLog }) {
  const levelColor: Record<SyncLog["level"], string> = {
    info: "text-blue-400",
    warn: "text-amber-400",
    error: "text-rose-400",
    debug: "text-zinc-600",
  };

  return (
    <div className="flex gap-2 leading-relaxed">
      <span className="text-zinc-600 whitespace-nowrap">{formatMonoDateTime(log.timestamp)}</span>
      <span className={cn("font-semibold whitespace-nowrap", levelColor[log.level])}>
        [{log.level.toUpperCase()}]
      </span>
      <span className="text-zinc-300">{log.message}</span>
    </div>
  );
}

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

function SyncRunDetailSheet({
  run,
  open,
  onClose,
}: {
  run: SyncRun | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!run) return null;

  const summaryCards = [
    { label: "Added", value: run.added, color: "text-emerald-400" },
    { label: "Updated", value: run.updated, color: "text-blue-400" },
    { label: "Skipped", value: run.skipped, color: "text-zinc-400" },
    { label: "Failed", value: run.failed, color: run.failed > 0 ? "text-rose-400" : "text-zinc-400" },
  ];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl bg-[#09090B] border-[#27272A] overflow-y-auto"
      >
        <SheetHeader className="pb-4 border-b border-[#27272A]">
          <div className="flex items-center gap-2">
            <IntegIcon provider={run.provider} />
            <SheetTitle className="text-zinc-50 text-base font-semibold">
              {run.integrationName}
            </SheetTitle>
            <ResultBadge result={run.result} />
          </div>
          <div className="flex gap-4 text-[11px] text-zinc-500 font-mono mt-2">
            <span>Started: {formatMonoDateTime(run.startedAt)}</span>
            {run.completedAt && (
              <span>Completed: {formatMonoDateTime(run.completedAt)}</span>
            )}
          </div>
        </SheetHeader>

        {/* Summary cards */}
        <div className="py-5 grid grid-cols-4 gap-3">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="bg-[#18181B] border border-[#27272A] rounded-xl px-3 py-3 text-center"
            >
              <p className={cn("text-xl font-bold font-mono", card.color)}>{card.value}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                {card.label}
              </p>
            </div>
          ))}
        </div>

        {/* Log output */}
        <div>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Log Output
          </p>
          <div className="bg-[#09090B] border border-[#27272A] rounded-xl p-4 font-mono text-xs overflow-y-auto max-h-80 space-y-1">
            {run.logs.length === 0 ? (
              <p className="text-zinc-600">No log entries.</p>
            ) : (
              run.logs.map((log) => <LogLine key={log.id} log={log} />)
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function SyncLogsView() {
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [integrationFilter, setIntegrationFilter] = useState<string>("all");
  const [selectedRun, setSelectedRun] = useState<SyncRun | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await integrationService.listSyncRuns("all");
      setRuns(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const integrationNames = Array.from(new Set(runs.map((r) => r.integrationName)));

  const filtered = runs.filter((r) => {
    if (search && !r.integrationName.toLowerCase().includes(search.toLowerCase())) return false;
    if (resultFilter !== "all" && r.result !== resultFilter) return false;
    if (integrationFilter !== "all" && r.integrationName !== integrationFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#27272A] bg-[#09090B] flex-shrink-0 flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold text-zinc-50"
            style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}
          >
            Sync Logs
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Integration sync history and diagnostic output
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={load}
          className="h-9 w-9 text-zinc-500 hover:text-zinc-100 mt-0.5"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap mb-6">
          {/* Integration filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-[#27272A] text-zinc-400 hover:text-zinc-100 bg-transparent gap-1.5"
              >
                {integrationFilter === "all" ? "All Integrations" : integrationFilter}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="bg-[#18181B] border-[#27272A] text-zinc-300 text-xs"
            >
              <DropdownMenuItem onClick={() => setIntegrationFilter("all")}>
                All Integrations
              </DropdownMenuItem>
              {integrationNames.map((name) => (
                <DropdownMenuItem key={name} onClick={() => setIntegrationFilter(name)}>
                  {name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Result filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-[#27272A] text-zinc-400 hover:text-zinc-100 bg-transparent gap-1.5"
              >
                {resultFilter === "all" ? "All Results" : resultFilter.charAt(0).toUpperCase() + resultFilter.slice(1)}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="bg-[#18181B] border-[#27272A] text-zinc-300 text-xs"
            >
              {["all", "success", "failed", "partial", "cancelled"].map((r) => (
                <DropdownMenuItem key={r} onClick={() => setResultFilter(r)}>
                  {r === "all" ? "All Results" : r.charAt(0).toUpperCase() + r.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search integrations…"
              className="h-8 pl-8 pr-3 bg-[#18181B] border border-[#27272A] text-zinc-200 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-600 w-48"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#27272A]">
                  {[
                    "Integration",
                    "Started",
                    "Completed",
                    "Duration",
                    "Trigger",
                    "Result",
                    "Added",
                    "Updated",
                    "Skipped",
                    "Failed",
                    "Triggered By",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#27272A]">
                      {Array.from({ length: 12 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-4 w-16 bg-zinc-800" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-16 text-center">
                      <RefreshCw className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                      <p className="text-sm text-zinc-500">No sync runs found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((run) => (
                    <tr
                      key={run.id}
                      className="border-b border-[#27272A] hover:bg-zinc-800/50 transition-colors"
                    >
                      {/* Integration */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <IntegIcon provider={run.provider} />
                          <span className="text-zinc-100 font-medium">{run.integrationName}</span>
                        </div>
                      </td>
                      {/* Started */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-zinc-400">
                        {formatMonoDateTime(run.startedAt)}
                      </td>
                      {/* Completed */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-zinc-400">
                        {formatMonoDateTime(run.completedAt)}
                      </td>
                      {/* Duration */}
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-zinc-400">
                        {formatDurationShort(run.duration)}
                      </td>
                      {/* Trigger */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <TriggerChip trigger={run.trigger} />
                      </td>
                      {/* Result */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <ResultBadge result={run.result} />
                      </td>
                      {/* Added */}
                      <td className="px-4 py-3 font-mono text-zinc-400">{run.added}</td>
                      {/* Updated */}
                      <td className="px-4 py-3 font-mono text-zinc-400">{run.updated}</td>
                      {/* Skipped */}
                      <td className="px-4 py-3 font-mono text-zinc-400">{run.skipped}</td>
                      {/* Failed */}
                      <td className="px-4 py-3 font-mono">
                        <span className={run.failed > 0 ? "text-rose-400" : "text-zinc-400"}>
                          {run.failed}
                        </span>
                      </td>
                      {/* Triggered By */}
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                        {run.triggeredBy}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRun(run)}
                          className="h-7 text-[11px] border-[#3F3F46] text-zinc-400 hover:text-zinc-100 whitespace-nowrap"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail sheet */}
      <SyncRunDetailSheet
        run={selectedRun}
        open={!!selectedRun}
        onClose={() => setSelectedRun(null)}
      />
    </div>
  );
}
