import { formatDistanceToNow, format, parseISO } from "date-fns";
import type { WebsiteStatus, Provider, Source, AlertStatus, AlertType, IncidentStatus } from "@/lib/types";

export function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never";
  try {
    return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

export function formatDateTime(dateString: string | null): string {
  if (!dateString) return "—";
  try {
    return format(parseISO(dateString), "MMM d, yyyy HH:mm:ss");
  } catch {
    return "Invalid date";
  }
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function formatResponseTime(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatUptime(uptime: number | null): string {
  if (uptime === null) return "—";
  return `${uptime.toFixed(2)}%`;
}

export function getStatusColor(status: WebsiteStatus): string {
  switch (status) {
    case "up": return "text-emerald-400";
    case "down": return "text-rose-400";
    case "degraded": return "text-amber-400";
    case "paused": return "text-zinc-400";
    case "pending": return "text-violet-400";
    case "maintenance": return "text-blue-400";
    case "never_checked": return "text-zinc-500";
    case "disabled": return "text-zinc-600";
    case "unknown": return "text-zinc-500";
    default: return "text-zinc-400";
  }
}

export function getStatusBgColor(status: WebsiteStatus): string {
  switch (status) {
    case "up": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "down": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    case "degraded": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "paused": return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    case "pending": return "bg-violet-500/10 text-violet-400 border-violet-500/20";
    case "maintenance": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "never_checked": return "bg-zinc-800 text-zinc-500 border-zinc-700";
    case "disabled": return "bg-zinc-800 text-zinc-600 border-zinc-700";
    case "unknown": return "bg-zinc-800 text-zinc-500 border-zinc-700";
    default: return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }
}

export function getStatusLabel(status: WebsiteStatus): string {
  switch (status) {
    case "up": return "Up";
    case "down": return "Down";
    case "degraded": return "Degraded";
    case "paused": return "Paused";
    case "pending": return "Pending";
    case "maintenance": return "Maintenance";
    case "never_checked": return "Never Checked";
    case "disabled": return "Disabled";
    case "unknown": return "Unknown";
    default: return status;
  }
}

export function getIncidentStatusColor(status: IncidentStatus): string {
  switch (status) {
    case "open": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    case "acknowledged": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "resolved": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    default: return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }
}

export function getAlertStatusColor(status: AlertStatus): string {
  switch (status) {
    case "delivered": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "sent": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "queued": return "bg-zinc-800 text-zinc-400 border-zinc-700";
    case "failed": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    case "retrying": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "suppressed": return "bg-zinc-800 text-zinc-500 border-zinc-700";
    case "grouped": return "bg-violet-500/10 text-violet-400 border-violet-500/20";
    default: return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }
}

export function getAlertTypeLabel(type: AlertType): string {
  switch (type) {
    case "down": return "Down";
    case "degraded": return "Degraded";
    case "recovery": return "Recovery";
    case "ssl_expiry": return "SSL Expiry";
    case "maintenance_start": return "Maint. Start";
    case "maintenance_end": return "Maint. End";
    default: return type;
  }
}

export function getProviderLabel(provider: Provider): string {
  const labels: Record<Provider, string> = {
    rocket_net: "Rocket.net",
    webflow: "Webflow",
    wordpress: "WordPress",
    wp_engine: "WP Engine",
    siteground: "SiteGround",
    cloudways: "Cloudways",
    squarespace: "Squarespace",
    wix: "Wix",
    shopify: "Shopify",
    vercel: "Vercel",
    aws: "AWS",
    custom_server: "Custom Server",
    unknown: "Unknown",
    other: "Other",
  };
  return labels[provider] ?? provider;
}

export function getSourceLabel(source: Source): string {
  const labels: Record<Source, string> = {
    manual: "Manual",
    cloudflare_import: "Cloudflare",
    rocket_net_import: "Rocket.net",
    webflow_import: "Webflow",
    vercel_import: "Vercel",
    github_import: "GitHub",
    api: "API",
  };
  return labels[source] ?? source;
}

export function normalizeUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

export function extractDomain(url: string): string {
  try {
    return new URL(normalizeUrl(url)).hostname;
  } catch {
    return url;
  }
}
