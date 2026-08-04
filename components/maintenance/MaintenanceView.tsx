"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { MaintenanceWindow } from "@/lib/types";

const MOCK_MAINTENANCE: MaintenanceWindow[] = [
  {
    id: "mw_001",
    name: "Monthly DB Maintenance",
    status: "upcoming",
    websiteIds: ["ws_001"],
    websiteNames: ["BlueStar - Admin Portal"],
    startAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 2 * 86400000 + 7200000).toISOString(),
    timezone: "America/New_York",
    recurrence: "monthly",
    reason: "Scheduled database maintenance window",
    suppressAlerts: true,
    continueRecordingChecks: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "mw_002",
    name: "SSL Renewal - Acme",
    status: "upcoming",
    websiteIds: ["ws_002"],
    websiteNames: ["Acme Corp - Main Website"],
    startAt: new Date(Date.now() + 5 * 86400000).toISOString(),
    endAt: new Date(Date.now() + 5 * 86400000 + 3600000).toISOString(),
    timezone: "UTC",
    recurrence: "none",
    reason: "SSL certificate renewal",
    suppressAlerts: true,
    continueRecordingChecks: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
];

type StatusFilter = "all" | "upcoming" | "active" | "completed";

function formatWindowDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function StatusChip({ status }: { status: MaintenanceWindow["status"] }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-amber-500/10 text-amber-400 border-amber-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Active
      </span>
    );
  }
  if (status === "upcoming") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-blue-500/10 text-blue-400 border-blue-500/20">
        Upcoming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border bg-zinc-800 text-zinc-400 border-zinc-700">
      Completed
    </span>
  );
}

interface WindowFormData {
  name: string;
  websites: string;
  startAt: string;
  endAt: string;
  timezone: string;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  reason: string;
  suppressAlerts: boolean;
  continueRecordingChecks: boolean;
}

const EMPTY_FORM: WindowFormData = {
  name: "",
  websites: "",
  startAt: "",
  endAt: "",
  timezone: "UTC",
  recurrence: "none",
  reason: "",
  suppressAlerts: true,
  continueRecordingChecks: true,
};

interface AddEditDialogProps {
  open: boolean;
  onClose: () => void;
  editing: MaintenanceWindow | null;
  onSave: (data: WindowFormData, editingId: string | null) => void;
}

function AddEditDialog({ open, onClose, editing, onSave }: AddEditDialogProps) {
  const [form, setForm] = useState<WindowFormData>(() =>
    editing
      ? {
          name: editing.name,
          websites: editing.websiteNames.join(", "),
          startAt: editing.startAt.slice(0, 16),
          endAt: editing.endAt.slice(0, 16),
          timezone: editing.timezone,
          recurrence: editing.recurrence,
          reason: editing.reason ?? "",
          suppressAlerts: editing.suppressAlerts,
          continueRecordingChecks: editing.continueRecordingChecks,
        }
      : EMPTY_FORM
  );

  function set<K extends keyof WindowFormData>(key: K, value: WindowFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    onSave(form, editing?.id ?? null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#18181B] border-[#27272A] text-zinc-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">
            {editing ? "Edit Maintenance Window" : "Add Maintenance Window"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Name</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Monthly DB Maintenance"
              className="bg-[#27272A] border-[#3F3F46] text-zinc-100 placeholder:text-zinc-600"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Websites</Label>
            <Input
              value={form.websites}
              onChange={(e) => set("websites", e.target.value)}
              placeholder="Search and select websites..."
              className="bg-[#27272A] border-[#3F3F46] text-zinc-100 placeholder:text-zinc-600"
            />
            <p className="text-[10px] text-zinc-600">Enter website names separated by commas</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Start Date/Time</Label>
              <Input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => set("startAt", e.target.value)}
                className="bg-[#27272A] border-[#3F3F46] text-zinc-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">End Date/Time</Label>
              <Input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => set("endAt", e.target.value)}
                className="bg-[#27272A] border-[#3F3F46] text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Timezone</Label>
              <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
                <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#18181B] border-[#27272A]">
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Recurrence</Label>
              <Select value={form.recurrence} onValueChange={(v) => set("recurrence", v as WindowFormData["recurrence"])}>
                <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#18181B] border-[#27272A]">
                  <SelectItem value="none" className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">None</SelectItem>
                  <SelectItem value="daily" className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">Daily</SelectItem>
                  <SelectItem value="weekly" className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">Weekly</SelectItem>
                  <SelectItem value="monthly" className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Reason (optional)</Label>
            <Textarea
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
              placeholder="Describe the maintenance purpose..."
              rows={2}
              className="bg-[#27272A] border-[#3F3F46] text-zinc-100 placeholder:text-zinc-600 resize-none"
            />
          </div>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-200">Suppress Alerts</p>
                <p className="text-xs text-zinc-500 mt-0.5">No alerts will be sent during this window</p>
              </div>
              <Switch
                checked={form.suppressAlerts}
                onCheckedChange={(v) => set("suppressAlerts", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-200">Continue Recording Checks</p>
                <p className="text-xs text-zinc-500 mt-0.5">Checks will run but status shows as Maintenance</p>
              </div>
              <Switch
                checked={form.continueRecordingChecks}
                onCheckedChange={(v) => set("continueRecordingChecks", v)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-[#27272A] bg-transparent text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editing ? "Save Changes" : "Schedule Window"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteDialogProps {
  window: MaintenanceWindow | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

function DeleteDialog({ window: win, open, onClose, onConfirm }: DeleteDialogProps) {
  const [confirmText, setConfirmText] = useState("");

  function handleConfirm() {
    if (confirmText !== win?.name) {
      toast.error("Name does not match");
      return;
    }
    onConfirm(win!.id);
    setConfirmText("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setConfirmText(""); } }}>
      <DialogContent className="bg-[#18181B] border-[#27272A] text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">Delete Maintenance Window</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-zinc-400">
            Are you sure you want to delete this maintenance window? This action cannot be undone.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">
              Type <span className="font-mono text-zinc-200">{win?.name}</span> to confirm
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={win?.name ?? ""}
              className="bg-[#27272A] border-[#3F3F46] text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => { onClose(); setConfirmText(""); }}
              className="border-[#27272A] bg-transparent text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirmText !== win?.name}
              className="bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40"
            >
              Delete Window
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MaintenanceView() {
  const [windows, setWindows] = useState<MaintenanceWindow[]>(MOCK_MAINTENANCE);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [addEditOpen, setAddEditOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceWindow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceWindow | null>(null);

  const filtered = statusFilter === "all" ? windows : windows.filter((w) => w.status === statusFilter);

  const TABS: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "upcoming", label: "Upcoming" },
    { id: "active", label: "Active" },
    { id: "completed", label: "Completed" },
  ];

  function handleSave(data: WindowFormData, editingId: string | null) {
    if (editingId) {
      setWindows((prev) =>
        prev.map((w) =>
          w.id === editingId
            ? {
                ...w,
                name: data.name,
                websiteNames: data.websites.split(",").map((s) => s.trim()).filter(Boolean),
                startAt: data.startAt ? new Date(data.startAt).toISOString() : w.startAt,
                endAt: data.endAt ? new Date(data.endAt).toISOString() : w.endAt,
                timezone: data.timezone,
                recurrence: data.recurrence,
                reason: data.reason || null,
                suppressAlerts: data.suppressAlerts,
                continueRecordingChecks: data.continueRecordingChecks,
                updatedAt: new Date().toISOString(),
              }
            : w
        )
      );
      toast.success("Maintenance window updated");
    } else {
      const newWindow: MaintenanceWindow = {
        id: `mw_${Date.now()}`,
        name: data.name,
        status: "upcoming",
        websiteIds: [],
        websiteNames: data.websites.split(",").map((s) => s.trim()).filter(Boolean),
        startAt: data.startAt ? new Date(data.startAt).toISOString() : new Date().toISOString(),
        endAt: data.endAt ? new Date(data.endAt).toISOString() : new Date().toISOString(),
        timezone: data.timezone,
        recurrence: data.recurrence,
        reason: data.reason || null,
        suppressAlerts: data.suppressAlerts,
        continueRecordingChecks: data.continueRecordingChecks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setWindows((prev) => [newWindow, ...prev]);
      toast.success("Maintenance window scheduled");
    }
    setAddEditOpen(false);
    setEditing(null);
  }

  function handleDelete(id: string) {
    setWindows((prev) => prev.filter((w) => w.id !== id));
    setDeleteTarget(null);
    toast.success("Maintenance window deleted");
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#27272A] flex items-start justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
            Maintenance Windows
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Schedule planned downtime periods</p>
        </div>
        <Button
          onClick={() => { setEditing(null); setAddEditOpen(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-sm mt-0.5"
        >
          <Plus className="w-4 h-4" />
          Add Window
        </Button>
      </div>

      {/* Status tabs */}
      <div className="px-8 border-b border-[#27272A] flex-shrink-0">
        <div className="flex gap-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize",
                statusFilter === tab.id
                  ? "text-zinc-50 border-blue-500"
                  : "text-zinc-500 border-transparent hover:text-zinc-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                <Clock className="w-5 h-5 text-zinc-600" />
              </div>
              <p className="text-sm font-medium text-zinc-400">No maintenance windows</p>
              <p className="text-xs text-zinc-600">Schedule a window to suppress alerts during planned downtime</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#27272A]">
                  {["Status", "Name", "Websites", "Start", "End", "Timezone", "Recurrence", "Reason", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((win) => (
                  <tr key={win.id} className="border-b border-[#27272A] hover:bg-zinc-800/50 transition-colors last:border-0">
                    <td className="px-4 py-3">
                      <StatusChip status={win.status} />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-zinc-200 whitespace-nowrap">{win.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-zinc-400">
                        {win.websiteNames.slice(0, 2).join(", ")}
                        {win.websiteNames.length > 2 && (
                          <span className="text-zinc-600"> and {win.websiteNames.length - 2} more</span>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-mono text-zinc-300">{formatWindowDate(win.startAt)}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-mono text-zinc-300">{formatWindowDate(win.endAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-zinc-400">{win.timezone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-zinc-400 capitalize">{win.recurrence}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-xs text-zinc-500 truncate">{win.reason ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditing(win); setAddEditOpen(true); }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(win)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AddEditDialog
        open={addEditOpen}
        onClose={() => { setAddEditOpen(false); setEditing(null); }}
        editing={editing}
        onSave={handleSave}
      />

      <DeleteDialog
        window={deleteTarget}
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
