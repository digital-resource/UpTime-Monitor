"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Clock, CheckCircle, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { incidentService } from "@/lib/services/incidentService";
import { formatRelativeTime, formatDateTime, formatDuration, getIncidentStatusColor } from "@/lib/utils/formatters";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Incident } from "@/lib/types";

const STATUS_FILTERS = [
  { label: "All", value: undefined },
  { label: "Open", value: "open" },
  { label: "Acknowledged", value: "acknowledged" },
  { label: "Resolved", value: "resolved" },
];

export function IncidentsList() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await incidentService.list({
        status: statusFilter ? [statusFilter] : undefined,
      });
      setIncidents(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  async function handleAcknowledge(id: string) {
    try {
      await incidentService.acknowledge(id);
      toast.success("Incident acknowledged");
      load();
    } catch {
      toast.error("Failed to acknowledge incident");
    }
  }

  async function handleResolve(id: string) {
    try {
      await incidentService.resolve(id);
      toast.success("Incident resolved");
      load();
    } catch {
      toast.error("Failed to resolve incident");
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-[#18181B] border border-[#27272A] rounded-lg p-1 w-fit">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              statusFilter === f.value
                ? "bg-blue-600 text-white"
                : "text-zinc-400 hover:text-zinc-100"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Incidents */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl bg-zinc-800/50" />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl py-16 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-zinc-300">No incidents found</p>
          <p className="text-xs text-zinc-600 mt-1">All websites are operating normally</p>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((incident) => (
            <div
              key={incident.id}
              className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden"
            >
              <div className="px-6 py-4 flex items-start gap-4">
                {/* Status indicator */}
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                  incident.status === "open"
                    ? "bg-rose-500/10"
                    : incident.status === "acknowledged"
                    ? "bg-amber-500/10"
                    : "bg-emerald-500/10"
                )}>
                  <AlertTriangle className={cn(
                    "w-4 h-4",
                    incident.status === "open"
                      ? "text-rose-400"
                      : incident.status === "acknowledged"
                      ? "text-amber-400"
                      : "text-emerald-400"
                  )} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
                          getIncidentStatusColor(incident.status)
                        )}>
                          {incident.status.charAt(0).toUpperCase() + incident.status.slice(1)}
                        </span>
                        <h3 className="text-sm font-semibold text-zinc-100">{incident.websiteName}</h3>
                        {incident.client && (
                          <span className="text-xs text-zinc-500">{incident.client}</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 font-mono-data mt-1">{incident.websiteUrl}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {incident.status === "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledge(incident.id)}
                          className="h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                        >
                          Acknowledge
                        </Button>
                      )}
                      {incident.status !== "resolved" && (
                        <Button
                          size="sm"
                          onClick={() => handleResolve(incident.id)}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    {incident.error && (
                      <p className="text-xs text-zinc-500">{incident.error}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                      <Clock className="w-3 h-3" />
                      Started {formatRelativeTime(incident.startedAt)}
                    </div>
                    {incident.duration !== null && (
                      <p className="text-xs text-zinc-600">Duration: {formatDuration(incident.duration)}</p>
                    )}
                    <p className="text-xs text-zinc-600">{incident.failedChecks} failed checks</p>
                    {incident.assignedTo && (
                      <p className="text-xs text-zinc-500">Assigned: {incident.assignedTo}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline toggle */}
              <button
                onClick={() => setExpanded(expanded === incident.id ? null : incident.id)}
                className="w-full px-6 py-2.5 border-t border-[#27272A] text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 transition-colors text-left flex items-center gap-2"
              >
                <Eye className="w-3 h-3" />
                {expanded === incident.id ? "Hide" : "Show"} timeline ({incident.timeline.length} events)
              </button>

              {/* Timeline */}
              {expanded === incident.id && (
                <div className="border-t border-[#27272A] px-6 py-4 bg-[#09090B]">
                  <div className="space-y-3">
                    {incident.timeline.map((event) => (
                      <div key={event.id} className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-300">{event.message}</p>
                          <p className="text-[10px] text-zinc-600 font-mono-data mt-0.5">{formatDateTime(event.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
