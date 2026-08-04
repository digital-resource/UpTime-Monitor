"use client";

import { useState, useEffect, useMemo } from "react";
import { auditService } from "@/lib/services/auditService";
import { formatDateTime, formatRelativeTime } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  Search,
  Download,
  Activity,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditEvent } from "@/lib/types";
import { toast } from "sonner";
import Link from "next/link";

const ACTION_CHIPS: Record<string, { label: string; color: string }> = {
  Login: { label: "Login", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  Logout: { label: "Logout", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  "Website Added": { label: "Website Added", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  "Website Edited": { label: "Website Edited", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  "Website Deleted": { label: "Website Deleted", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  "Monitoring Paused": { label: "Monitoring Paused", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  "Monitoring Resumed": { label: "Monitoring Resumed", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  "Settings Changed": { label: "Settings Changed", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  "Alert Retried": { label: "Alert Retried", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  "Integration Connected": { label: "Integration Connected", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  "Integration Disconnected": { label: "Integration Disconnected", color: "bg-zinc-500/10 text-zinc-400 border-zinc-700" },
  "Failed Login": { label: "Failed Login", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  "User Added": { label: "User Added", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  "Manual Check": { label: "Manual Check", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  "Incident Acknowledged": { label: "Incident Acknowledged", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  "Sync Started": { label: "Sync Started", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
};

function getActionChip(action: string) {
  const chip = ACTION_CHIPS[action];
  if (chip) return chip;
  return { label: action, color: "bg-zinc-800 text-zinc-400 border-zinc-700" };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ExpandableRow({ event }: { event: AuditEvent }) {
  const [expanded, setExpanded] = useState(false);
  const chip = getActionChip(event.action);

  return (
    <>
      <tr className="border-b border-[#27272A] hover:bg-zinc-800/50 transition-colors">
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="text-xs font-mono text-zinc-200">{formatDateTime(event.timestamp)}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">{formatRelativeTime(event.timestamp)}</p>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-bold text-blue-400">{getInitials(event.userName)}</span>
            </div>
            <span className="text-sm text-zinc-200 whitespace-nowrap">{event.userName}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap",
              chip.color
            )}
          >
            {chip.label}
          </span>
        </td>
        <td className="px-4 py-3">
          {event.target ? (
            event.targetId && event.targetId.startsWith("ws_") ? (
              <Link
                href={`/websites/${event.targetId}`}
                className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors"
              >
                {event.target}
              </Link>
            ) : (
              <span className="text-sm text-zinc-300">{event.target}</span>
            )
          ) : (
            <span className="text-zinc-600">—</span>
          )}
        </td>
        <td className="px-4 py-3">
          {event.result === "success" ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              <CheckCircle className="w-3 h-3" />
              Success
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-rose-500/10 text-rose-400 border-rose-500/20">
              <XCircle className="w-3 h-3" />
              Failed
            </span>
          )}
        </td>
        <td className="px-4 py-3 font-mono text-xs text-zinc-500 whitespace-nowrap">
          {event.ipAddress}
        </td>
        <td className="px-4 py-3">
          {event.details ? (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-left group"
            >
              <span className="text-xs text-zinc-400 max-w-[200px] truncate group-hover:text-zinc-200 transition-colors">
                {event.details}
              </span>
              {expanded ? (
                <ChevronUp className="w-3 h-3 text-zinc-600 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-3 h-3 text-zinc-600 flex-shrink-0" />
              )}
            </button>
          ) : (
            <span className="text-zinc-600">—</span>
          )}
        </td>
      </tr>
      {expanded && event.details && (
        <tr className="border-b border-[#27272A] bg-zinc-900/50">
          <td colSpan={7} className="px-4 py-2">
            <p className="text-xs text-zinc-400 pl-1 border-l-2 border-zinc-700">{event.details}</p>
          </td>
        </tr>
      )}
    </>
  );
}

const ACTION_TYPE_OPTIONS = [
  "All",
  "Login",
  "Logout",
  "Website Added",
  "Website Edited",
  "Website Deleted",
  "Monitoring Paused",
  "Monitoring Resumed",
  "Settings Changed",
  "Alert Retried",
  "Integration Connected",
  "Integration Disconnected",
  "Failed Login",
  "User Added",
  "Manual Check",
  "Incident Acknowledged",
  "Sync Started",
];

export function ActivityView() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [resultFilter, setResultFilter] = useState("All");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await auditService.list();
        if (!cancelled) setEvents(data);
      } catch {
        if (!cancelled) toast.error("Failed to load activity log");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const uniqueUsers = useMemo(() => {
    const names = Array.from(new Set(events.map((e) => e.userName)));
    return ["All", ...names];
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((event) => {
      const searchLower = search.toLowerCase();
      if (
        search &&
        !event.userName.toLowerCase().includes(searchLower) &&
        !event.action.toLowerCase().includes(searchLower) &&
        !(event.target ?? "").toLowerCase().includes(searchLower)
      ) {
        return false;
      }
      if (userFilter !== "All" && event.userName !== userFilter) return false;
      if (actionFilter !== "All" && event.action !== actionFilter) return false;
      if (resultFilter !== "All" && event.result !== resultFilter.toLowerCase()) return false;
      return true;
    });
  }, [events, search, userFilter, actionFilter, resultFilter]);

  function handleExport() {
    if (filtered.length === 0) {
      toast.info("No activity to export");
      return;
    }
    const headers = ["Time", "User", "Action", "Target", "Result", "IP Address", "Details"];
    const rows = filtered.map((e) => [
      e.timestamp,
      e.userName,
      e.action,
      e.target ?? "",
      e.result,
      e.ipAddress,
      (e.details ?? "").replace(/\n/g, " "),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#27272A] flex items-start justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
            Activity Log
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Complete audit trail of system events</p>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Button
            variant="outline"
            size="sm"
            className="border-[#27272A] bg-[#18181B] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={handleExport}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-8 py-4 border-b border-[#27272A] flex items-center gap-3 flex-wrap flex-shrink-0">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <Input
            placeholder="Search by user, action, target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-[#18181B] border-[#27272A] text-zinc-200 placeholder:text-zinc-600 h-9"
          />
        </div>
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-44 h-9 bg-[#18181B] border-[#27272A] text-zinc-300">
            <SelectValue placeholder="User" />
          </SelectTrigger>
          <SelectContent className="bg-[#18181B] border-[#27272A]">
            {uniqueUsers.map((u) => (
              <SelectItem key={u} value={u} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48 h-9 bg-[#18181B] border-[#27272A] text-zinc-300">
            <SelectValue placeholder="Action type" />
          </SelectTrigger>
          <SelectContent className="bg-[#18181B] border-[#27272A]">
            {ACTION_TYPE_OPTIONS.map((a) => (
              <SelectItem key={a} value={a} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={resultFilter} onValueChange={setResultFilter}>
          <SelectTrigger className="w-36 h-9 bg-[#18181B] border-[#27272A] text-zinc-300">
            <SelectValue placeholder="Result" />
          </SelectTrigger>
          <SelectContent className="bg-[#18181B] border-[#27272A]">
            <SelectItem value="All" className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">All Results</SelectItem>
            <SelectItem value="Success" className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">Success</SelectItem>
            <SelectItem value="Failure" className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">Failure</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden">
          {!loading && filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                <Activity className="w-5 h-5 text-zinc-600" />
              </div>
              <p className="text-sm font-medium text-zinc-400">No activity recorded yet</p>
              <p className="text-xs text-zinc-600">System events will appear here</p>
            </div>
          ) : (
            <table className="w-full text-left table-fixed">
              <thead>
                <tr className="border-b border-[#27272A]">
                  {["Time", "User", "Action", "Target", "Result", "IP Address", "Details"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-[#27272A]">
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-20 bg-zinc-800" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : filtered.map((event) => <ExpandableRow key={event.id} event={event} />)}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
