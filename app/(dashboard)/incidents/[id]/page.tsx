"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  UserCircle,
  MessageSquare,
  XCircle,
  Clock,
  AlertCircle,
  Bell,
  Mail,
  Hash,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { incidentService } from "@/lib/services/incidentService";
import { MOCK_USERS } from "@/lib/mock-data/users";
import {
  formatRelativeTime,
  formatDateTime,
  formatDuration,
  getIncidentStatusColor,
} from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Incident, IncidentEvent } from "@/lib/types";

// ─── Timeline Event Icon ──────────────────────────────────────────────────────

function getEventStyle(type: string): {
  dotColor: string;
  Icon: React.ElementType;
  iconColor: string;
} {
  switch (type) {
    case "first_failure":
      return { dotColor: "bg-rose-500", Icon: XCircle, iconColor: "text-rose-400" };
    case "threshold_reached":
      return { dotColor: "bg-amber-500", Icon: AlertCircle, iconColor: "text-amber-400" };
    case "incident_opened":
      return { dotColor: "bg-rose-500", Icon: AlertCircle, iconColor: "text-rose-400" };
    case "slack_alert_sent":
      return { dotColor: "bg-blue-500", Icon: Hash, iconColor: "text-blue-400" };
    case "email_alert_sent":
      return { dotColor: "bg-blue-500", Icon: Mail, iconColor: "text-blue-400" };
    case "acknowledged":
      return { dotColor: "bg-amber-500", Icon: CheckCircle2, iconColor: "text-amber-400" };
    case "recovery":
      return { dotColor: "bg-emerald-500", Icon: CheckCircle2, iconColor: "text-emerald-400" };
    case "recovery_alert_sent":
      return { dotColor: "bg-emerald-500", Icon: Bell, iconColor: "text-emerald-400" };
    case "closed":
      return { dotColor: "bg-emerald-500", Icon: CheckCircle2, iconColor: "text-emerald-400" };
    default:
      return { dotColor: "bg-zinc-600", Icon: Clock, iconColor: "text-zinc-400" };
  }
}

// ─── Timeline Component ───────────────────────────────────────────────────────

function IncidentTimeline({ events }: { events: IncidentEvent[] }) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[17px] top-2 bottom-2 w-px bg-zinc-800" />
      <div className="space-y-6">
        {events.map((event, idx) => {
          const { dotColor, Icon, iconColor } = getEventStyle(event.type);
          return (
            <div key={event.id} className="relative flex gap-4">
              {/* Dot + Icon */}
              <div className="flex-shrink-0 w-9 flex flex-col items-center">
                <div className={cn("w-3.5 h-3.5 rounded-full border-2 border-[#09090B] z-10", dotColor)} />
                {idx < events.length - 1 && <div className="flex-1" />}
              </div>
              {/* Content */}
              <div className="flex-1 pb-1">
                <div className="flex items-start gap-2">
                  <Icon className={cn("w-4 h-4 flex-shrink-0 mt-0.5", iconColor)} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 leading-snug">{event.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[11px] text-zinc-400">
                        {formatDateTime(event.timestamp)}
                      </span>
                      <span className="text-[11px] text-zinc-600">
                        {formatRelativeTime(event.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Card Wrapper ─────────────────────────────────────────────────────────────

function Card({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-[#18181B] border border-[#27272A] rounded-2xl p-5", className)}>
      {title && (
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-[#27272A] last:border-0 gap-4">
      <span className="text-[11px] text-zinc-500 uppercase tracking-wider flex-shrink-0">{label}</span>
      <span className="text-sm text-zinc-200 text-right">{value}</span>
    </div>
  );
}

// ─── Notification Row ─────────────────────────────────────────────────────────

function NotifRow({ label, sent }: { label: string; sent: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#27272A] last:border-0">
      <span className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</span>
      <span className={cn("text-xs font-semibold", sent ? "text-emerald-400" : "text-zinc-600")}>
        {sent ? "Sent" : "Not sent"}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [incident, setIncident] = useState<Incident | null | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string>("");

  useEffect(() => {
    incidentService.getById(id).then((inc) => {
      setIncident(inc);
      if (inc) {
        setNotes(inc.internalNotes ?? "");
        setAssignedTo(inc.assignedTo ?? "");
      }
    });
  }, [id]);

  async function handleAcknowledge() {
    if (!incident) return;
    const t = toast.loading("Acknowledging...");
    try {
      const updated = await incidentService.acknowledge(incident.id);
      setIncident(updated);
      toast.dismiss(t);
      toast.success("Incident acknowledged");
    } catch {
      toast.dismiss(t);
      toast.error("Failed to acknowledge");
    }
  }

  async function handleResolve() {
    if (!incident) return;
    const t = toast.loading("Resolving...");
    try {
      const updated = await incidentService.resolve(incident.id);
      setIncident(updated);
      toast.dismiss(t);
      toast.success("Incident resolved");
    } catch {
      toast.dismiss(t);
      toast.error("Failed to resolve");
    }
  }

  async function handleSaveNotes() {
    setNotesSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setNotesSaving(false);
    toast.success("Notes saved");
  }

  // Loading state
  if (incident === undefined) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-8 py-5 border-b border-[#27272A]">
          <Skeleton className="h-6 w-48 bg-zinc-800 mb-2" />
          <Skeleton className="h-4 w-64 bg-zinc-800" />
        </div>
        <div className="flex-1 p-8 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7 space-y-4">
            <Skeleton className="h-64 w-full bg-zinc-800 rounded-2xl" />
            <Skeleton className="h-32 w-full bg-zinc-800 rounded-2xl" />
          </div>
          <div className="col-span-12 lg:col-span-5 space-y-4">
            <Skeleton className="h-48 w-full bg-zinc-800 rounded-2xl" />
            <Skeleton className="h-32 w-full bg-zinc-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // Not found
  if (incident === null) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-10 text-center max-w-sm">
          <AlertCircle className="w-10 h-10 text-zinc-500 mx-auto mb-4" />
          <p className="text-sm font-semibold text-zinc-300 mb-1">Incident not found</p>
          <p className="text-xs text-zinc-600 mb-4">
            The incident with ID{" "}
            <span className="font-mono text-zinc-400">{id}</span> does not exist.
          </p>
          <Link href="/incidents">
            <Button variant="outline" size="sm" className="border-[#27272A] text-zinc-300 hover:bg-zinc-800 gap-2">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Incidents
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const incidentLabel = incident.id.replace("inc_", "INC-").toUpperCase();

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="px-8 py-5 border-b border-[#27272A] bg-[#09090B]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <Link
              href="/incidents"
              className="mt-1 text-zinc-500 hover:text-zinc-100 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded-md">
                  {incidentLabel}
                </span>
                <h1
                  className="text-xl font-semibold text-zinc-50"
                  style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}
                >
                  {incident.websiteName}
                </h1>
                <span
                  className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize",
                    getIncidentStatusColor(incident.status)
                  )}
                >
                  {incident.status}
                </span>
              </div>
              <a
                href={incident.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-1 text-sm text-zinc-400 hover:text-zinc-200 transition-colors font-mono"
              >
                {incident.websiteUrl}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {incident.status === "open" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAcknowledge}
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledge
              </Button>
            )}
            {incident.status !== "resolved" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResolve}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="border-[#27272A] text-zinc-300 hover:bg-zinc-800 gap-2"
              onClick={() => toast.info("User assignment updated below")}
            >
              <UserCircle className="w-3.5 h-3.5" /> Assign User
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[#27272A] text-zinc-300 hover:bg-zinc-800 gap-2"
              onClick={() => toast.info("Add your note in the notes field below")}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Add Note
            </Button>
          </div>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Timeline + Notes */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            <Card title="Incident Timeline">
              <IncidentTimeline events={incident.timeline} />
            </Card>

            {/* Internal Notes */}
            <Card title="Internal Notes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add internal notes, investigation steps, or context..."
                rows={5}
                className={cn(
                  "w-full bg-[#09090B] border border-[#27272A] rounded-xl p-3 text-sm text-zinc-200",
                  "placeholder:text-zinc-600 resize-none",
                  "focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50",
                  "transition-colors"
                )}
              />
              <div className="flex justify-end mt-3">
                <Button
                  size="sm"
                  disabled={notesSaving}
                  onClick={handleSaveNotes}
                  className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
                >
                  {notesSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Notes"
                  )}
                </Button>
              </div>
            </Card>
          </div>

          {/* Right: Info cards */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            {/* Incident Summary */}
            <Card title="Incident Summary">
              <StatRow
                label="Status"
                value={
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize",
                      getIncidentStatusColor(incident.status)
                    )}
                  >
                    {incident.status}
                  </span>
                }
              />
              <StatRow label="Started" value={formatRelativeTime(incident.startedAt)} />
              <StatRow
                label="Duration"
                value={
                  incident.duration ? (
                    <span className="font-mono">{formatDuration(incident.duration)}</span>
                  ) : (
                    <span className="text-amber-400 font-semibold">Ongoing</span>
                  )
                }
              />
              <StatRow
                label="Error"
                value={
                  <span className="text-rose-400 text-xs">{incident.error ?? "—"}</span>
                }
              />
              <StatRow
                label="Failed Checks"
                value={<span className="font-mono text-rose-400">{incident.failedChecks}</span>}
              />
              {incident.client && (
                <StatRow label="Client" value={incident.client} />
              )}
              {incident.acknowledgedAt && (
                <StatRow label="Acknowledged" value={formatRelativeTime(incident.acknowledgedAt)} />
              )}
              {incident.resolvedAt && (
                <StatRow label="Resolved" value={formatRelativeTime(incident.resolvedAt)} />
              )}
            </Card>

            {/* Notifications */}
            <Card title="Notifications">
              <NotifRow label="Slack Alert" sent={incident.slackAlertSent} />
              <NotifRow label="Email Alert" sent={incident.emailAlertSent} />
              <NotifRow label="Recovery Alert" sent={incident.recoveryAlertSent} />
            </Card>

            {/* Assignment */}
            <Card title="Assignment">
              <div className="space-y-2">
                <label className="text-[11px] text-zinc-500 uppercase tracking-wider block">
                  Assigned To
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => {
                    setAssignedTo(e.target.value);
                    toast.success(`Assigned to ${e.target.value || "nobody"}`);
                  }}
                  className={cn(
                    "w-full bg-[#09090B] border border-[#27272A] rounded-xl px-3 py-2.5 text-sm text-zinc-200",
                    "focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50",
                    "transition-colors appearance-none cursor-pointer"
                  )}
                >
                  <option value="">— Unassigned —</option>
                  {MOCK_USERS.filter((u) => u.isActive).map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.role.replace("_", " ")})
                    </option>
                  ))}
                </select>
                {assignedTo && (
                  <p className="text-xs text-zinc-500 flex items-center gap-1.5 pt-1">
                    <UserCircle className="w-3.5 h-3.5" />
                    Currently assigned to{" "}
                    <span className="text-zinc-300 font-medium">{assignedTo}</span>
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
