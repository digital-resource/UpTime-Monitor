"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  Database,
  GitBranch,
  Hash,
  LayoutTemplate,
  Mail,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Rocket,
  Shield,
  Triangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { integrationService } from "@/lib/services/integrationService";
import { formatRelativeTime } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Integration, IntegrationStatus, IntegrationType } from "@/lib/types";

// ─── Icon map ─────────────────────────────────────────────────────────────────

function IntegrationIcon({ slug }: { slug: string }) {
  const cls = "w-5 h-5";
  switch (slug) {
    case "cloudflare":
      return <Shield className={cn(cls, "text-orange-400")} />;
    case "rocket_net":
      return <Rocket className={cn(cls, "text-blue-400")} />;
    case "webflow":
      return <LayoutTemplate className={cn(cls, "text-purple-400")} />;
    case "slack":
      return <Hash className={cn(cls, "text-emerald-400")} />;
    case "mailgun":
      return <Mail className={cn(cls, "text-rose-400")} />;
    case "vercel":
      return <Triangle className={cn(cls, "text-zinc-100")} />;
    case "supabase":
      return <Database className={cn(cls, "text-green-400")} />;
    case "github":
      return <GitBranch className={cn(cls, "text-zinc-300")} />;
    default:
      return (
        <span className="w-5 h-5 flex items-center justify-center text-zinc-400 font-bold text-sm">
          {slug[0].toUpperCase()}
        </span>
      );
  }
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function statusBadgeClass(status: IntegrationStatus): string {
  switch (status) {
    case "connected":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "auth_error":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    case "not_configured":
      return "bg-zinc-800 text-zinc-500 border-zinc-700";
    case "syncing":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "rate_limited":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "last_sync_failed":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    default:
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  }
}

function statusLabel(status: IntegrationStatus): string {
  switch (status) {
    case "connected":
      return "Connected";
    case "auth_error":
      return "Auth Error";
    case "not_configured":
      return "Not Configured";
    case "syncing":
      return "Syncing";
    case "rate_limited":
      return "Rate Limited";
    case "partial_sync":
      return "Partial Sync";
    case "connection_failed":
      return "Connection Failed";
    case "disabled":
      return "Disabled";
    case "last_sync_failed":
      return "Last Sync Failed";
    default:
      return status;
  }
}

// ─── Section labels ───────────────────────────────────────────────────────────

const SECTION_LABELS: Record<IntegrationType, string> = {
  discovery: "WEBSITE DISCOVERY & IMPORT",
  alert: "ALERT DELIVERY",
  infrastructure: "INFRASTRUCTURE & DEPLOYMENT",
};

// ─── Integration card ─────────────────────────────────────────────────────────

interface IntegrationCardProps {
  integration: Integration;
  syncing: boolean;
  onSyncNow: () => void;
  onTest: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

function IntegrationCard({
  integration,
  syncing,
  onSyncNow,
  onTest,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  const isConnected = integration.status === "connected";
  const isAuthError = integration.status === "auth_error";
  const isNotConfigured = integration.status === "not_configured";

  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#27272A] flex items-center justify-center flex-shrink-0">
            <IntegrationIcon slug={integration.slug} />
          </div>
          <div>
            <p
              className="text-sm font-semibold text-zinc-50"
              style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}
            >
              {integration.name}
            </p>
            <span
              className={cn(
                "inline-flex items-center rounded-full border text-[11px] uppercase tracking-wide px-2.5 py-0.5 font-medium mt-0.5",
                statusBadgeClass(integration.status)
              )}
            >
              {integration.status === "syncing" && (
                <RefreshCw className="w-2.5 h-2.5 mr-1 animate-spin" />
              )}
              {statusLabel(integration.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {integration.lastError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
          <p className="text-[11px] text-rose-300">{integration.lastError}</p>
        </div>
      )}

      {/* Discovery stats */}
      {integration.type === "discovery" && isConnected && integration.websitesDiscovered !== null && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
            <Clock className="w-3 h-3" />
            Last sync: {formatRelativeTime(integration.lastSuccessAt)}
          </div>
          <p className="text-xs text-zinc-400">
            Discovered: {integration.websitesDiscovered} sites
          </p>
          <p className="text-[11px] text-zinc-500">
            Imported: {integration.websitesImported} &middot; Updated: {integration.websitesUpdated} &middot; Skipped: {integration.websitesSkipped}
          </p>
        </div>
      )}

      {/* Alert delivery stats */}
      {integration.type === "alert" && isConnected && (
        <div className="space-y-1">
          {integration.lastSuccessAt && (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
              <Clock className="w-3 h-3" />
              Last delivery: {formatRelativeTime(integration.lastSuccessAt)}
            </div>
          )}
          {(integration.config.workspaceName as string | undefined) && (
            <p className="text-xs text-zinc-400">
              Workspace: {String(integration.config.workspaceName)}
            </p>
          )}
          {(integration.config.defaultChannel as string | undefined) && (
            <p className="text-xs text-zinc-500">
              Default: {String(integration.config.defaultChannel)}
            </p>
          )}
          {(integration.config.domain as string | undefined) && (
            <p className="text-xs text-zinc-400">Domain: {String(integration.config.domain)}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1">
        {isNotConfigured && (
          <Button
            size="sm"
            onClick={onConnect}
            className="h-8 text-xs flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Connect
          </Button>
        )}
        {isAuthError && (
          <Button
            size="sm"
            onClick={onConnect}
            className="h-8 text-xs flex-1 bg-rose-600 hover:bg-rose-700 text-white"
          >
            Reconnect
          </Button>
        )}
        {isConnected && (
          <>
            {integration.type === "discovery" && (
              <Button
                size="sm"
                variant="outline"
                disabled={syncing}
                onClick={onSyncNow}
                className="h-8 text-xs border-[#3F3F46] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              >
                <RefreshCw
                  className={cn("w-3 h-3 mr-1.5", syncing && "animate-spin")}
                />
                Sync Now
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onConnect}
              className="h-8 text-xs border-[#3F3F46] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              Configure
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-[#3F3F46] text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-[#18181B] border-[#27272A] text-zinc-300 text-xs"
              >
                <DropdownMenuItem onClick={onTest}>
                  Test Connection
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info("View logs")}>
                  View Logs
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#27272A]" />
                <DropdownMenuItem
                  onClick={onDisconnect}
                  className="text-rose-400 focus:text-rose-400"
                >
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
        {!isConnected && !isNotConfigured && !isAuthError && (
          <Button
            size="sm"
            variant="outline"
            onClick={onConnect}
            className="h-8 text-xs flex-1 border-[#3F3F46] text-zinc-400 hover:text-zinc-100"
          >
            Configure
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Slack configure dialog ───────────────────────────────────────────────────

function SlackConfigureDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [webhookUrl, setWebhookUrl]       = useState("");
  const [workspaceName, setWorkspaceName] = useState("Digital Resource");
  const [channel, setChannel]             = useState("#alerts");
  const [saving, setSaving]               = useState(false);

  async function handleSave() {
    if (!webhookUrl.trim()) {
      toast.error("Please enter a Slack webhook URL");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/slack/configure", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim(), workspaceName, defaultChannel: channel }),
      });
      const json = await res.json() as { success: boolean; message: string };
      if (json.success) {
        toast.success(json.message);
        onSaved();
        onClose();
      } else {
        toast.error(json.message);
      }
    } catch {
      toast.error("Failed to save Slack configuration");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#18181B] border-[#27272A] text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">Connect Slack</DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm">
            Enter your Slack Incoming Webhook URL. Alerts will be delivered when sites go down or recover.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Webhook URL</Label>
            <Input
              placeholder="https://hooks.slack.com/services/…"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="bg-[#09090B] border-[#3F3F46] text-zinc-100 text-sm placeholder:text-zinc-600 focus-visible:ring-blue-500"
            />
            <p className="text-[11px] text-zinc-600">
              Create one at api.slack.com → Your Apps → Incoming Webhooks
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Workspace name</Label>
            <Input
              placeholder="My Team"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="bg-[#09090B] border-[#3F3F46] text-zinc-100 text-sm placeholder:text-zinc-600 focus-visible:ring-blue-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Default channel</Label>
            <Input
              placeholder="#alerts"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="bg-[#09090B] border-[#3F3F46] text-zinc-100 text-sm placeholder:text-zinc-600 focus-visible:ring-blue-500"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-[#3F3F46] text-zinc-400 hover:text-zinc-100"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={saving}
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? "Connecting…" : "Connect & Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function IntegrationsView() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [slackDialogOpen, setSlackDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await integrationService.list();
      setIntegrations(data);
    } finally {
      setLoading(false);
    }
  };

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const webflowResult = searchParams.get("webflow");
    if (!webflowResult) return;
    if (webflowResult === "connected") {
      toast.success("Webflow connected — syncing sites now");
      integrationService.list().then((data) => {
        const webflow = data.find((i) => i.slug === "webflow");
        if (webflow) handleSync(webflow.id, "Webflow");
      });
    } else {
      toast.error("Failed to connect Webflow — please try again");
    }
    router.replace("/integrations");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleSync(id: string, name: string) {
    setSyncing(id);
    try {
      await integrationService.syncNow(id);
      toast.success(`Sync started for ${name}`);
      load();
    } catch {
      toast.error("Failed to start sync");
    } finally {
      setSyncing(null);
    }
  }

  async function handleTest(id: string, slug: string) {
    if (slug === "slack") {
      const t = toast.loading("Sending test message to Slack…");
      try {
        const res  = await fetch("/api/integrations/slack/test", { method: "POST" });
        const json = await res.json() as { success: boolean; message: string };
        toast.dismiss(t);
        json.success ? toast.success(json.message) : toast.error(json.message);
      } catch {
        toast.dismiss(t);
        toast.error("Slack test failed");
      }
      return;
    }
    const t = toast.loading("Testing connection…");
    try {
      const result = await integrationService.testConnection(id);
      toast.dismiss(t);
      result.success ? toast.success(result.message) : toast.error(result.message);
    } catch {
      toast.dismiss(t);
      toast.error("Connection test failed");
    }
  }

  async function handleDisconnect(id: string, name: string) {
    try {
      await integrationService.disconnect(id);
      toast.success(`${name} disconnected`);
      load();
    } catch {
      toast.error("Failed to disconnect");
    }
  }

  function handleConnect(slug: string, name: string) {
    if (slug === "slack") {
      setSlackDialogOpen(true);
      return;
    }
    if (slug === "webflow") {
      window.location.href = "/api/integrations/webflow/authorize";
      return;
    }
    toast.info(`Connect ${name} — coming soon`);
  }

  const grouped = integrations.reduce<Record<IntegrationType, Integration[]>>(
    (acc, int) => {
      if (!acc[int.type]) acc[int.type] = [];
      acc[int.type].push(int);
      return acc;
    },
    { discovery: [], alert: [], infrastructure: [] }
  );

  const sectionOrder: IntegrationType[] = ["discovery", "alert", "infrastructure"];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#27272A] bg-[#09090B] flex-shrink-0 flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-semibold text-zinc-50"
            style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}
          >
            Integrations
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Connect external services</p>
        </div>
        <Button
          size="sm"
          className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white mt-0.5"
          onClick={() => toast.info("Add Integration dialog")}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Integration
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-10">
        {loading ? (
          <>
            {sectionOrder.map((type) => (
              <div key={type} className="space-y-4">
                <Skeleton className="h-4 w-48 bg-zinc-800" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: type === "alert" ? 2 : 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-52 rounded-2xl bg-zinc-800/50" />
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          sectionOrder.map((type) => {
            const items = grouped[type] ?? [];
            if (items.length === 0) return null;
            return (
              <div key={type}>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                  {SECTION_LABELS[type]}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((integration) => (
                    <IntegrationCard
                      key={integration.id}
                      integration={integration}
                      syncing={syncing === integration.id}
                      onSyncNow={() => handleSync(integration.id, integration.name)}
                      onTest={() => handleTest(integration.id, integration.slug)}
                      onConnect={() => handleConnect(integration.slug, integration.name)}
                      onDisconnect={() => handleDisconnect(integration.id, integration.name)}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <SlackConfigureDialog
        open={slackDialogOpen}
        onClose={() => setSlackDialogOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
