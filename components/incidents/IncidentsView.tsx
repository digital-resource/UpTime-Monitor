"use client";

import { Fragment, useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  CheckCircle,
  ChevronDown,
  Download,
  ExternalLink,
  Filter,
  Hash,
  Mail,
  MoreHorizontal,
  UserPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { incidentService } from "@/lib/services/incidentService";
import {
  formatRelativeTime,
  formatDateTime,
  formatDuration,
  getIncidentStatusColor,
} from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Incident, IncidentEvent } from "@/lib/types";

// ─── Status tabs ──────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { label: "All Incidents", value: undefined },
  { label: "Active", value: "open" },
  { label: "Acknowledged", value: "acknowledged" },
  { label: "Resolved", value: "resolved" },
] as const;

// ─── Date filter options ──────────────────────────────────────────────────────

const DATE_FILTERS = [
  { label: "All time", value: undefined },
  { label: "Last 24 hours", value: "24h" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
] as const;

function dateFilterToISO(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const now = Date.now();
  const ms = value === "24h" ? 86_400_000 : value === "7d" ? 7 * 86_400_000 : 30 * 86_400_000;
  return new Date(now - ms).toISOString();
}

// ─── Timeline event icons ─────────────────────────────────────────────────────

function TimelineIcon({ type }: { type: string }) {
  switch (type) {
    case "first_failure":
      return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
    case "threshold_reached":
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    case "incident_opened":
      return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
    case "slack_alert_sent":
      return <Hash className="w-3.5 h-3.5 text-blue-400" />;
    case "email_alert_sent":
      return <Mail className="w-3.5 h-3.5 text-blue-400" />;
    case "acknowledged":
      return <CheckCircle className="w-3.5 h-3.5 text-amber-400" />;
    case "recovery":
      return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
    case "recovery_alert_sent":
      return <Bell className="w-3.5 h-3.5 text-emerald-400" />;
    case "closed":
      return <Check className="w-3.5 h-3.5 text-emerald-400" />;
    default:
      return <AlertCircle className="w-3.5 h-3.5 text-zinc-500" />;
  }
}

function timelineDotColor(type: string): string {
  switch (type) {
    case "first_failure":
    case "incident_opened":
      return "bg-rose-500";
    case "threshold_reached":
    case "acknowledged":
      return "bg-amber-500";
    case "slack_alert_sent":
    case "email_alert_sent":
      return "bg-blue-500";
    case "recovery":
    case "recovery_alert_sent":
    case "closed":
      return "bg-emerald-500";
    default:
      return "bg-zinc-600";
  }
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Incident["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border text-[11px] uppercase tracking-wide px-2.5 py-0.5 font-medium",
        getIncidentStatusColor(status)
      )}
    >
      {status === "open" ? "Open" : status === "acknowledged" ? "Acknowledged" : "Resolved"}
    </span>
  );
}

// ─── Incident detail sheet ────────────────────────────────────────────────────

interface DetailSheetProps {
  incident: Incident | null;
  open: boolean;
  onClose: () => void;
  onAcknowledge: (id: string) => Promise<void>;
  onResolve: (id: string) => Promise<void>;
}

function IncidentDetailSheet({
  incident,
  open,
  onClose,
  onAcknowledge,
  onResolve,
}: DetailSheetProps) {
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (incident) {
      setNotes(incident.internalNotes ?? "");
      setAssignedTo(incident.assignedTo ?? "");
    }
  }, [incident]);

  if (!incident) return null;

  const timeline: IncidentEvent[] = incident.timeline;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl bg-[#09090B] border-[#27272A] overflow-y-auto"
      >
        <SheetHeader className="pb-4 border-b border-[#27272A]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-zinc-50 text-base font-semibold">
                {incident.websiteName}
              </SheetTitle>
              <a
                href={incident.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
              >
                {incident.websiteUrl}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <StatusBadge status={incident.status} />
          </div>
        </SheetHeader>

        {/* Timeline */}
        <div className="py-5">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-4">
            Timeline
          </p>
          <div className="relative">
            {timeline.map((event, idx) => (
              <div key={event.id} className="flex gap-3 pb-4 last:pb-0 relative">
                {/* Vertical line */}
                {idx < timeline.length - 1 && (
                  <div className="absolute left-[6px] top-5 bottom-0 w-px bg-[#27272A]" />
                )}
                {/* Dot */}
                <div
                  className={cn(
                    "w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center",
                    timelineDotColor(event.type)
                  )}
                >
                  <TimelineIcon type={event.type} />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-xs text-zinc-200">{event.message}</p>
                  <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                    {formatDateTime(event.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[#27272A] pt-5 space-y-4">
          {/* Notes */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
              Internal Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes..."
              className="bg-[#18181B] border-[#27272A] text-zinc-200 placeholder:text-zinc-600 text-xs resize-none min-h-[80px]"
            />
          </div>

          {/* Assigned To */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">
              Assigned To
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full bg-[#18181B] border border-[#27272A] text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              <option value="Alex Rivera">Alex Rivera</option>
              <option value="Sarah Chen">Sarah Chen</option>
              <option value="Marcus Johnson">Marcus Johnson</option>
              <option value="Priya Patel">Priya Patel</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {incident.status === "open" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAcknowledge(incident.id)}
                className="h-8 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                Acknowledge
              </Button>
            )}
            {incident.status !== "resolved" && (
              <Button
                size="sm"
                onClick={() => onResolve(incident.id)}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="w-3.5 h-3.5 mr-1.5" />
                Resolve
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={savingNote || !notes.trim()}
              onClick={async () => {
                if (!notes.trim()) return;
                setSavingNote(true);
                try {
                  await incidentService.addNote(incident.id, notes.trim());
                  toast.success("Note saved");
                  setNotes("");
                } catch {
                  toast.error("Failed to save note");
                } finally {
                  setSavingNote(false);
                }
              }}
              className="h-8 text-xs border-[#3F3F46] text-zinc-400 hover:text-zinc-100"
            >
              {savingNote ? "Saving…" : "Add Note"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const headers = [
                  "ID", "Website", "URL", "Client", "Status",
                  "Started At", "Acknowledged At", "Resolved At",
                  "Duration (s)", "Error", "Failed Checks",
                  "Assigned To", "Internal Notes",
                ];
                const row = [
                  incident.id,
                  incident.websiteName,
                  incident.websiteUrl,
                  incident.client ?? "",
                  incident.status,
                  incident.startedAt,
                  incident.acknowledgedAt ?? "",
                  incident.resolvedAt ?? "",
                  incident.duration ?? "",
                  incident.error ?? "",
                  incident.failedChecks,
                  incident.assignedTo ?? "",
                  (incident.internalNotes ?? "").replace(/\n/g, " "),
                ];
                const csv = [headers, row]
                  .map((r) =>
                    r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
                  )
                  .join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `incident-${incident.id.slice(0, 8)}.csv`;
                link.click();
                URL.revokeObjectURL(url);
                toast.success("Export downloaded");
              }}
              className="h-8 text-xs border-[#3F3F46] text-zinc-400 hover:text-zinc-100"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export Report
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Inline expanded row timeline ────────────────────────────────────────────

function ExpandedRow({ incident }: { incident: Incident }) {
  return (
    <tr>
      <td colSpan={11} className="p-0">
        <div className="border-t border-[#27272A] bg-[#09090B] px-6 py-5 grid grid-cols-2 gap-8">
          {/* Left: timeline */}
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              Timeline
            </p>
            <div className="relative space-y-3">
              {incident.timeline.map((event, idx) => (
                <div key={event.id} className="flex gap-2.5 relative">
                  {idx < incident.timeline.length - 1 && (
                    <div className="absolute left-[5px] top-4 bottom-0 w-px bg-[#27272A]" />
                  )}
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1",
                      timelineDotColor(event.type)
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-zinc-300">{event.message}</p>
                    <p className="text-[10px] text-zinc-600 font-mono mt-0.5">
                      {formatDateTime(event.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Right: notes / assigned */}
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                Internal Notes
              </p>
              <p className="text-xs text-zinc-400">
                {incident.internalNotes || "No notes added."}
              </p>
            </div>
            {incident.assignedTo && (
              <div>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Assigned To
                </p>
                <p className="text-xs text-zinc-300">{incident.assignedTo}</p>
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function IncidentsView() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [dateFilter, setDateFilter] = useState<string | undefined>(undefined);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sheetIncident, setSheetIncident] = useState<Incident | null>(null);
  const prevStatus = useRef(statusFilter);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await incidentService.list({
        status:   statusFilter ? [statusFilter] : undefined,
        dateFrom: dateFilterToISO(dateFilter),
      });
      setIncidents(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (prevStatus.current !== statusFilter) {
      prevStatus.current = statusFilter;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, dateFilter]);

  const activeCount = incidents.filter((i) => i.status === "open").length;

  async function handleAcknowledge(id: string) {
    try {
      await incidentService.acknowledge(id);
      toast.success("Incident acknowledged");
      load();
    } catch {
      toast.error("Failed to acknowledge");
    }
  }

  async function handleResolve(id: string) {
    try {
      await incidentService.resolve(id);
      toast.success("Incident resolved");
      load();
    } catch {
      toast.error("Failed to resolve");
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-8 py-6 border-b border-[#27272A] bg-[#09090B] flex-shrink-0 flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-semibold text-zinc-50"
              style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}
            >
              Incidents
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Active and historical incident records
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs border-[#27272A] text-zinc-400 hover:text-zinc-100 bg-transparent"
                >
                  <Filter className="w-3.5 h-3.5 mr-1.5" />
                  {DATE_FILTERS.find((f) => f.value === dateFilter)?.label ?? "Filter"}
                  <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-[#18181B] border-[#27272A] text-zinc-300"
              >
                {DATE_FILTERS.map((f) => (
                  <DropdownMenuItem
                    key={f.label}
                    onClick={() => setDateFilter(f.value)}
                    className={dateFilter === f.value ? "text-blue-400" : ""}
                  >
                    {f.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs border-[#27272A] text-zinc-400 hover:text-zinc-100 bg-transparent"
              onClick={() => {
                if (incidents.length === 0) {
                  toast.info("No incidents to export");
                  return;
                }
                const headers = [
                  "ID", "Website", "URL", "Client", "Status",
                  "Started At", "Acknowledged At", "Resolved At",
                  "Duration (s)", "Error", "Failed Checks",
                  "Assigned To", "Internal Notes",
                ];
                const rows = incidents.map((inc) => [
                  inc.id,
                  inc.websiteName,
                  inc.websiteUrl,
                  inc.client ?? "",
                  inc.status,
                  inc.startedAt,
                  inc.acknowledgedAt ?? "",
                  inc.resolvedAt ?? "",
                  inc.duration ?? "",
                  inc.error ?? "",
                  inc.failedChecks,
                  inc.assignedTo ?? "",
                  (inc.internalNotes ?? "").replace(/\n/g, " "),
                ]);
                const csv = [headers, ...rows]
                  .map((row) =>
                    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
                  )
                  .join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `incidents-${new Date().toISOString().slice(0, 10)}.csv`;
                link.click();
                URL.revokeObjectURL(url);
                toast.success("Export downloaded");
              }}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#18181B] border border-[#27272A] rounded-lg p-1 w-fit mb-6">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.label}
                onClick={() => setStatusFilter(tab.value as string | undefined)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                  statusFilter === tab.value
                    ? "bg-blue-600 text-white"
                    : "text-zinc-400 hover:text-zinc-100"
                )}
              >
                {tab.label}
                {tab.value === "open" && (
                  <span
                    className={cn(
                      "text-[10px] rounded-full px-1.5 py-0.5 font-semibold",
                      statusFilter === tab.value
                        ? "bg-blue-500 text-white"
                        : "bg-[#27272A] text-zinc-400"
                    )}
                  >
                    {activeCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#27272A]">
                    {[
                      "Status",
                      "Website",
                      "Client",
                      "Started",
                      "Recovered",
                      "Duration",
                      "Error",
                      "Failed",
                      "Slack",
                      "Email",
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
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-[#27272A]">
                        {Array.from({ length: 11 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-20 bg-zinc-800" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : incidents.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-16 text-center">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-sm font-medium text-zinc-300">No incidents found</p>
                        <p className="text-xs text-zinc-600 mt-1">All websites are operating normally</p>
                      </td>
                    </tr>
                  ) : (
                    incidents.map((incident) => (
                      <Fragment key={incident.id}>
                        <tr
                          onClick={() =>
                            setExpandedRow(expandedRow === incident.id ? null : incident.id)
                          }
                          className="border-b border-[#27272A] hover:bg-zinc-800/50 cursor-pointer transition-colors"
                        >
                          {/* Status */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={incident.status} />
                          </td>
                          {/* Website */}
                          <td className="px-4 py-3 min-w-[160px]">
                            <p className="text-zinc-100 font-medium truncate max-w-[160px]">
                              {incident.websiteName}
                            </p>
                            <a
                              href={incident.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5 mt-0.5"
                            >
                              {incident.websiteUrl}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </td>
                          {/* Client */}
                          <td className="px-4 py-3 whitespace-nowrap text-zinc-400">
                            {incident.client ?? "—"}
                          </td>
                          {/* Started */}
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-zinc-400">
                            {formatRelativeTime(incident.startedAt)}
                          </td>
                          {/* Recovered */}
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-zinc-400">
                            {incident.resolvedAt
                              ? formatRelativeTime(incident.resolvedAt)
                              : "—"}
                          </td>
                          {/* Duration */}
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-zinc-400">
                            {incident.status !== "resolved"
                              ? "Ongoing"
                              : formatDuration(incident.duration)}
                          </td>
                          {/* Error */}
                          <td className="px-4 py-3 max-w-[160px]">
                            {incident.error ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-zinc-400 truncate block cursor-default">
                                    {incident.error}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="bg-[#18181B] border-[#27272A] text-zinc-200 max-w-xs text-xs">
                                  {incident.error}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>
                          {/* Failed checks */}
                          <td className="px-4 py-3 whitespace-nowrap font-mono text-zinc-300">
                            {incident.failedChecks}
                          </td>
                          {/* Slack */}
                          <td className="px-4 py-3">
                            {incident.slackAlertSent ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <X className="w-4 h-4 text-zinc-600" />
                            )}
                          </td>
                          {/* Email */}
                          <td className="px-4 py-3">
                            {incident.emailAlertSent ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <X className="w-4 h-4 text-zinc-600" />
                            )}
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-zinc-500 hover:text-zinc-100"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="bg-[#18181B] border-[#27272A] text-zinc-300 text-xs"
                              >
                                <DropdownMenuItem
                                  onClick={() => setSheetIncident(incident)}
                                >
                                  View Details
                                </DropdownMenuItem>
                                {incident.status === "open" && (
                                  <DropdownMenuItem
                                    onClick={() => handleAcknowledge(incident.id)}
                                  >
                                    Acknowledge
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSheetIncident(incident);
                                  }}
                                >
                                  Add Note
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => toast.info("Assign dialog")}
                                >
                                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                                  Assign User
                                </DropdownMenuItem>
                                {incident.status !== "resolved" && (
                                  <DropdownMenuItem
                                    onClick={() => handleResolve(incident.id)}
                                    className="text-emerald-400"
                                  >
                                    Resolve Manually
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    const headers = [
                                      "ID", "Website", "URL", "Client", "Status",
                                      "Started At", "Acknowledged At", "Resolved At",
                                      "Duration (s)", "Error", "Failed Checks",
                                      "Assigned To", "Internal Notes",
                                    ];
                                    const row = [
                                      incident.id,
                                      incident.websiteName,
                                      incident.websiteUrl,
                                      incident.client ?? "",
                                      incident.status,
                                      incident.startedAt,
                                      incident.acknowledgedAt ?? "",
                                      incident.resolvedAt ?? "",
                                      incident.duration ?? "",
                                      incident.error ?? "",
                                      incident.failedChecks,
                                      incident.assignedTo ?? "",
                                      (incident.internalNotes ?? "").replace(/\n/g, " "),
                                    ];
                                    const csv = [headers, row]
                                      .map((r) =>
                                        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
                                      )
                                      .join("\n");
                                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = `incident-${incident.id.slice(0, 8)}.csv`;
                                    link.click();
                                    URL.revokeObjectURL(url);
                                    toast.success("Export downloaded");
                                  }}
                                >
                                  <Download className="w-3.5 h-3.5 mr-1.5" />
                                  Export Report
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                        {expandedRow === incident.id && (
                          <ExpandedRow incident={incident} />
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Detail sheet */}
      <IncidentDetailSheet
        incident={sheetIncident}
        open={!!sheetIncident}
        onClose={() => setSheetIncident(null)}
        onAcknowledge={async (id) => {
          await handleAcknowledge(id);
          setSheetIncident(null);
        }}
        onResolve={async (id) => {
          await handleResolve(id);
          setSheetIncident(null);
        }}
      />
    </TooltipProvider>
  );
}
