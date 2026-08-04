"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, RefreshCw, ExternalLink, MoreVertical, Play, Pause, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { websiteService } from "@/lib/services/websiteService";
import { formatRelativeTime, formatResponseTime, formatUptime } from "@/lib/utils/formatters";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Website, WebsiteFilters } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = [
  { label: "All", value: undefined },
  { label: "Up", value: "up" },
  { label: "Down", value: "down" },
  { label: "Degraded", value: "degraded" },
  { label: "Paused", value: "paused" },
];

export function WebsitesList() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const perPage = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: WebsiteFilters = {
        search: search || undefined,
        status: statusFilter ? [statusFilter as never] : undefined,
        page,
        perPage,
      };
      const result = await websiteService.list(filters);
      setWebsites(result.data);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePause(id: string, isPaused: boolean) {
    try {
      if (isPaused) {
        await websiteService.resume(id);
        toast.success("Monitoring resumed");
      } else {
        await websiteService.pause(id);
        toast.success("Monitoring paused");
      }
      load();
    } catch {
      toast.error("Action failed");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await websiteService.delete(id);
      toast.success("Website deleted");
      load();
    } catch {
      toast.error("Failed to delete website");
    }
  }

  async function handleCheck(id: string) {
    const loadingToast = toast.loading("Running check...");
    try {
      await websiteService.runCheck(id);
      toast.dismiss(loadingToast);
      toast.success("Check completed");
      load();
    } catch {
      toast.dismiss(loadingToast);
      toast.error("Check failed");
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search websites..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 bg-[#18181B] border-[#27272A] text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
        <div className="flex items-center gap-1 bg-[#18181B] border border-[#27272A] rounded-lg p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={load}
          className="text-zinc-400 hover:text-zinc-100 flex-shrink-0"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">{total} websites</p>
        <p className="text-xs text-zinc-600">Page {page} of {Math.ceil(total / perPage)}</p>
      </div>

      {/* Table */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-x-4 px-6 py-3 border-b border-[#27272A] text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
          <span>Status</span>
          <span>Website</span>
          <span className="text-right">Uptime 30d</span>
          <span className="text-right">Response</span>
          <span className="hidden xl:block text-right">SSL</span>
          <span className="text-right">Last Check</span>
          <span />
        </div>

        {loading ? (
          <div className="divide-y divide-[#27272A]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-6 py-3.5 grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-x-4 items-center">
                <Skeleton className="h-5 w-14 rounded-full bg-zinc-800" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-48 bg-zinc-800" />
                  <Skeleton className="h-3 w-32 bg-zinc-800" />
                </div>
                <Skeleton className="h-4 w-16 bg-zinc-800" />
                <Skeleton className="h-4 w-14 bg-zinc-800" />
                <Skeleton className="h-4 w-10 hidden xl:block bg-zinc-800" />
                <Skeleton className="h-4 w-20 bg-zinc-800" />
                <Skeleton className="h-6 w-6 bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : websites.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-zinc-500">No websites found</p>
            <p className="text-xs text-zinc-600 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-[#27272A]">
            {websites.map((site) => (
              <div
                key={site.id}
                className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] gap-x-4 px-6 py-3.5 items-center hover:bg-zinc-800/30 transition-colors group"
              >
                <StatusBadge status={site.status} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{site.name}</p>
                  <p className="text-[11px] text-zinc-500 font-mono-data mt-0.5 truncate">{site.url}</p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-xs font-mono-data font-medium",
                    site.uptime30d !== null && site.uptime30d >= 99.9
                      ? "text-emerald-400"
                      : site.uptime30d !== null && site.uptime30d >= 99
                      ? "text-amber-400"
                      : site.uptime30d !== null
                      ? "text-rose-400"
                      : "text-zinc-600"
                  )}>
                    {formatUptime(site.uptime30d)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-xs font-mono-data",
                    site.responseTime !== null && site.responseTime > 2000
                      ? "text-amber-400"
                      : "text-zinc-300"
                  )}>
                    {formatResponseTime(site.responseTime)}
                  </p>
                </div>
                <div className="hidden xl:block text-right">
                  {site.ssl ? (
                    <p className={cn(
                      "text-xs font-mono-data",
                      (site.ssl.daysRemaining ?? 99) <= 7
                        ? "text-rose-400"
                        : (site.ssl.daysRemaining ?? 99) <= 30
                        ? "text-amber-400"
                        : "text-zinc-500"
                    )}>
                      {site.ssl.daysRemaining}d
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-700">—</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">{formatRelativeTime(site.lastCheckedAt)}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-600 hover:text-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#27272A] border-[#3F3F46]">
                    <DropdownMenuItem
                      onClick={() => handleCheck(site.id)}
                      className="text-zinc-100 hover:bg-zinc-700 cursor-pointer gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Run Check
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-zinc-100 hover:bg-zinc-700 cursor-pointer gap-2"
                      onClick={() => window.open(site.url, "_blank")}
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open URL
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#3F3F46]" />
                    <DropdownMenuItem
                      onClick={() => handlePause(site.id, site.monitoringState === "paused")}
                      className="text-zinc-100 hover:bg-zinc-700 cursor-pointer gap-2"
                    >
                      {site.monitoringState === "paused" ? (
                        <><Play className="w-3.5 h-3.5" /> Resume</>
                      ) : (
                        <><Pause className="w-3.5 h-3.5" /> Pause</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#3F3F46]" />
                    <DropdownMenuItem
                      onClick={() => handleDelete(site.id, site.name)}
                      className="text-rose-400 hover:bg-rose-500/10 cursor-pointer gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > perPage && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="border-[#27272A] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            Previous
          </Button>
          <span className="text-xs text-zinc-500 px-2">
            {page} / {Math.ceil(total / perPage)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / perPage) || loading}
            className="border-[#27272A] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
