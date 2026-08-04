"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Play,
  Pause,
  RefreshCw,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  ShieldAlert,
  AlertTriangle,
  Wrench,
  TrendingUp,
  Bell,
  Settings,
  History,
  AlertCircle,
  Globe,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/websites/StatusBadge";
import { websiteService } from "@/lib/services/websiteService";
import {
  formatRelativeTime,
  formatResponseTime,
  formatUptime,
  formatDateTime,
  formatDuration,
  getProviderLabel,
  getSourceLabel,
  getIncidentStatusColor,
} from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import type { Website, WebsiteStatus, CheckResult } from "@/lib/types";
import { MOCK_INCIDENTS } from "@/lib/mock-data/incidents";

// ─── Mock Check History ───────────────────────────────────────────────────────

function generateCheckHistory(websiteId: string): CheckResult[] {
  const statuses = [
    "up", "up", "up", "up", "up",
    "degraded", "up", "up", "up", "up",
  ];
  return Array.from({ length: 20 }, (_, i) => ({
    id: `chk_${i}`,
    websiteId,
    checkedAt: new Date(Date.now() - i * 120000).toISOString(),
    status: statuses[i % statuses.length] as WebsiteStatus,
    httpStatus: statuses[i % statuses.length] === "up" ? 200 : 200,
    responseTime: 180 + Math.floor(Math.random() * 200),
    error: null,
    region: "us-east-1",
    dnsTime: 12,
    connectTime: 45,
    tlsTime: 23,
    ttfbTime: 98,
  }));
}

// ─── Uptime Timeline ──────────────────────────────────────────────────────────

function UptimeTimeline({ websiteId }: { websiteId: string }) {
  const blocks = Array.from({ length: 90 }, (_, i) => {
    // deterministic based on websiteId + day index so SSR matches client
    const hash = websiteId.charCodeAt(websiteId.length - 1) + i;
    const rand = ((hash * 9301 + 49297) % 233280) / 233280;
    const status: WebsiteStatus =
      rand > 0.97 ? "down" : rand > 0.94 ? "degraded" : "up";
    return { day: i, status };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-zinc-500">90 days ago</span>
        <span className="text-[11px] text-zinc-500">Today</span>
      </div>
      <div className="flex gap-0.5 h-8">
        {blocks.map((b) => (
          <div
            key={b.day}
            title={`Day ${90 - b.day}: ${b.status}`}
            className={cn(
              "flex-1 rounded-sm",
              b.status === "up"
                ? "bg-emerald-500"
                : b.status === "degraded"
                ? "bg-amber-500"
                : b.status === "down"
                ? "bg-rose-500"
                : "bg-zinc-700"
            )}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-2">
        <LegendItem color="bg-emerald-500" label="Up" />
        <LegendItem color="bg-amber-500" label="Degraded" />
        <LegendItem color="bg-rose-500" label="Down" />
        <LegendItem color="bg-zinc-700" label="No data" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-2.5 h-2.5 rounded-sm", color)} />
      <span className="text-[11px] text-zinc-500">{label}</span>
    </div>
  );
}

// ─── Metric Pill ──────────────────────────────────────────────────────────────

function MetricPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-full">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span className={cn("text-xs font-semibold font-mono", color ?? "text-zinc-200")}>
        {value}
      </span>
    </div>
  );
}

// ─── Tab Types ────────────────────────────────────────────────────────────────

type Tab =
  | "overview"
  | "history"
  | "incidents"
  | "performance"
  | "ssl"
  | "alerts"
  | "settings"
  | "activity";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "history", label: "Check History" },
  { id: "incidents", label: "Incidents" },
  { id: "performance", label: "Performance" },
  { id: "ssl", label: "SSL & Domain" },
  { id: "alerts", label: "Alerts" },
  { id: "settings", label: "Settings" },
  { id: "activity", label: "Activity" },
];

// ─── Stat Row ─────────────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#27272A] last:border-0">
      <span className="text-[11px] text-zinc-500 uppercase tracking-wider flex-shrink-0">{label}</span>
      <span className="text-sm text-zinc-200 text-right ml-4">{value}</span>
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

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ website }: { website: Website }) {
  const checks = generateCheckHistory(website.id);

  const chartData = checks
    .slice()
    .reverse()
    .map((c) => ({
      time: format(parseISO(c.checkedAt), "HH:mm"),
      responseTime: c.responseTime ?? 0,
    }));

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left column */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        {/* Active Incident */}
        {website.hasActiveIncident && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-rose-300">Active Incident</p>
                <p className="text-xs text-rose-400/80 mt-1">
                  This website has an ongoing incident. Check the Incidents tab for details.
                </p>
                {website.activeIncidentId && (
                  <Link
                    href={`/incidents/${website.activeIncidentId}`}
                    className="inline-flex items-center gap-1 mt-2 text-xs text-rose-400 hover:text-rose-300 underline"
                  >
                    View incident #{website.activeIncidentId}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Response Time Chart */}
        <Card title="Response Time — Last 24h">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="rtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#71717A", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "#71717A", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  unit="ms"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181B",
                    border: "1px solid #27272A",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#e4e4e7",
                  }}
                  formatter={(val: unknown) => [`${(val as number) ?? 0}ms`, "Response Time"] as [string, string]}
                />
                <Area
                  type="monotone"
                  dataKey="responseTime"
                  stroke="#2563EB"
                  fill="url(#rtGrad)"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Uptime Timeline */}
        <Card title="Uptime — Last 90 Days">
          <UptimeTimeline websiteId={website.id} />
        </Card>

        {/* Recent Checks */}
        <Card title="Recent Checks">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#27272A]">
                  {["Time", "Status", "HTTP", "Response", "Region"].map((h) => (
                    <th
                      key={h}
                      className="pb-2 text-left text-[10px] uppercase tracking-wider text-zinc-600 font-semibold pr-4 last:pr-0"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {checks.slice(0, 10).map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 pr-4 text-zinc-400 font-mono whitespace-nowrap">
                      {format(parseISO(c.checkedAt), "HH:mm:ss")}
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={cn(
                          "font-mono",
                          (c.httpStatus ?? 0) < 400 ? "text-emerald-400" : "text-rose-400"
                        )}
                      >
                        {c.httpStatus ?? "—"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-zinc-300">
                      {formatResponseTime(c.responseTime)}
                    </td>
                    <td className="py-2.5 text-zinc-500">{c.region}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Right column */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        {/* Current Status */}
        <Card title="Current Status">
          <StatRow label="Status" value={<StatusBadge status={website.status} size="sm" />} />
          <StatRow
            label="HTTP Status"
            value={
              website.httpStatus ? (
                <span
                  className={cn(
                    "font-mono text-sm",
                    website.httpStatus < 400 ? "text-emerald-400" : "text-rose-400"
                  )}
                >
                  {website.httpStatus}
                </span>
              ) : (
                <span className="text-zinc-600">—</span>
              )
            }
          />
          <StatRow
            label="Response Time"
            value={
              <span className="font-mono text-sm text-zinc-200">
                {formatResponseTime(website.responseTime)}
              </span>
            }
          />
          <StatRow label="Last Checked" value={formatRelativeTime(website.lastCheckedAt)} />
          <StatRow label="Last Success" value={formatRelativeTime(website.lastSuccessAt)} />
          <StatRow
            label="Consec. Failures"
            value={
              <span
                className={cn(
                  "font-mono text-sm",
                  website.consecutiveFailures > 0 ? "text-rose-400" : "text-zinc-400"
                )}
              >
                {website.consecutiveFailures}
              </span>
            }
          />
          {website.lastError && (
            <StatRow
              label="Last Error"
              value={<span className="text-rose-400 text-xs">{website.lastError}</span>}
            />
          )}
          <StatRow
            label="24h Uptime"
            value={
              <span
                className={cn(
                  "font-mono text-sm",
                  (website.uptime24h ?? 0) >= 99.9
                    ? "text-emerald-400"
                    : (website.uptime24h ?? 0) >= 99
                    ? "text-amber-400"
                    : "text-rose-400"
                )}
              >
                {formatUptime(website.uptime24h)}
              </span>
            }
          />
          <StatRow
            label="30d Uptime"
            value={
              <span
                className={cn(
                  "font-mono text-sm",
                  (website.uptime30d ?? 0) >= 99.9
                    ? "text-emerald-400"
                    : (website.uptime30d ?? 0) >= 99
                    ? "text-amber-400"
                    : "text-rose-400"
                )}
              >
                {formatUptime(website.uptime30d)}
              </span>
            }
          />
          <StatRow
            label="90d Uptime"
            value={
              <span
                className={cn(
                  "font-mono text-sm",
                  (website.uptime90d ?? 0) >= 99.9
                    ? "text-emerald-400"
                    : (website.uptime90d ?? 0) >= 99
                    ? "text-amber-400"
                    : "text-rose-400"
                )}
              >
                {formatUptime(website.uptime90d)}
              </span>
            }
          />
        </Card>

        {/* Configuration */}
        <Card title="Configuration">
          <StatRow label="Source" value={getSourceLabel(website.source)} />
          <StatRow label="Provider" value={getProviderLabel(website.provider)} />
          <StatRow
            label="Environment"
            value={<span className="capitalize">{website.environment}</span>}
          />
          <StatRow
            label="Check Interval"
            value={
              website.checkInterval < 60
                ? `${website.checkInterval}s`
                : `${website.checkInterval / 60}m`
            }
          />
          <StatRow label="Timeout" value={`${website.timeout}s`} />
          <StatRow
            label="Notif. Group"
            value={website.notificationGroupId ?? "None"}
          />
          {website.tags.length > 0 && (
            <div className="pt-2">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                {website.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* SSL */}
        {website.ssl && (
          <Card title="SSL Certificate">
            <StatRow
              label="Valid"
              value={
                <span className={website.ssl.valid ? "text-emerald-400" : "text-rose-400"}>
                  {website.ssl.valid ? "Yes" : "No"}
                </span>
              }
            />
            <StatRow
              label="Grade"
              value={<span className="font-mono text-blue-400">{website.ssl.grade}</span>}
            />
            <StatRow label="Issuer" value={website.ssl.issuer ?? "—"} />
            <StatRow
              label="Days Left"
              value={
                <span
                  className={cn(
                    "font-mono text-sm",
                    (website.ssl.daysRemaining ?? 99) <= 7
                      ? "text-rose-400"
                      : (website.ssl.daysRemaining ?? 99) <= 30
                      ? "text-amber-400"
                      : "text-emerald-400"
                  )}
                >
                  {website.ssl.daysRemaining}d
                </span>
              }
            />
            <StatRow label="Expires" value={formatDateTime(website.ssl.expiresAt)} />
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Stub Tab ─────────────────────────────────────────────────────────────────

function StubTab({
  label,
  description,
  icon: Icon,
}: {
  label: string;
  description?: string;
  icon?: React.ElementType;
}) {
  const IconComp = Icon ?? RefreshCw;
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
        <IconComp className="w-6 h-6 text-zinc-500" />
      </div>
      <p className="text-sm font-semibold text-zinc-300">{label}</p>
      {description && (
        <p className="text-xs text-zinc-500 mt-1.5 max-w-xs leading-relaxed">{description}</p>
      )}
    </div>
  );
}

// ─── Check History Tab ────────────────────────────────────────────────────────

function CheckHistoryTab({ websiteId }: { websiteId: string }) {
  const checks = generateCheckHistory(websiteId);
  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Check History
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#27272A]">
              {["Time", "Status", "HTTP", "Response Time", "DNS", "Connect", "TLS", "TTFB", "Region"].map(
                (h) => (
                  <th
                    key={h}
                    className="pb-2 text-left text-[10px] uppercase tracking-wider text-zinc-600 font-semibold pr-4 last:pr-0"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A]">
            {checks.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="py-2.5 pr-4 text-zinc-400 font-mono whitespace-nowrap">
                  {format(parseISO(c.checkedAt), "MMM d HH:mm:ss")}
                </td>
                <td className="py-2.5 pr-4">
                  <StatusBadge status={c.status} size="sm" />
                </td>
                <td className="py-2.5 pr-4">
                  <span
                    className={cn(
                      "font-mono",
                      (c.httpStatus ?? 0) < 400 ? "text-emerald-400" : "text-rose-400"
                    )}
                  >
                    {c.httpStatus ?? "—"}
                  </span>
                </td>
                <td className="py-2.5 pr-4 font-mono text-zinc-300">
                  {formatResponseTime(c.responseTime)}
                </td>
                <td className="py-2.5 pr-4 font-mono text-zinc-500">{c.dnsTime}ms</td>
                <td className="py-2.5 pr-4 font-mono text-zinc-500">{c.connectTime}ms</td>
                <td className="py-2.5 pr-4 font-mono text-zinc-500">{c.tlsTime}ms</td>
                <td className="py-2.5 pr-4 font-mono text-zinc-500">{c.ttfbTime}ms</td>
                <td className="py-2.5 text-zinc-500">{c.region}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── Incidents Tab ────────────────────────────────────────────────────────────

function IncidentsTab({ website }: { website: Website }) {
  const incidents = MOCK_INCIDENTS.filter((i) => i.websiteId === website.id);

  if (incidents.length === 0) {
    return (
      <StubTab
        icon={AlertCircle}
        label="No incidents recorded"
        description="Incidents will appear here when monitoring detects consecutive failures that exceed the failure threshold."
      />
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Incidents ({incidents.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#27272A]">
              {["Status", "Started", "Duration", "Error", "Failed Checks", "Actions"].map((h) => (
                <th
                  key={h}
                  className="pb-2 text-left text-[10px] uppercase tracking-wider text-zinc-600 font-semibold pr-4 last:pr-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A]">
            {incidents.map((inc) => (
              <tr key={inc.id} className="hover:bg-zinc-800/30 transition-colors">
                <td className="py-3 pr-4">
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize",
                      getIncidentStatusColor(inc.status)
                    )}
                  >
                    {inc.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-zinc-400 whitespace-nowrap">
                  {formatDistanceToNow(parseISO(inc.startedAt), { addSuffix: true })}
                </td>
                <td className="py-3 pr-4 font-mono text-zinc-300">
                  {inc.duration ? formatDuration(inc.duration) : <span className="text-amber-400">Ongoing</span>}
                </td>
                <td className="py-3 pr-4 text-rose-400 max-w-[200px] truncate">
                  {inc.error ?? "—"}
                </td>
                <td className="py-3 pr-4 font-mono text-zinc-300 text-center">
                  {inc.failedChecks}
                </td>
                <td className="py-3">
                  <Link
                    href={`/incidents/${inc.id}`}
                    className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── SSL Tab ──────────────────────────────────────────────────────────────────

function SslTab({ website }: { website: Website }) {
  const sslDaysColor =
    (website.ssl?.daysRemaining ?? 99) <= 7
      ? "text-rose-400"
      : (website.ssl?.daysRemaining ?? 99) <= 30
      ? "text-amber-400"
      : "text-emerald-400";

  const sslStatus = !website.ssl
    ? "Unknown"
    : !website.ssl.valid
    ? "Invalid"
    : (website.ssl.daysRemaining ?? 99) <= 30
    ? "Expiring"
    : "Valid";

  const sslStatusColor =
    sslStatus === "Valid"
      ? "text-emerald-400"
      : sslStatus === "Expiring"
      ? "text-amber-400"
      : "text-rose-400";

  const gradeColors: Record<string, string> = {
    "A+": "text-emerald-400",
    A: "text-emerald-400",
    B: "text-amber-400",
    C: "text-amber-500",
    F: "text-rose-400",
    unknown: "text-zinc-500",
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* SSL Certificate Card */}
      <div className="col-span-12 lg:col-span-6">
        {website.ssl ? (
          <Card title="SSL Certificate">
            <StatRow
              label="Status"
              value={
                <span className={cn("font-semibold", sslStatusColor)}>{sslStatus}</span>
              }
            />
            <StatRow
              label="Grade"
              value={
                <span className={cn("font-mono text-base font-bold", gradeColors[website.ssl.grade] ?? "text-zinc-300")}>
                  {website.ssl.grade}
                </span>
              }
            />
            <StatRow
              label="Expires In"
              value={
                <span className={cn("font-mono font-semibold", sslDaysColor)}>
                  {website.ssl.daysRemaining} days
                </span>
              }
            />
            <StatRow
              label="Expiry Date"
              value={
                <span className="font-mono text-zinc-300">{formatDateTime(website.ssl.expiresAt)}</span>
              }
            />
            <StatRow label="Issuer" value={website.ssl.issuer ?? "—"} />
            <StatRow label="Warning Threshold" value={`${website.ssl.warningThreshold} days`} />
          </Card>
        ) : (
          <Card title="SSL Certificate">
            <StubTab
              icon={Globe}
              label="No SSL data"
              description="SSL certificate information is not available for this website."
            />
          </Card>
        )}
      </div>

      {/* Domain Info Card */}
      <div className="col-span-12 lg:col-span-6">
        <Card title="Domain Info">
          <StatRow
            label="Domain"
            value={<span className="font-mono text-zinc-200">{website.domain}</span>}
          />
          <StatRow
            label="URL"
            value={
              <a
                href={website.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
              >
                {website.url}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            }
          />
          <StatRow label="Provider" value={getProviderLabel(website.provider)} />
          <StatRow
            label="Environment"
            value={
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize",
                website.environment === "production"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : website.environment === "staging"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              )}>
                {website.environment}
              </span>
            }
          />
        </Card>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WebsiteDetail({ websiteId }: { websiteId: string }) {
  const router = useRouter();
  const [website, setWebsite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  useEffect(() => {
    websiteService.getById(websiteId).then((w) => {
      setWebsite(w);
      setLoading(false);
    });
  }, [websiteId]);

  async function handleRunCheck() {
    const t = toast.loading("Running check...");
    try {
      await websiteService.runCheck(websiteId);
      toast.dismiss(t);
      toast.success("Check completed");
    } catch {
      toast.dismiss(t);
      toast.error("Check failed");
    }
  }

  async function handlePauseResume() {
    if (!website) return;
    try {
      if (website.monitoringState === "paused") {
        const updated = await websiteService.resume(websiteId);
        setWebsite(updated);
        toast.success("Monitoring resumed");
      } else {
        const updated = await websiteService.pause(websiteId);
        setWebsite(updated);
        toast.success("Monitoring paused");
      }
    } catch {
      toast.error("Action failed");
    }
  }

  async function handleDelete() {
    if (!website) return;
    if (!confirm(`Delete "${website.name}"? This cannot be undone.`)) return;
    try {
      await websiteService.delete(websiteId);
      toast.success("Website deleted");
      router.push("/websites");
    } catch {
      toast.error("Failed to delete website");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-8 py-5 border-b border-[#27272A]">
          <Skeleton className="h-6 w-48 bg-zinc-800 mb-2" />
          <Skeleton className="h-4 w-64 bg-zinc-800" />
        </div>
        <div className="flex-1 p-8 space-y-6">
          <Skeleton className="h-10 w-full bg-zinc-800 rounded-2xl" />
          <Skeleton className="h-64 w-full bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!website) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <p className="text-zinc-400 text-sm">Website not found</p>
        <Link href="/websites" className="text-blue-400 hover:text-blue-300 text-sm mt-2">
          Back to Websites
        </Link>
      </div>
    );
  }

  const sslDaysColor =
    (website.ssl?.daysRemaining ?? 99) <= 7
      ? "text-rose-400"
      : (website.ssl?.daysRemaining ?? 99) <= 30
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-[#27272A] bg-[#09090B]">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <Link
              href="/websites"
              className="mt-1 text-zinc-500 hover:text-zinc-100 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1
                  className="text-xl font-semibold text-zinc-50"
                  style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}
                >
                  {website.name}
                </h1>
                <StatusBadge status={website.status} size="md" />
              </div>
              <a
                href={website.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-1 text-sm text-zinc-400 hover:text-zinc-200 transition-colors font-mono"
              >
                {website.url}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunCheck}
              className="border-[#27272A] text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Run Check
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[#27272A] text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 gap-2"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePauseResume}
              className="border-[#27272A] text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 gap-2"
            >
              {website.monitoringState === "paused" ? (
                <>
                  <Play className="w-3.5 h-3.5" /> Resume
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause
                </>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-[#27272A] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 w-8 h-8"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#27272A] border-[#3F3F46]">
                <DropdownMenuItem className="text-zinc-100 hover:bg-zinc-700 cursor-pointer gap-2">
                  <Wrench className="w-3.5 h-3.5" /> Enter Maintenance Mode
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setActiveTab("incidents")}
                  className="text-zinc-100 hover:bg-zinc-700 cursor-pointer gap-2"
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> View Incidents
                </DropdownMenuItem>
                <DropdownMenuItem className="text-zinc-100 hover:bg-zinc-700 cursor-pointer gap-2">
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#3F3F46]" />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-rose-400 hover:bg-rose-500/10 cursor-pointer gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center flex-wrap gap-2">
          <MetricPill
            label="HTTP"
            value={website.httpStatus ? String(website.httpStatus) : "—"}
            color={
              !website.httpStatus
                ? "text-zinc-500"
                : website.httpStatus < 400
                ? "text-emerald-400"
                : "text-rose-400"
            }
          />
          <MetricPill
            label="Response"
            value={formatResponseTime(website.responseTime)}
            color={
              !website.responseTime
                ? "text-zinc-500"
                : website.responseTime > 2000
                ? "text-amber-400"
                : "text-zinc-200"
            }
          />
          <MetricPill
            label="30d Uptime"
            value={formatUptime(website.uptime30d)}
            color={
              !website.uptime30d
                ? "text-zinc-500"
                : website.uptime30d >= 99.9
                ? "text-emerald-400"
                : website.uptime30d >= 99
                ? "text-amber-400"
                : "text-rose-400"
            }
          />
          {website.ssl && (
            <MetricPill
              label="SSL"
              value={`${website.ssl.daysRemaining}d`}
              color={sslDaysColor}
            />
          )}
          <MetricPill
            label="Checked"
            value={formatRelativeTime(website.lastCheckedAt)}
            color="text-zinc-400"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#27272A] bg-[#09090B] px-8">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === "overview" && <OverviewTab website={website} />}
        {activeTab === "history" && <CheckHistoryTab websiteId={website.id} />}
        {activeTab === "incidents" && <IncidentsTab website={website} />}
        {activeTab === "performance" && (
          <StubTab
            icon={TrendingUp}
            label="Performance Analytics"
            description="Response time analytics, percentile breakdowns, and historical performance trends will appear here once data is collected."
          />
        )}
        {activeTab === "ssl" && <SslTab website={website} />}
        {activeTab === "alerts" && (
          <StubTab
            icon={Bell}
            label="Alert History"
            description="A log of all alerts sent for this website — Slack, email, and escalation notifications — will appear here."
          />
        )}
        {activeTab === "settings" && (
          <StubTab
            icon={Settings}
            label="Website Settings"
            description="Configure monitoring intervals, failure thresholds, notification groups, and advanced check options."
          />
        )}
        {activeTab === "activity" && (
          <StubTab
            icon={History}
            label="Activity Log"
            description="A complete audit trail of changes made to this website — edits, pauses, deletions, and configuration updates."
          />
        )}
      </div>
    </div>
  );
}
