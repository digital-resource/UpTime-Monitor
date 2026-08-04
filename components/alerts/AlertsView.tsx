"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  Copy,
  ExternalLink,
  Hash,
  Mail,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { alertService } from "@/lib/services/alertService";
import {
  formatRelativeTime,
  getAlertStatusColor,
  getAlertTypeLabel,
} from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Alert, AlertChannel, NotificationGroup } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId =
  | "history"
  | "groups"
  | "escalation"
  | "quiet"
  | "templates";

const TABS: { id: TabId; label: string }[] = [
  { id: "history", label: "Alert History" },
  { id: "groups", label: "Notification Groups" },
  { id: "escalation", label: "Escalation Rules" },
  { id: "quiet", label: "Quiet Hours" },
  { id: "templates", label: "Templates" },
];

// ─── Alert type badge ─────────────────────────────────────────────────────────

function AlertTypeBadge({ type }: { type: Alert["type"] }) {
  const colors: Record<Alert["type"], string> = {
    down: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    degraded: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    recovery: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    ssl_expiry: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    maintenance_start: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    maintenance_end: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border text-[11px] uppercase tracking-wide px-2.5 py-0.5 font-medium",
        colors[type]
      )}
    >
      {getAlertTypeLabel(type)}
    </span>
  );
}

// ─── Alert status badge ───────────────────────────────────────────────────────

function AlertStatusBadge({ status }: { status: Alert["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border text-[11px] uppercase tracking-wide px-2.5 py-0.5 font-medium",
        getAlertStatusColor(status)
      )}
    >
      {status}
    </span>
  );
}

// ─── Channel icon ─────────────────────────────────────────────────────────────

function ChannelIcon({ channel, name }: { channel: AlertChannel; name: string }) {
  return (
    <span className="flex items-center gap-1.5 text-zinc-300">
      {channel === "slack" ? (
        <Hash className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
      ) : (
        <Mail className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
      )}
      <span className="truncate max-w-[120px] text-xs">{name}</span>
    </span>
  );
}

// ─── Alert History tab ────────────────────────────────────────────────────────

function AlertHistoryTab() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await alertService.list();
      setAlerts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function handleRetry(id: string) {
    try {
      await alertService.retryAlert(id);
      toast.success("Alert queued for retry");
      load();
    } catch {
      toast.error("Failed to retry alert");
    }
  }

  const filtered =
    channelFilter === "all"
      ? alerts
      : alerts.filter((a) => a.channel === channelFilter);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-[#18181B] border border-[#27272A] rounded-lg p-1">
          {[
            { label: "All", value: "all" },
            { label: "Slack", value: "slack" },
            { label: "Email", value: "email" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setChannelFilter(opt.value)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5",
                channelFilter === opt.value
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              {opt.value === "slack" && <Hash className="w-3 h-3" />}
              {opt.value === "email" && <Mail className="w-3 h-3" />}
              {opt.label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={load}
          className="h-8 w-8 text-zinc-500 hover:text-zinc-100"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Table */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#27272A]">
                {["Time", "Website", "Type", "Channel", "Recipient", "Status", "Retries", "Error", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#27272A]">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-20 bg-zinc-800" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <Bell className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">No alerts found</p>
                  </td>
                </tr>
              ) : (
                filtered.map((alert) => (
                  <tr
                    key={alert.id}
                    className="border-b border-[#27272A] hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-zinc-400 whitespace-nowrap">
                      {formatRelativeTime(alert.sentAt ?? alert.createdAt)}
                    </td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <p className="text-zinc-100 truncate max-w-[140px]">
                        {alert.websiteName}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <AlertTypeBadge type={alert.type} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ChannelIcon channel={alert.channel} name={alert.channel} />
                    </td>
                    <td className="px-4 py-3 max-w-[140px]">
                      <span className="text-zinc-400 truncate block">{alert.recipient}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <AlertStatusBadge status={alert.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-400">
                      {alert.retryCount}
                    </td>
                    <td className="px-4 py-3 max-w-[140px]">
                      {alert.error ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-rose-400 truncate block cursor-default">
                                {alert.error}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-[#18181B] border-[#27272A] text-zinc-200 max-w-xs text-xs">
                              {alert.error}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {alert.status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRetry(alert.id)}
                            className="h-6 text-[10px] border-zinc-700 text-zinc-400 hover:text-zinc-100"
                          >
                            Retry
                          </Button>
                        )}
                        {alert.incidentId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-100"
                            onClick={() => router.push("/incidents")}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-zinc-500 hover:text-zinc-100"
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(alert, null, 2));
                            toast.success("Copied to clipboard");
                          }}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Notification group card ──────────────────────────────────────────────────

function GroupCard({
  group,
  onDelete,
  onEdit,
}: {
  group: NotificationGroup;
  onDelete: (id: string) => void;
  onEdit: (group: NotificationGroup) => void;
}) {
  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-sm font-semibold text-zinc-100">{group.name}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-500 hover:text-zinc-100 flex-shrink-0"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-[#18181B] border-[#27272A] text-zinc-300 text-xs"
          >
            <DropdownMenuItem onClick={() => onEdit(group)}>Edit</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(group.id)}
              className="text-rose-400 focus:text-rose-400"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-1.5 text-xs">
        {group.slackChannel && (
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Hash className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <span>{group.slackChannel}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Mail className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span>{group.emailRecipients.length} recipient{group.emailRecipients.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="text-zinc-500">
          {group.websiteCount} website{group.websiteCount !== 1 ? "s" : ""}
        </div>
        {group.quietHoursEnabled && (
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Bell className="w-3 h-3" />
            <span>
              Quiet {group.quietHoursStart}–{group.quietHoursEnd} ({group.quietHoursTimezone})
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-auto pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onEdit(group)}
          className="h-7 text-xs flex-1 border-[#3F3F46] text-zinc-400 hover:text-zinc-100"
        >
          Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDelete(group.id)}
          className="h-7 text-xs border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── New group dialog ─────────────────────────────────────────────────────────

interface GroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: NotificationGroup | null;
}

function GroupDialog({ open, onClose, onSaved, initial }: GroupDialogProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slackChannel, setSlackChannel] = useState(initial?.slackChannel ?? "");
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>(initial?.emailRecipients ?? []);
  const [quietHours, setQuietHours] = useState(initial?.quietHoursEnabled ?? false);
  const [quietStart, setQuietStart] = useState(initial?.quietHoursStart ?? "22:00");
  const [quietEnd, setQuietEnd] = useState(initial?.quietHoursEnd ?? "07:00");
  const [maintenance, setMaintenance] = useState(
    initial?.maintenanceSuppression ?? true
  );

  function addEmail() {
    const trimmed = emailInput.trim();
    if (trimmed && !emails.includes(trimmed)) {
      setEmails([...emails, trimmed]);
      setEmailInput("");
    }
  }

  function removeEmail(email: string) {
    setEmails(emails.filter((e) => e !== email));
  }

  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slack_channel: slackChannel.trim() || null,
        email_recipients: emails,
        quiet_hours_enabled: quietHours,
        quiet_hours_start: quietHours ? quietStart : null,
        quiet_hours_end: quietHours ? quietEnd : null,
        quiet_hours_timezone: "UTC",
        maintenance_suppression: maintenance,
      };
      if (initial) {
        await alertService.updateNotificationGroup(initial.id, payload);
        toast.success("Group updated");
      } else {
        await alertService.createNotificationGroup(payload);
        toast.success("Group created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save group");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#18181B] border-[#27272A] text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">
            {initial ? "Edit Notification Group" : "New Notification Group"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Name */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. P1 Critical"
              className="w-full bg-[#09090B] border border-[#27272A] text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-600"
            />
          </div>

          {/* Slack channel */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
              Slack Channel
            </label>
            <input
              value={slackChannel}
              onChange={(e) => setSlackChannel(e.target.value)}
              placeholder="#alerts-critical"
              className="w-full bg-[#09090B] border border-[#27272A] text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-600"
            />
          </div>

          {/* Email recipients */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">
              Email Recipients
            </label>
            <div className="flex gap-2 mb-2">
              <input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEmail()}
                placeholder="user@example.com"
                className="flex-1 bg-[#09090B] border border-[#27272A] text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-600"
              />
              <Button
                size="sm"
                onClick={addEmail}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3"
              >
                Add
              </Button>
            </div>
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {emails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 bg-[#27272A] text-zinc-300 text-[11px] rounded-full px-2.5 py-0.5"
                  >
                    {email}
                    <button
                      onClick={() => removeEmail(email)}
                      className="text-zinc-500 hover:text-zinc-100 ml-0.5"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Quiet hours */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                Quiet Hours
              </label>
              <Switch
                checked={quietHours}
                onCheckedChange={setQuietHours}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
            {quietHours && (
              <div className="flex gap-2">
                <input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="flex-1 bg-[#09090B] border border-[#27272A] text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-zinc-500 self-center">to</span>
                <input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="flex-1 bg-[#09090B] border border-[#27272A] text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Maintenance suppression */}
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Maintenance Suppression
            </label>
            <Switch
              checked={maintenance}
              onCheckedChange={setMaintenance}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-9 text-xs border-[#3F3F46] text-zinc-400 hover:text-zinc-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : initial ? "Save Changes" : "Create Group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Notification Groups tab ──────────────────────────────────────────────────

function NotificationGroupsTab() {
  const [groups, setGroups] = useState<NotificationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<NotificationGroup | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await alertService.listNotificationGroups();
      setGroups(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    try {
      await alertService.deleteNotificationGroup(id);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      toast.success("Group deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete group");
    }
  }

  function openEdit(group: NotificationGroup) {
    setEditingGroup(group);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingGroup(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-zinc-400">
          {groups.length} notification group{groups.length !== 1 ? "s" : ""}
        </p>
        <Button
          size="sm"
          onClick={() => {
            setEditingGroup(null);
            setDialogOpen(true);
          }}
          className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New Notification Group
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl bg-zinc-800/50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onDelete={handleDelete}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      <GroupDialog
        open={dialogOpen}
        onClose={closeDialog}
        onSaved={load}
        initial={editingGroup}
      />
    </div>
  );
}

// ─── Stub tabs ────────────────────────────────────────────────────────────────

function StubTab({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 rounded-2xl border border-dashed border-[#27272A] bg-[#18181B]/50">
      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        {icon}
      </div>
      <p className="text-sm font-medium text-zinc-400">{label}</p>
      <Button
        size="sm"
        className="mt-4 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
        onClick={() => toast.info("Coming soon")}
      >
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        Add {label.replace(" Rules", "").replace(/s$/, "")}
      </Button>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function AlertsView() {
  const [activeTab, setActiveTab] = useState<TabId>("history");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#27272A] bg-[#09090B] flex-shrink-0 flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold text-zinc-50"
            style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}
          >
            Alerts
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Alert delivery history and notification configuration
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#18181B] border border-[#27272A] rounded-lg p-1 w-fit mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "history" && <AlertHistoryTab />}
        {activeTab === "groups" && <NotificationGroupsTab />}
        {activeTab === "escalation" && (
          <StubTab
            label="Escalation Rules"
            icon={<Bell className="w-5 h-5 text-zinc-500" />}
          />
        )}
        {activeTab === "quiet" && (
          <StubTab
            label="Quiet Hours"
            icon={<Bell className="w-5 h-5 text-zinc-500" />}
          />
        )}
        {activeTab === "templates" && (
          <StubTab
            label="Templates"
            icon={<Mail className="w-5 h-5 text-zinc-500" />}
          />
        )}
      </div>
    </div>
  );
}
