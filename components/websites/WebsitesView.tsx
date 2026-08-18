"use client";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Download, Plus, Search, Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WebsiteTable } from "@/components/websites/WebsiteTable";
import { WebsiteFilters } from "@/components/websites/WebsiteFilters";
import { AddWebsiteDialog } from "@/components/websites/AddWebsiteDialog";
import { websiteService } from "@/lib/services/websiteService";
import { toast } from "sonner";
import type { Website, WebsiteFilters as WebsiteFiltersType, WebsiteStatus, Provider, Source, MonitoringState } from "@/lib/types";

type SslState = "valid" | "expiring" | "expired" | "unknown";

interface ActiveFilters {
  status: WebsiteStatus[];
  provider: Provider[];
  source: Source[];
  monitoringState: MonitoringState[];
  sslState: SslState | undefined;
}

const EMPTY_FILTERS: ActiveFilters = {
  status: [],
  provider: [],
  source: [],
  monitoringState: [],
  sslState: undefined,
};

const DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> = {
  select: true,
  status: true,
  website: true,
  client: true,
  source: true,
  provider: true,
  httpStatus: true,
  responseTime: true,
  ssl: true,
  uptime30d: true,
  lastCheckedAt: true,
  monitoringState: true,
  actions: true,
};

const COLUMN_LABELS: Record<string, string> = {
  status: "Status",
  website: "Website",
  client: "Client",
  source: "Source",
  provider: "Provider",
  httpStatus: "HTTP Status",
  responseTime: "Response Time",
  ssl: "SSL",
  uptime30d: "Uptime 30D",
  lastCheckedAt: "Last Checked",
  monitoringState: "Monitoring State",
};

export function WebsitesView() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(DEFAULT_COLUMN_VISIBILITY);

  const buildServiceFilters = useCallback((): WebsiteFiltersType => {
    return {
      search: search || undefined,
      status: filters.status.length ? filters.status : undefined,
      provider: filters.provider.length ? filters.provider : undefined,
      source: filters.source.length ? filters.source : undefined,
      monitoringState: filters.monitoringState.length ? filters.monitoringState : undefined,
      sslState: filters.sslState,
      perPage: 1000,
    };
  }, [search, filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await websiteService.list(buildServiceFilters());
      setWebsites(result.data);
      setTotal(result.total);
    } catch {
      toast.error("Failed to load websites");
    } finally {
      setLoading(false);
    }
  }, [buildServiceFilters]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSync() {
    setSyncing(true);
    try {
      await load();
      toast.success("Websites synced");
    } finally {
      setSyncing(false);
    }
  }

  function buildCsv(list: Website[]) {
    return [
      ["Name", "URL", "Status", "Client", "Provider", "Source", "HTTP Status", "Response Time (ms)", "Uptime 30D (%)"].join(","),
      ...list.map((w) =>
        [
          JSON.stringify(w.name),
          JSON.stringify(w.url),
          w.status,
          JSON.stringify(w.client ?? ""),
          w.provider,
          w.source,
          w.httpStatus ?? "",
          w.responseTime ?? "",
          w.uptime30d ?? "",
        ].join(",")
      ),
    ].join("\n");
  }

  function downloadCsv(csv: string) {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "websites.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExport() {
    downloadCsv(buildCsv(websites));
  }

  async function handleRunCheck(id: string) {
    const t = toast.loading("Running check...");
    try {
      await websiteService.runCheck(id);
      toast.dismiss(t);
      toast.success("Check completed");
      load();
    } catch {
      toast.dismiss(t);
      toast.error("Check failed");
    }
  }

  async function handlePauseResume(id: string, isPaused: boolean) {
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
      toast.error("Failed to delete");
    }
  }

  async function handleBulkRunCheck(ids: string[]) {
    if (ids.length === 0) return;
    const t = toast.loading(`Running checks on ${ids.length} website${ids.length !== 1 ? "s" : ""}...`);
    try {
      await Promise.all(ids.map((id) => websiteService.runCheck(id)));
      toast.dismiss(t);
      toast.success("Checks queued");
      load();
    } catch {
      toast.dismiss(t);
      toast.error("Failed to run checks");
    }
  }

  async function handleBulkPause(ids: string[]) {
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => websiteService.pause(id)));
      toast.success(`Paused ${ids.length} website${ids.length !== 1 ? "s" : ""}`);
      load();
    } catch {
      toast.error("Failed to pause websites");
    }
  }

  async function handleBulkResume(ids: string[]) {
    if (ids.length === 0) return;
    try {
      await Promise.all(ids.map((id) => websiteService.resume(id)));
      toast.success(`Resumed ${ids.length} website${ids.length !== 1 ? "s" : ""}`);
      load();
    } catch {
      toast.error("Failed to resume websites");
    }
  }

  async function handleBulkAddTag(ids: string[]) {
    if (ids.length === 0) return;
    const tag = window.prompt(`Add tag to ${ids.length} website${ids.length !== 1 ? "s" : ""}:`);
    if (!tag || !tag.trim()) return;
    const trimmed = tag.trim();
    try {
      await Promise.all(
        ids.map((id) => {
          const site = websites.find((w) => w.id === id);
          const tags = site?.tags?.includes(trimmed) ? site.tags : [...(site?.tags ?? []), trimmed];
          return websiteService.update(id, { tags });
        })
      );
      toast.success("Tag added");
      load();
    } catch {
      toast.error("Failed to add tag");
    }
  }

  function handleBulkExport(ids: string[]) {
    if (ids.length === 0) return;
    downloadCsv(buildCsv(websites.filter((w) => ids.includes(w.id))));
  }

  async function handleBulkDelete(ids: string[]) {
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} website${ids.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    try {
      await Promise.all(ids.map((id) => websiteService.delete(id)));
      toast.success(`Deleted ${ids.length} website${ids.length !== 1 ? "s" : ""}`);
      load();
    } catch {
      toast.error("Failed to delete websites");
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const site = await websiteService.getById(id);
      if (!site) return;
      await websiteService.create({ ...site, name: `${site.name} (copy)` });
      toast.success("Website duplicated");
      load();
    } catch {
      toast.error("Failed to duplicate");
    }
  }

  function handleFiltersChange(partial: Partial<WebsiteFiltersType>) {
    setFilters((prev) => ({
      status: (partial.status as WebsiteStatus[] | undefined) ?? (partial.status === undefined && "status" in partial ? [] : prev.status),
      provider: (partial.provider as Provider[] | undefined) ?? (partial.provider === undefined && "provider" in partial ? [] : prev.provider),
      source: (partial.source as Source[] | undefined) ?? (partial.source === undefined && "source" in partial ? [] : prev.source),
      monitoringState: (partial.monitoringState as MonitoringState[] | undefined) ?? (partial.monitoringState === undefined && "monitoringState" in partial ? [] : prev.monitoringState),
      sslState: "sslState" in partial ? (partial.sslState as SslState | undefined) : prev.sslState,
    }));
  }

  function handleClearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  const _activeFilterCount =
    filters.status.length +
    filters.provider.length +
    filters.source.length +
    filters.monitoringState.length +
    (filters.sslState !== undefined ? 1 : 0);

  const toggleColumn = (key: string) => {
    setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-[#27272A] bg-[#09090B] flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-zinc-50">Websites</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {loading ? "Loading…" : `${total} website${total !== 1 ? "s" : ""} monitored`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing || loading}
            className="h-8 gap-1.5 text-xs border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:text-zinc-100"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            Sync
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="h-8 gap-1.5 text-xs border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:text-zinc-100"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Website
          </Button>
        </div>
      </header>
      <AddWebsiteDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => { setAddDialogOpen(false); load(); }}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Search + Filters bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <Input
              placeholder="Search websites, URLs, clients…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-[#18181B] border-[#27272A] text-zinc-100 placeholder:text-zinc-600 text-sm focus-visible:ring-blue-600/50"
            />
          </div>

          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:text-zinc-100"
              >
                <Columns className="w-3.5 h-3.5" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#27272A] border-[#3F3F46] w-48">
              <DropdownMenuLabel className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Toggle Columns
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#3F3F46]" />
              {Object.entries(COLUMN_LABELS).map(([key, label]) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={columnVisibility[key] ?? true}
                  onCheckedChange={() => toggleColumn(key)}
                  className="text-xs text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                >
                  {label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters */}
        <WebsiteFilters
          filters={filters}
          onChange={handleFiltersChange}
          onClear={handleClearFilters}
        />

        {/* Table */}
        <div className="overflow-x-auto -mx-6 px-6 lg:mx-0 lg:px-0">
          <WebsiteTable
            data={websites}
            loading={loading}
            onRunCheck={handleRunCheck}
            onPauseResume={handlePauseResume}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onBulkRunCheck={handleBulkRunCheck}
            onBulkPause={handleBulkPause}
            onBulkResume={handleBulkResume}
            onBulkAddTag={handleBulkAddTag}
            onBulkExport={handleBulkExport}
            onBulkDelete={handleBulkDelete}
            columnVisibility={columnVisibility}
          />
        </div>
      </div>
    </div>
  );
}
