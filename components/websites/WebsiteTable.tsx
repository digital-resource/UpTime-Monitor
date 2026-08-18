"use client";
import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { ArrowUpDown, ArrowUp, ArrowDown, Play, Pause, Tag, Download, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/websites/StatusBadge";
import { cn } from "@/lib/utils";
import {
  formatRelativeTime,
  formatResponseTime,
  getProviderLabel,
  getSourceLabel,
} from "@/lib/utils/formatters";
import type { Website } from "@/lib/types";
import { Shield, ShieldAlert, ShieldOff, ShieldCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ExternalLink, Play as PlayIcon, Pencil, Clock, AlertCircle, History, Copy, Trash2 as Trash2Icon, Pause as PauseIcon } from "lucide-react";

// ─── Sub-cells ───────────────────────────────────────────────────────────────

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

// ─── Sortable Header ──────────────────────────────────────────────────────────

function SortableHeader({
  label,
  isSorted,
  onClick,
  align = "left",
}: {
  label: string;
  isSorted: false | "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 hover:text-zinc-300 transition-colors w-full",
        align === "right" && "justify-end"
      )}
    >
      {label}
      {isSorted === false ? (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      ) : isSorted === "asc" ? (
        <ArrowUp className="w-3 h-3 text-blue-400" />
      ) : (
        <ArrowDown className="w-3 h-3 text-blue-400" />
      )}
    </button>
  );
}

// ─── Table Props ──────────────────────────────────────────────────────────────

interface WebsiteTableProps {
  data: Website[];
  loading: boolean;
  onRunCheck: (id: string) => void;
  onPauseResume: (id: string, isPaused: boolean) => void;
  onDelete: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onBulkRunCheck: (ids: string[]) => void;
  onBulkPause: (ids: string[]) => void;
  onBulkResume: (ids: string[]) => void;
  onBulkAddTag: (ids: string[]) => void;
  onBulkExport: (ids: string[]) => void;
  onBulkDelete: (ids: string[]) => void;
  columnVisibility: Record<string, boolean>;
}

// ─── Actions Cell ─────────────────────────────────────────────────────────────

function ActionsCell({
  website,
  onRunCheck,
  onPauseResume,
  onDelete,
  onDuplicate,
}: {
  website: Website;
  onRunCheck: (id: string) => void;
  onPauseResume: (id: string, isPaused: boolean) => void;
  onDelete: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const isPaused = website.monitoringState === "paused";
  return (
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
          <PlayIcon className="w-3.5 h-3.5" /> Run Manual Check
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
            <><PlayIcon className="w-3.5 h-3.5" /> Resume</>
          ) : (
            <><PauseIcon className="w-3.5 h-3.5" /> Pause</>
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
          <Trash2Icon className="w-3.5 h-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WebsiteTable({
  data,
  loading,
  onRunCheck,
  onPauseResume,
  onDelete,
  onDuplicate,
  onBulkRunCheck,
  onBulkPause,
  onBulkResume,
  onBulkAddTag,
  onBulkExport,
  onBulkDelete,
  columnVisibility,
}: WebsiteTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  const columns = useMemo<ColumnDef<Website>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            className="border-zinc-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            className="border-zinc-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
        ),
        enableSorting: false,
        size: 32,
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <SortableHeader
            label="Status"
            isSorted={column.getIsSorted()}
            onClick={() => column.toggleSorting()}
          />
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" />,
        size: 100,
      },
      {
        id: "website",
        accessorKey: "name",
        header: ({ column }) => (
          <SortableHeader
            label="Website"
            isSorted={column.getIsSorted()}
            onClick={() => column.toggleSorting()}
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-100 truncate">{row.original.name}</p>
            <p className="text-xs text-zinc-500 font-mono truncate mt-0.5">{row.original.url}</p>
          </div>
        ),
        size: 240,
      },
      {
        accessorKey: "client",
        header: ({ column }) => (
          <SortableHeader
            label="Client"
            isSorted={column.getIsSorted()}
            onClick={() => column.toggleSorting()}
          />
        ),
        cell: ({ row }) => (
          <span className="text-xs text-zinc-400">
            {row.original.client ?? <span className="text-zinc-600">—</span>}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: "source",
        header: ({ column }) => (
          <SortableHeader
            label="Source"
            isSorted={column.getIsSorted()}
            onClick={() => column.toggleSorting()}
          />
        ),
        cell: ({ row }) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-700/50 text-zinc-400 border border-zinc-700">
            {getSourceLabel(row.original.source)}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: "provider",
        header: ({ column }) => (
          <SortableHeader
            label="Provider"
            isSorted={column.getIsSorted()}
            onClick={() => column.toggleSorting()}
          />
        ),
        cell: ({ row }) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
            {getProviderLabel(row.original.provider)}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: "httpStatus",
        header: ({ column }) => (
          <SortableHeader
            label="HTTP"
            isSorted={column.getIsSorted()}
            onClick={() => column.toggleSorting()}
            align="right"
          />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            <HttpStatusCell status={row.original.httpStatus} />
          </div>
        ),
        size: 70,
      },
      {
        accessorKey: "responseTime",
        header: ({ column }) => (
          <SortableHeader
            label="Response"
            isSorted={column.getIsSorted()}
            onClick={() => column.toggleSorting()}
            align="right"
          />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            <ResponseTimeCell ms={row.original.responseTime} />
          </div>
        ),
        size: 90,
      },
      {
        id: "ssl",
        accessorFn: (row) => row.ssl?.daysRemaining ?? -1,
        header: ({ column }) => (
          <SortableHeader
            label="SSL"
            isSorted={column.getIsSorted()}
            onClick={() => column.toggleSorting()}
            align="right"
          />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            <SslCell ssl={row.original.ssl} />
          </div>
        ),
        size: 90,
      },
      {
        accessorKey: "uptime30d",
        header: ({ column }) => (
          <SortableHeader
            label="Uptime 30D"
            isSorted={column.getIsSorted()}
            onClick={() => column.toggleSorting()}
            align="right"
          />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            <UptimeCell uptime={row.original.uptime30d} />
          </div>
        ),
        size: 100,
      },
      {
        accessorKey: "lastCheckedAt",
        header: ({ column }) => (
          <SortableHeader
            label="Last Checked"
            isSorted={column.getIsSorted()}
            onClick={() => column.toggleSorting()}
            align="right"
          />
        ),
        cell: ({ row }) => (
          <div className="text-right">
            <span className="text-xs text-zinc-500">
              {formatRelativeTime(row.original.lastCheckedAt)}
            </span>
          </div>
        ),
        size: 120,
      },
      {
        accessorKey: "monitoringState",
        header: ({ column }) => (
          <SortableHeader
            label="State"
            isSorted={column.getIsSorted()}
            onClick={() => column.toggleSorting()}
          />
        ),
        cell: ({ row }) => (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border",
              MONITORING_STATE_COLORS[row.original.monitoringState]
            )}
          >
            {MONITORING_STATE_LABELS[row.original.monitoringState]}
          </span>
        ),
        size: 100,
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => null,
        cell: ({ row }) => (
          <div className="flex items-center justify-end">
            <ActionsCell
              website={row.original}
              onRunCheck={onRunCheck}
              onPauseResume={onPauseResume}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          </div>
        ),
        size: 40,
      },
    ],
    [onRunCheck, onPauseResume, onDelete, onDuplicate]
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      pagination,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
  });

  const selectedCount = Object.keys(rowSelection).length;
  const selectedIds = table.getSelectedRowModel().rows.map((row) => row.original.id);

  function runBulkAction(action: (ids: string[]) => void) {
    action(selectedIds);
    setRowSelection({});
  }
  const { pageIndex, pageSize } = pagination;
  const pageCount = table.getPageCount();
  const fromRow = pageIndex * pageSize + 1;
  const toRow = Math.min((pageIndex + 1) * pageSize, data.length);

  return (
    <div className="space-y-3">
      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-600/10 border border-blue-600/30 rounded-xl">
          <span className="text-xs font-medium text-blue-300 mr-2">{selectedCount} selected</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runBulkAction(onBulkRunCheck)}
            className="h-7 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-zinc-100 gap-1.5"
          >
            <Play className="w-3 h-3" /> Run Checks
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runBulkAction(onBulkPause)}
            className="h-7 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-zinc-100 gap-1.5"
          >
            <Pause className="w-3 h-3" /> Pause
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runBulkAction(onBulkResume)}
            className="h-7 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-zinc-100 gap-1.5"
          >
            <Play className="w-3 h-3" /> Resume
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runBulkAction(onBulkAddTag)}
            className="h-7 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-zinc-100 gap-1.5"
          >
            <Tag className="w-3 h-3" /> Add Tag
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runBulkAction(onBulkExport)}
            className="h-7 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-zinc-100 gap-1.5"
          >
            <Download className="w-3 h-3" /> Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => runBulkAction(onBulkDelete)}
            className="h-7 text-xs border-rose-800/50 bg-rose-950/30 text-rose-400 hover:text-rose-300 gap-1.5"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </Button>
          <button
            onClick={() => setRowSelection({})}
            className="ml-auto text-zinc-500 hover:text-zinc-100 transition-colors"
            aria-label="Deselect all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-x-auto">
        {/* Header */}
        <div className="border-b border-[#27272A] min-w-max">
          {table.getHeaderGroups().map((headerGroup) => (
            <div key={headerGroup.id} className="flex items-center px-4 py-3 gap-3">
              {headerGroup.headers.map((header) => (
                <div
                  key={header.id}
                  style={{ width: header.getSize(), flexShrink: 0 }}
                  className={header.id === "website" ? "flex-1 min-w-[200px]" : ""}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Body */}
        {loading ? (
          <div className="divide-y divide-[#27272A]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center px-4 py-3.5 gap-3">
                <div className="w-8 h-4 rounded bg-zinc-800 animate-pulse" />
                <div className="w-20 h-5 rounded-full bg-zinc-800 animate-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="h-4 w-48 rounded bg-zinc-800 animate-pulse" />
                  <div className="h-3 w-32 rounded bg-zinc-800 animate-pulse" />
                </div>
                <div className="w-20 h-4 rounded bg-zinc-800 animate-pulse flex-shrink-0" />
                <div className="w-16 h-5 rounded bg-zinc-800 animate-pulse flex-shrink-0" />
                <div className="w-20 h-5 rounded bg-zinc-800 animate-pulse flex-shrink-0" />
                <div className="w-10 h-4 rounded bg-zinc-800 animate-pulse flex-shrink-0" />
                <div className="w-14 h-4 rounded bg-zinc-800 animate-pulse flex-shrink-0" />
                <div className="w-14 h-4 rounded bg-zinc-800 animate-pulse flex-shrink-0" />
                <div className="w-16 h-4 rounded bg-zinc-800 animate-pulse flex-shrink-0" />
                <div className="w-20 h-4 rounded bg-zinc-800 animate-pulse flex-shrink-0" />
                <div className="w-20 h-5 rounded-full bg-zinc-800 animate-pulse flex-shrink-0" />
                <div className="w-7 h-7 rounded bg-zinc-800 animate-pulse flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : table.getRowModel().rows.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-zinc-500">No websites found</p>
            <p className="text-xs text-zinc-600 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-[#27272A] min-w-max">
            {table.getRowModel().rows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  "flex items-center px-4 py-3 gap-3 hover:bg-zinc-800/30 transition-colors group",
                  row.getIsSelected() && "bg-blue-600/5"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    style={{ width: cell.column.getSize(), flexShrink: 0 }}
                    className={cell.column.id === "website" ? "flex-1 min-w-[200px]" : ""}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPagination((p) => ({ ...p, pageSize: Number(v), pageIndex: 0 }));
            }}
          >
            <SelectTrigger className="h-7 w-16 text-xs bg-zinc-800 border-zinc-700 text-zinc-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#27272A] border-zinc-700">
              {[10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs text-zinc-300">
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="text-xs text-zinc-500">
          Showing {data.length > 0 ? fromRow : 0}–{toRow} of {data.length} websites
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((p) => ({ ...p, pageIndex: 0 }))}
            disabled={!table.getCanPreviousPage()}
            className="h-7 px-2 text-xs border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-100 disabled:opacity-40"
          >
            «
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))}
            disabled={!table.getCanPreviousPage()}
            className="h-7 px-2.5 text-xs border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-100 disabled:opacity-40"
          >
            Previous
          </Button>

          {/* Page numbers */}
          <div className="flex items-center gap-0.5">
            {Array.from({ length: Math.min(pageCount, 7) }, (_, i) => {
              let page: number;
              if (pageCount <= 7) {
                page = i;
              } else if (pageIndex <= 3) {
                page = i;
              } else if (pageIndex >= pageCount - 4) {
                page = pageCount - 7 + i;
              } else {
                page = pageIndex - 3 + i;
              }
              return (
                <Button
                  key={page}
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination((p) => ({ ...p, pageIndex: page }))}
                  className={cn(
                    "h-7 w-7 p-0 text-xs border-zinc-700 bg-zinc-800",
                    pageIndex === page
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "text-zinc-400 hover:text-zinc-100"
                  )}
                >
                  {page + 1}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
            disabled={!table.getCanNextPage()}
            className="h-7 px-2.5 text-xs border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-100 disabled:opacity-40"
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((p) => ({ ...p, pageIndex: pageCount - 1 }))}
            disabled={!table.getCanNextPage()}
            className="h-7 px-2 text-xs border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-100 disabled:opacity-40"
          >
            »
          </Button>
        </div>
      </div>
    </div>
  );
}
