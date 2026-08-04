"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Settings,
  Activity,
  Bell,
  Lock,
  Database,
  AlertTriangle,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type SettingsSection =
  | "general"
  | "monitoring"
  | "alerts"
  | "security"
  | "retention"
  | "danger";

const NAV_ITEMS: { id: SettingsSection; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "General", icon: Settings },
  { id: "monitoring", label: "Monitoring", icon: Activity },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "security", label: "Security", icon: Lock },
  { id: "retention", label: "Data Retention", icon: Database },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

const DATE_FORMATS = [
  { value: "MMM d, yyyy", label: "MMM d, yyyy (Jul 20, 2026)" },
  { value: "d MMM yyyy", label: "d MMM yyyy (20 Jul 2026)" },
  { value: "yyyy-MM-dd", label: "yyyy-MM-dd (2026-07-20)" },
  { value: "MM/dd/yyyy", label: "MM/dd/yyyy (07/20/2026)" },
];

const CHECK_INTERVALS = [
  { value: "60", label: "1 minute" },
  { value: "120", label: "2 minutes" },
  { value: "300", label: "5 minutes" },
  { value: "600", label: "10 minutes" },
  { value: "1800", label: "30 minutes" },
  { value: "3600", label: "1 hour" },
];

const TIMEOUTS = [
  { value: "10", label: "10 seconds" },
  { value: "15", label: "15 seconds" },
  { value: "30", label: "30 seconds" },
  { value: "60", label: "60 seconds" },
];

const SSL_WARNINGS = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
];

const SESSION_DURATIONS = [
  { value: "1h", label: "1 hour" },
  { value: "4h", label: "4 hours" },
  { value: "8h", label: "8 hours" },
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
];

const RETENTION_OPTIONS = [
  { value: "7d", label: "7 days" },
  { value: "14d", label: "14 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "180d", label: "180 days" },
  { value: "1y", label: "1 year" },
];

const MOCK_SESSIONS = [
  { id: "s1", device: "Chrome on macOS", ip: "192.168.1.10", lastSeen: "Just now" },
  { id: "s2", device: "Safari on iPhone", ip: "10.0.1.22", lastSeen: "2 hours ago" },
];

const MOCK_LOGIN_HISTORY = [
  { id: "lh1", device: "Chrome on macOS", ip: "192.168.1.10", at: "Jul 20, 2026 14:23", result: "success" },
  { id: "lh2", device: "Safari on iPhone", ip: "10.0.1.22", at: "Jul 20, 2026 10:01", result: "success" },
  { id: "lh3", device: "Chrome on macOS", ip: "192.168.1.10", at: "Jul 19, 2026 09:45", result: "success" },
  { id: "lh4", device: "Unknown", ip: "203.0.113.5", at: "Jul 18, 2026 03:12", result: "failure" },
  { id: "lh5", device: "Chrome on macOS", ip: "192.168.1.10", at: "Jul 17, 2026 15:30", result: "success" },
];

interface DangerDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmWord: string;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
}

function DangerDialog({ open, onClose, title, description, confirmWord, confirmLabel, onConfirm, destructive = true }: DangerDialogProps) {
  const [input, setInput] = useState("");

  function handleConfirm() {
    if (input !== confirmWord) {
      toast.error(`Type "${confirmWord}" to confirm`);
      return;
    }
    onConfirm();
    setInput("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setInput(""); } }}>
      <DialogContent className="bg-[#18181B] border-[#27272A] text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-zinc-400">{description}</p>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">
              Type <span className="font-mono text-zinc-200">{confirmWord}</span> to confirm
            </Label>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={confirmWord}
              className="bg-[#27272A] border-[#3F3F46] text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { onClose(); setInput(""); }} className="border-[#27272A] bg-transparent text-zinc-300 hover:bg-zinc-800">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={input !== confirmWord}
              className={cn("disabled:opacity-40", destructive ? "bg-rose-600 hover:bg-rose-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white")}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmailTagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  function add() {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setDraft("");
  }
  function remove(email: string) {
    onChange(value.filter((e) => e !== email));
  }
  return (
    <div className="bg-[#27272A] border border-[#3F3F46] rounded-md p-2 flex flex-wrap gap-1.5 min-h-[40px]">
      {value.map((email) => (
        <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-700 border border-zinc-600 rounded-full text-xs text-zinc-200">
          {email}
          <button onClick={() => remove(email)} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder="Add email..."
        className="flex-1 min-w-[120px] bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 outline-none"
      />
    </div>
  );
}

// ---- Section Components ----

function GeneralSection() {
  const [orgName, setOrgName] = useState("My Organization");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("MMM d, yyyy");
  const [environment, setEnvironment] = useState("production");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await new Promise<void>((r) => { setTimeout(r, 600); });
    setSaving(false);
    toast.success("General settings saved");
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-100">General</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Organization-wide defaults</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Organization Name</Label>
          <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="bg-[#27272A] border-[#3F3F46] text-zinc-100 max-w-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-zinc-100 max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#18181B] border-[#27272A]">
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Date Format</Label>
          <Select value={dateFormat} onValueChange={setDateFormat}>
            <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-zinc-100 max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#18181B] border-[#27272A]">
              {DATE_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Default Environment</Label>
          <Select value={environment} onValueChange={setEnvironment}>
            <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-zinc-100 max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#18181B] border-[#27272A]">
              {["production", "staging", "development", "preview", "internal"].map((e) => (
                <SelectItem key={e} value={e} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 capitalize">{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}

function MonitoringSection() {
  const [intervalVal, setIntervalVal] = useState("120");
  const [timeoutVal, setTimeoutVal] = useState("30");
  const [failureThreshold, setFailureThreshold] = useState("3");
  const [recoveryThreshold, setRecoveryThreshold] = useState("2");
  const [followRedirects, setFollowRedirects] = useState(true);
  const [sslWarning, setSslWarning] = useState("30");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await new Promise<void>((r) => { window.setTimeout(r, 600); });
    setSaving(false);
    toast.success("Monitoring defaults saved");
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-100">Monitoring Defaults</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Applied to new websites unless overridden</p>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Default Check Interval</Label>
            <Select value={intervalVal} onValueChange={setIntervalVal}>
              <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#18181B] border-[#27272A]">
                {CHECK_INTERVALS.map((i) => (
                  <SelectItem key={i.value} value={i.value} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">{i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Default Timeout</Label>
            <Select value={timeoutVal} onValueChange={setTimeoutVal}>
              <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#18181B] border-[#27272A]">
                {TIMEOUTS.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Default Failure Threshold</Label>
            <Input
              type="number"
              min="1"
              value={failureThreshold}
              onChange={(e) => setFailureThreshold(e.target.value)}
              className="bg-[#27272A] border-[#3F3F46] text-zinc-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Default Recovery Threshold</Label>
            <Input
              type="number"
              min="1"
              value={recoveryThreshold}
              onChange={(e) => setRecoveryThreshold(e.target.value)}
              className="bg-[#27272A] border-[#3F3F46] text-zinc-100"
            />
          </div>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-zinc-200">Follow Redirects by default</p>
            <p className="text-xs text-zinc-500 mt-0.5">Automatically follow HTTP redirects</p>
          </div>
          <Switch checked={followRedirects} onCheckedChange={setFollowRedirects} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">SSL Warning Period</Label>
          <Select value={sslWarning} onValueChange={setSslWarning}>
            <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-zinc-100 max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#18181B] border-[#27272A]">
              {SSL_WARNINGS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}

function AlertsSection() {
  const [slackChannel, setSlackChannel] = useState("#alerts");
  const [emailRecipients, setEmailRecipients] = useState<string[]>(["alerts@company.com"]);
  const [groupThreshold, setGroupThreshold] = useState("3");
  const [recoveryNotifications, setRecoveryNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await new Promise<void>((r) => { setTimeout(r, 600); });
    setSaving(false);
    toast.success("Alert settings saved");
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-100">Alerts</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Default alert delivery configuration</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Default Slack Channel</Label>
          <Input
            value={slackChannel}
            onChange={(e) => setSlackChannel(e.target.value)}
            placeholder="#alerts"
            className="bg-[#27272A] border-[#3F3F46] text-zinc-100 placeholder:text-zinc-600 max-w-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Default Email Recipients</Label>
          <div className="max-w-sm">
            <EmailTagInput value={emailRecipients} onChange={setEmailRecipients} />
          </div>
          <p className="text-[10px] text-zinc-600">Press Enter or comma to add</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Group Outage Threshold</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              value={groupThreshold}
              onChange={(e) => setGroupThreshold(e.target.value)}
              className="bg-[#27272A] border-[#3F3F46] text-zinc-100 w-24"
            />
            <span className="text-xs text-zinc-500">sites down before sending a grouped alert</span>
          </div>
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-zinc-200">Recovery Notifications</p>
            <p className="text-xs text-zinc-500 mt-0.5">Send alert when a site recovers</p>
          </div>
          <Switch checked={recoveryNotifications} onCheckedChange={setRecoveryNotifications} />
        </div>
      </div>
      <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}

function SecuritySection() {
  const [minPasswordLength, setMinPasswordLength] = useState("12");
  const [require2fa, setRequire2fa] = useState(false);
  const [sessionDuration, setSessionDuration] = useState("8h");
  const [sessions, setSessions] = useState(MOCK_SESSIONS);

  function revokeSession(id: string) {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    toast.success("Session revoked");
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-100">Security</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Authentication and session settings</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Password Minimum Length</Label>
          <Input
            type="number"
            min="8"
            value={minPasswordLength}
            onChange={(e) => setMinPasswordLength(e.target.value)}
            className="bg-[#27272A] border-[#3F3F46] text-zinc-100 w-28"
          />
        </div>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-zinc-200">Require 2FA</p>
            <p className="text-xs text-zinc-500 mt-0.5">Force all users to enable two-factor authentication</p>
          </div>
          <Switch checked={require2fa} onCheckedChange={setRequire2fa} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-400">Session Duration</Label>
          <Select value={sessionDuration} onValueChange={setSessionDuration}>
            <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-zinc-100 max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#18181B] border-[#27272A]">
              {SESSION_DURATIONS.map((d) => (
                <SelectItem key={d.value} value={d.value} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator className="bg-[#27272A]" />

      <div>
        <p className="text-sm font-semibold text-zinc-200 mb-3">Active Sessions</p>
        <div className="bg-[#27272A]/50 border border-[#3F3F46] rounded-xl overflow-hidden">
          {sessions.map((session, i) => (
            <div key={session.id} className={cn("flex items-center justify-between px-4 py-3", i < sessions.length - 1 && "border-b border-[#3F3F46]")}>
              <div>
                <p className="text-sm text-zinc-200">{session.device}</p>
                <p className="text-xs text-zinc-500 mt-0.5 font-mono">{session.ip} · {session.lastSeen}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => revokeSession(session.id)}
                className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 bg-transparent"
              >
                Revoke
              </Button>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-xs text-zinc-500 px-4 py-3">No active sessions</p>
          )}
        </div>
      </div>

      <Separator className="bg-[#27272A]" />

      <div>
        <p className="text-sm font-semibold text-zinc-200 mb-3">Login History</p>
        <div className="space-y-2">
          {MOCK_LOGIN_HISTORY.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-300">{entry.device}</p>
                <p className="text-[10px] text-zinc-600 font-mono">{entry.ip} · {entry.at}</p>
              </div>
              <span className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                entry.result === "success"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              )}>
                {entry.result}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RetentionSection() {
  const [checkHistory, setCheckHistory] = useState("90d");
  const [incidentHistory, setIncidentHistory] = useState("1y");
  const [alertHistory, setAlertHistory] = useState("90d");
  const [auditLog, setAuditLog] = useState("1y");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await new Promise<void>((r) => { setTimeout(r, 600); });
    setSaving(false);
    toast.success("Retention settings saved");
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-zinc-100">Data Retention</h2>
        <p className="text-xs text-zinc-500 mt-0.5">How long historical data is kept</p>
      </div>
      <div className="space-y-4">
        {([
          { label: "Check History Retention", value: checkHistory, onChange: setCheckHistory },
          { label: "Incident History Retention", value: incidentHistory, onChange: setIncidentHistory },
          { label: "Alert History Retention", value: alertHistory, onChange: setAlertHistory },
          { label: "Audit Log Retention", value: auditLog, onChange: setAuditLog },
        ] as const).map((field) => (
          <div key={field.label} className="space-y-1.5">
            <Label className="text-xs text-zinc-400">{field.label}</Label>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-zinc-100 max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#18181B] border-[#27272A]">
                {RETENTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}

function DangerSection({ orgName }: { orgName: string }) {
  const [disableOpen, setDisableOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-rose-400">Danger Zone</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Irreversible actions — proceed with care</p>
      </div>

      <div className="border border-rose-500/30 bg-rose-500/5 rounded-2xl divide-y divide-rose-500/20">
        {/* Disable monitoring */}
        <div className="flex items-start justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-semibold text-zinc-100">Disable All Monitoring</p>
            <p className="text-xs text-zinc-500 mt-0.5">Stop all checks immediately</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDisableOpen(true)}
            className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 bg-transparent flex-shrink-0"
          >
            Disable Monitoring
          </Button>
        </div>

        {/* Clear history */}
        <div className="flex items-start justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-semibold text-zinc-100">Clear Check History</p>
            <p className="text-xs text-zinc-500 mt-0.5">Delete all historical check data</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setClearOpen(true)}
            className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 bg-transparent flex-shrink-0"
          >
            Clear History
          </Button>
        </div>

        {/* Delete all data */}
        <div className="flex items-start justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-semibold text-zinc-100">Delete Organization Data</p>
            <p className="text-xs text-zinc-500 mt-0.5">Permanently delete all data — cannot be undone</p>
          </div>
          <Button
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white flex-shrink-0"
          >
            Delete All Data
          </Button>
        </div>
      </div>

      <DangerDialog
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        title="Disable All Monitoring"
        description="This will immediately stop all checks across all websites. No alerts will be sent while monitoring is disabled."
        confirmWord="DISABLE"
        confirmLabel="Disable Monitoring"
        onConfirm={() => toast.warning("All monitoring disabled")}
      />
      <DangerDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="Clear Check History"
        description="All historical check data will be permanently deleted. This cannot be undone."
        confirmWord="CLEAR"
        confirmLabel="Clear History"
        onConfirm={() => toast.warning("Check history cleared")}
      />
      <DangerDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete All Organization Data"
        description="All websites, incidents, alerts, users, and settings will be permanently deleted. This action cannot be undone."
        confirmWord={orgName}
        confirmLabel="Delete Everything"
        onConfirm={() => toast.error("Organization data deleted")}
      />
    </div>
  );
}

export function SettingsView() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const orgName = "My Organization";

  return (
    <div className="flex h-full">
      {/* Left nav */}
      <aside className="w-52 flex-shrink-0 border-r border-[#27272A] px-3 py-6 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isDanger = item.id === "danger";
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                activeSection === item.id
                  ? isDanger
                    ? "bg-rose-500/10 text-rose-400"
                    : "bg-zinc-800 text-zinc-100"
                  : isDanger
                  ? "text-rose-500/70 hover:bg-rose-500/5 hover:text-rose-400"
                  : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </button>
          );
        })}
      </aside>

      {/* Right content */}
      <main className="flex-1 overflow-auto px-8 py-6 max-w-2xl">
        {activeSection === "general" && <GeneralSection />}
        {activeSection === "monitoring" && <MonitoringSection />}
        {activeSection === "alerts" && <AlertsSection />}
        {activeSection === "security" && <SecuritySection />}
        {activeSection === "retention" && <RetentionSection />}
        {activeSection === "danger" && <DangerSection orgName={orgName} />}
      </main>
    </div>
  );
}
