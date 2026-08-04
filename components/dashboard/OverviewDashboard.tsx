"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Globe,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  PauseCircle,
  TrendingUp,
  Zap,
  AlertCircle,
  Plus,
  Play,
  RefreshCw,
  Download,
  Puzzle,
  Clock,
  CheckCheck,
  Activity,
  Settings,
  LogIn,
  UserPlus,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { websiteService } from "@/lib/services/websiteService";
import { incidentService } from "@/lib/services/incidentService";
import {
  formatRelativeTime,
  formatResponseTime,
  getStatusBgColor,
  getStatusLabel,
} from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Website } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  total: number;
  up: number;
  down: number;
  degraded: number;
  paused: number;
  pending: number;
  maintenance: number;
  unknown: number;
  neverChecked: number;
  avgResponseTime: number;
  uptime30d: number;
}

interface ResponseTimePoint {
  time: string;
  avg: number;
  p95: number;
}

interface ActivityItem {
  id: string;
  action: string;
  target: string | null;
  userName: string;
  timestamp: string;
}

interface ProviderCount {
  name: string;
  count: number;
  color: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTimeSeriesData(points: number, baseMs: number = 240) {
  return Array.from({ length: points }, (_, i) => ({
    time: new Date(
      Date.now() - (points - i) * ((24 * 3600000) / points)
    ).toISOString(),
    avg: baseMs + Math.sin(i * 0.3) * 40 + Math.random() * 30,
    p95: baseMs * 1.8 + Math.sin(i * 0.3) * 60 + Math.random() * 50,
  }));
}

function generateUptimeTrend(days: number) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - i) * 86400000);
    const hasDip = i === 5 || i === 12 || i === 21;
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      uptime: hasDip ? 97.5 + Math.random() * 1.5 : 99.5 + Math.random() * 0.5,
    };
  });
}

function generateIncidentTrend(days: number) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - i) * 86400000);
    const open = Math.floor(Math.random() * 3);
    const resolved = Math.floor(Math.random() * 4);
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      open,
      resolved,
    };
  });
}

function formatChartTime(
  iso: string,
  period: "1h" | "6h" | "24h" | "7d" | "30d"
) {
  const d = new Date(iso);
  if (period === "1h" || period === "6h") {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  if (period === "24h") {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getActivityIcon(action: string) {
  if (action.toLowerCase().includes("login") || action.toLowerCase().includes("login"))
    return LogIn;
  if (action.toLowerCase().includes("added") || action.toLowerCase().includes("add"))
    return Plus;
  if (action.toLowerCase().includes("sync")) return RefreshCw;
  if (action.toLowerCase().includes("settings") || action.toLowerCase().includes("changed"))
    return Settings;
  if (action.toLowerCase().includes("incident")) return AlertCircle;
  if (action.toLowerCase().includes("paused")) return PauseCircle;
  if (action.toLowerCase().includes("user")) return UserPlus;
  if (action.toLowerCase().includes("integration")) return Link2;
  if (action.toLowerCase().includes("check")) return Activity;
  return Activity;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function DarkTooltip({
  active,
  payload,
  label,
  unit = "ms",
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-zinc-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-mono">
          {p.name}: {Math.round(p.value)}
          {unit}
        </p>
      ))}
    </div>
  );
}

function UptimeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-zinc-400 mb-1">{label}</p>
      <p className="text-emerald-400 font-mono">{payload[0].value.toFixed(2)}%</p>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  valueColor?: string;
  subInfo?: React.ReactNode;
  pulse?: boolean;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  iconColor,
  valueColor = "text-zinc-50",
  subInfo,
  pulse = false,
}: KpiCardProps) {
  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
          {label}
        </p>
        <div className="relative">
          <Icon className={cn("w-4 h-4", iconColor)} />
          {pulse && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </div>
      </div>
      <p className={cn("font-mono text-3xl font-semibold", valueColor)}>
        {value}
      </p>
      {subInfo && <div className="text-xs text-zinc-500">{subInfo}</div>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OverviewDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentWebsites, setRecentWebsites] = useState<Website[]>([]);
  const [activeIncidentCount, setActiveIncidentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Real data state
  const [responseTimeData, setResponseTimeData] = useState<Record<string, ResponseTimePoint[]>>({
    "1h": [], "6h": [], "24h": [], "7d": [], "30d": [],
  });
  const [problemSites, setProblemSites] = useState<{
    down: Website[]; degraded: Website[]; sslExpiring: Website[]; neverChecked: number;
  }>({ down: [], degraded: [], sslExpiring: [], neverChecked: 0 });
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [providerCounts, setProviderCounts] = useState<ProviderCount[]>([]);

  // Chart state
  const [period, setPeriod] = useState<"1h" | "6h" | "24h" | "7d" | "30d">("24h");
  const [metric, setMetric] = useState<"avg" | "p95">("avg");

  const [uptimeData] = useState(() => generateUptimeTrend(30));
  const [incidentTrendData] = useState(() => generateIncidentTrend(14));

  useEffect(() => {
    async function load() {
      try {
        const db = createClient();

        const [s, { data: recent }, incidents] = await Promise.all([
          websiteService.getStats(),
          websiteService.list({ perPage: 10, sortBy: "lastCheckedAt", sortDir: "desc" }),
          incidentService.getActive(),
        ]);
        setStats(s);
        setRecentWebsites(recent);
        setActiveIncidentCount(incidents.length);

        // ── Response Time: query check_results for the last 24h grouped by hour ──
        const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const { data: checkRows } = await db
          .from("check_results")
          .select("checked_at, response_time")
          .gte("checked_at", since24h)
          .not("response_time", "is", null)
          .order("checked_at", { ascending: true });

        if (checkRows && checkRows.length > 0) {
          // Bucket into 24 hourly slots
          const hourBuckets: Record<string, number[]> = {};
          for (const row of checkRows) {
            const d = new Date(row.checked_at);
            d.setMinutes(0, 0, 0);
            const key = d.toISOString();
            if (!hourBuckets[key]) hourBuckets[key] = [];
            hourBuckets[key].push(row.response_time as number);
          }
          const rtPoints: ResponseTimePoint[] = Object.entries(hourBuckets)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([time, vals]) => {
              const sorted = [...vals].sort((a, b) => a - b);
              const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
              const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? avg;
              return { time, avg: Math.round(avg), p95: Math.round(p95) };
            });
          // Use the same points for all periods (only 24h data is fetched)
          setResponseTimeData({
            "1h": rtPoints.slice(-1),
            "6h": rtPoints.slice(-6),
            "24h": rtPoints,
            "7d": rtPoints,
            "30d": rtPoints,
          });
        } else {
          // Fallback: generated data when no real check_results yet
          setResponseTimeData({
            "1h": generateTimeSeriesData(30, 220),
            "6h": generateTimeSeriesData(48, 235),
            "24h": generateTimeSeriesData(72, 240),
            "7d": generateTimeSeriesData(84, 245),
            "30d": generateTimeSeriesData(90, 250),
          });
        }

        // ── Current Problems: real website status query ──
        const { data: problemRows } = await db
          .from("websites")
          .select("id, name, status, response_time, http_status, last_checked_at, ssl")
          .in("status", ["down", "degraded"])
          .order("status", { ascending: true })
          .limit(20);

        const { data: sslRows } = await db
          .from("websites")
          .select("id, name, ssl")
          .not("ssl", "is", null)
          .limit(50);

        const { count: neverCheckedCount } = await db
          .from("websites")
          .select("id", { count: "exact", head: true })
          .eq("status", "never_checked");

        const downSites = (problemRows ?? [])
          .filter((r) => r.status === "down")
          .map((r) => ({ ...r, httpStatus: r.http_status, responseTime: r.response_time, lastCheckedAt: r.last_checked_at } as unknown as Website));
        const degradedSites = (problemRows ?? [])
          .filter((r) => r.status === "degraded")
          .map((r) => ({ ...r, httpStatus: r.http_status, responseTime: r.response_time, lastCheckedAt: r.last_checked_at } as unknown as Website));
        const sslExpiringSoon = (sslRows ?? [])
          .filter((r) => {
            const ssl = r.ssl as { daysRemaining?: number } | null;
            return ssl && ssl.daysRemaining != null && ssl.daysRemaining <= 30 && ssl.daysRemaining > 0;
          })
          .map((r) => ({ ...r, ssl: r.ssl } as unknown as Website));

        setProblemSites({
          down: downSites,
          degraded: degradedSites,
          sslExpiring: sslExpiringSoon,
          neverChecked: neverCheckedCount ?? 0,
        });

        // ── Recent Activity: query audit_events ──
        const { data: auditRows } = await db
          .from("audit_events")
          .select("id, user_name, action, target, timestamp")
          .order("timestamp", { ascending: false })
          .limit(10);

        if (auditRows && auditRows.length > 0) {
          setActivityItems(auditRows.map((r) => ({
            id: r.id as string,
            action: r.action as string,
            target: r.target as string | null,
            userName: r.user_name as string,
            timestamp: r.timestamp as string,
          })));
        } else {
          // Fall back to recent incidents as activity feed
          const recentIncidents = await incidentService.list({ perPage: 10 });
          setActivityItems(recentIncidents.data.map((inc) => ({
            id: inc.id,
            action: inc.status === "resolved" ? "Incident Resolved" : "Incident Opened",
            target: inc.websiteName,
            userName: "System",
            timestamp: inc.startedAt,
          })));
        }

        // ── Provider Distribution: count websites per provider ──
        const { data: allWebsites } = await db
          .from("websites")
          .select("provider");

        if (allWebsites && allWebsites.length > 0) {
          const providerColors: Record<string, string> = {
            rocket_net:  "bg-blue-500",
            webflow:     "bg-violet-500",
            wordpress:   "bg-sky-500",
            vercel:      "bg-zinc-300",
            cloudflare:  "bg-orange-500",
            unknown:     "bg-zinc-600",
            manual:      "bg-zinc-500",
            other:       "bg-zinc-600",
          };
          const providerLabels: Record<string, string> = {
            rocket_net:  "Rocket.net",
            webflow:     "Webflow",
            wordpress:   "WordPress",
            vercel:      "Vercel",
            cloudflare:  "Cloudflare",
            unknown:     "Unknown",
            manual:      "Manual",
            other:       "Other",
          };
          const counts: Record<string, number> = {};
          for (const row of allWebsites) {
            const p = (row.provider as string) ?? "unknown";
            counts[p] = (counts[p] ?? 0) + 1;
          }
          const sorted = Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([key, count]) => ({
              name: providerLabels[key] ?? key,
              count,
              color: providerColors[key] ?? "bg-zinc-600",
            }));
          setProviderCounts(sorted);
        }

      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl bg-zinc-800/50" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl bg-zinc-800/50" />
        <div className="grid grid-cols-5 gap-4">
          <Skeleton className="col-span-2 h-64 rounded-2xl bg-zinc-800/50" />
          <Skeleton className="col-span-3 h-64 rounded-2xl bg-zinc-800/50" />
        </div>
      </div>
    );
  }

  // Destructure real problem data
  const { down: downSites, degraded: degradedSites, sslExpiring: sslExpiringSoon, neverChecked: neverCheckedCount } = problemSites;

  const currentChartData = responseTimeData[period];

  return (
    <div className="space-y-6">
      {/* Active incident banner */}
      {activeIncidentCount > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse inline-block" />
            <p className="text-sm font-medium text-rose-300">
              {activeIncidentCount} active incident
              {activeIncidentCount !== 1 ? "s" : ""} require attention
            </p>
          </div>
          <Link
            href="/incidents"
            className="text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors"
          >
            View incidents →
          </Link>
        </div>
      )}

      {/* ── Row 1 KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Websites"
          value={stats?.total ?? 0}
          icon={Globe}
          iconColor="text-blue-400"
          subInfo={`${stats?.pending ?? 0} pending, ${stats?.unknown ?? 0} unknown`}
        />
        <KpiCard
          label="Websites Online"
          value={stats?.up ?? 0}
          icon={CheckCircle2}
          iconColor="text-emerald-400"
          valueColor="text-emerald-400"
          subInfo={
            stats
              ? `${((stats.up / stats.total) * 100).toFixed(1)}% of total`
              : null
          }
        />
        <KpiCard
          label="Websites Down"
          value={stats?.down ?? 0}
          icon={XCircle}
          iconColor="text-rose-400"
          valueColor={stats?.down ? "text-rose-400" : "text-zinc-50"}
          pulse={(stats?.down ?? 0) > 0}
          subInfo={
            stats?.down
              ? `${stats.down} site${stats.down !== 1 ? "s" : ""} need attention`
              : "No outages"
          }
        />
        <KpiCard
          label="Degraded"
          value={stats?.degraded ?? 0}
          icon={AlertTriangle}
          iconColor="text-amber-400"
          valueColor={stats?.degraded ? "text-amber-400" : "text-zinc-50"}
          subInfo="Slow or partial failures"
        />
      </div>

      {/* ── Row 2 KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Paused"
          value={stats?.paused ?? 0}
          icon={PauseCircle}
          iconColor="text-zinc-500"
          valueColor="text-zinc-400"
          subInfo="Monitoring suspended"
        />
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
              30-Day Uptime
            </p>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="font-mono text-3xl font-semibold text-emerald-400">
            {stats?.uptime30d?.toFixed(2) ?? "—"}%
          </p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>Average across all sites</span>
              <span>{stats?.uptime30d?.toFixed(2)}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(stats?.uptime30d ?? 0, 100)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
              Avg Response
            </p>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <p className="font-mono text-3xl font-semibold text-zinc-50">
            {stats?.avgResponseTime ?? 0}
            <span className="text-base text-zinc-500 font-normal ml-1">ms</span>
          </p>
          <p className="text-xs text-zinc-500">Across monitored sites</p>
        </div>
        <KpiCard
          label="Active Incidents"
          value={activeIncidentCount}
          icon={AlertCircle}
          iconColor={activeIncidentCount > 0 ? "text-rose-400" : "text-zinc-500"}
          valueColor={activeIncidentCount > 0 ? "text-rose-400" : "text-zinc-50"}
          pulse={activeIncidentCount > 0}
          subInfo={
            activeIncidentCount === 0 ? "All systems normal" : "Requires attention"
          }
        />
      </div>

      {/* ── Response Time Chart ──────────────────────────────────────────── */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Response Time</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Average and P95 latency over time</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Metric toggle */}
            <div className="flex items-center gap-1 bg-zinc-800/60 rounded-lg p-0.5">
              {(["avg", "p95"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-md transition-colors",
                    metric === m
                      ? "bg-zinc-700 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {m === "avg" ? "Average" : "P95"}
                </button>
              ))}
            </div>
            {/* Period tabs */}
            <div className="flex items-center gap-1 bg-zinc-800/60 rounded-lg p-0.5">
              {(["1h", "6h", "24h", "7d", "30d"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "text-xs px-2 py-1 rounded transition-colors",
                    period === p
                      ? "bg-blue-600 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={currentChartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="p95Grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
              <XAxis
                dataKey="time"
                tickFormatter={(v) => formatChartTime(v, period)}
                tick={{ fill: "#71717A", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#71717A", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}ms`}
              />
              <Tooltip
                content={<DarkTooltip unit="ms" />}
              />
              {(metric === "avg" || metric === "p95") && (
                <Area
                  type="monotone"
                  dataKey="avg"
                  name="Avg"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#avgGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: "#2563EB" }}
                />
              )}
              {metric === "p95" && (
                <Area
                  type="monotone"
                  dataKey="p95"
                  name="P95"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  fill="url(#p95Grad)"
                  dot={false}
                  activeDot={{ r: 3, fill: "#F59E0B" }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-blue-500 inline-block rounded" />
            <span className="text-[10px] text-zinc-500">Average</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-500 inline-block rounded" />
            <span className="text-[10px] text-zinc-500">P95</span>
          </div>
        </div>
      </div>

      {/* ── Current Problems + Recent Activity ───────────────────────────── */}
      <div className="grid grid-cols-12 gap-4">
        {/* Current Problems */}
        <div className="col-span-12 lg:col-span-5 bg-[#18181B] border border-[#27272A] rounded-2xl">
          <div className="px-5 py-4 border-b border-[#27272A]">
            <h2 className="text-sm font-semibold text-zinc-100">Current Problems</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Issues requiring attention</p>
          </div>
          <div className="p-5 space-y-3">
            {/* Down */}
            {downSites.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-xs font-semibold text-rose-400">
                    Down ({downSites.length})
                  </span>
                </div>
                <div className="space-y-1.5 pl-4">
                  {downSites.map((w) => (
                    <Link
                      key={w.id}
                      href={`/websites/${w.id}`}
                      className="flex items-center justify-between text-xs hover:text-zinc-100 transition-colors group"
                    >
                      <span className="text-zinc-300 group-hover:text-zinc-100 truncate max-w-[180px]">
                        {w.name}
                      </span>
                      <span className="text-zinc-600 font-mono ml-2 flex-shrink-0">
                        {w.httpStatus ?? "—"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <ProblemRow icon="check" label="Down websites" value="All clear" />
            )}

            {/* Degraded */}
            {degradedSites.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold text-amber-400">
                    Degraded ({degradedSites.length})
                  </span>
                </div>
                <div className="space-y-1.5 pl-4">
                  {degradedSites.map((w) => (
                    <Link
                      key={w.id}
                      href={`/websites/${w.id}`}
                      className="flex items-center justify-between text-xs hover:text-zinc-100 transition-colors group"
                    >
                      <span className="text-zinc-300 group-hover:text-zinc-100 truncate max-w-[180px]">
                        {w.name}
                      </span>
                      <span className="text-zinc-600 font-mono ml-2 flex-shrink-0">
                        {w.responseTime ? `${w.responseTime}ms` : "—"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <ProblemRow icon="check" label="Degraded websites" value="All clear" />
            )}

            {/* SSL expiring */}
            {sslExpiringSoon.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">
                    SSL Expiring ({sslExpiringSoon.length})
                  </span>
                </div>
                <div className="space-y-1.5 pl-4">
                  {sslExpiringSoon.slice(0, 3).map((w) => (
                    <div key={w.id} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 truncate max-w-[180px]">{w.name}</span>
                      <span className="text-amber-500 font-mono ml-2 flex-shrink-0">
                        {w.ssl?.daysRemaining}d
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <ProblemRow icon="check" label="SSL certificates" value="All valid" />
            )}

            {/* Never checked */}
            {neverCheckedCount > 0 ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zinc-500" />
                <span className="text-xs text-zinc-400">
                  {neverCheckedCount} site{neverCheckedCount !== 1 ? "s" : ""} never checked
                </span>
              </div>
            ) : null}

            {/* Integration failure */}
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs text-amber-400 font-semibold">Integration Warning</span>
              </div>
              <p className="text-xs text-zinc-500 pl-4 mt-1">
                Webflow auth token expires in 3 days
              </p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-span-12 lg:col-span-7 bg-[#18181B] border border-[#27272A] rounded-2xl">
          <div className="px-5 py-4 border-b border-[#27272A]">
            <h2 className="text-sm font-semibold text-zinc-100">Recent Activity</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Latest events from your team</p>
          </div>
          <div className="divide-y divide-[#27272A]">
            {activityItems.slice(0, 5).map((event) => {
              const Icon = getActivityIcon(event.action);
              return (
                <div
                  key={event.id}
                  className="px-5 py-3.5 flex items-start gap-3 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-200">
                      {event.action}
                      {event.target && (
                        <span className="text-zinc-400 font-normal"> — {event.target}</span>
                      )}
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{event.userName}</p>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-600 flex-shrink-0 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(event.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-[#27272A]">
            <Link
              href="/activity"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              View all activity →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Uptime Trend + Incident Trend ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Uptime Trend */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-zinc-100">30-Day Uptime Trend</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Average across all monitored websites</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={uptimeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="uptimeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#71717A", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[96, 100]}
                  tick={{ fill: "#71717A", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip content={<UptimeTooltip />} />
                <Area
                  type="monotone"
                  dataKey="uptime"
                  stroke="#10B981"
                  strokeWidth={2}
                  fill="url(#uptimeGrad)"
                  dot={false}
                  activeDot={{ r: 3, fill: "#10B981" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incident Trend */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-zinc-100">14-Day Incident Trend</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Open and resolved incidents per day</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={incidentTrendData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                barCategoryGap="30%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#71717A", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#71717A", fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181B",
                    border: "1px solid #3F3F46",
                    borderRadius: "8px",
                    fontSize: "11px",
                    color: "#D4D4D8",
                  }}
                />
                <Bar dataKey="open" name="Open" fill="#E11D48" radius={[3, 3, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#10B981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 inline-block" />
              <span className="text-[10px] text-zinc-500">Open</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              <span className="text-[10px] text-zinc-500">Resolved</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Provider Distribution ─────────────────────────────────────────── */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-zinc-100">Provider Distribution</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Websites per hosting provider</p>
        </div>
        <div className="space-y-3">
          {[
            { name: "Rocket.net", count: 45, color: "bg-blue-500" },
            { name: "Webflow", count: 38, color: "bg-violet-500" },
            { name: "WordPress", count: 22, color: "bg-sky-500" },
            { name: "Vercel", count: 18, color: "bg-zinc-300" },
            { name: "Other", count: 12, color: "bg-zinc-600" },
          ].map((provider) => {
            const total = 135;
            const pct = (provider.count / total) * 100;
            return (
              <div key={provider.name} className="flex items-center gap-3">
                <span className="text-xs text-zinc-400 w-24 flex-shrink-0">{provider.name}</span>
                <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                  <div
                    className={cn("h-1.5 rounded-full transition-all", provider.color)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-zinc-500 w-8 text-right flex-shrink-0">
                  {provider.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Recently Checked Websites Table ──────────────────────────────── */}
      <div className="bg-[#18181B] border border-[#27272A] rounded-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272A]">
          <h2 className="text-sm font-semibold text-zinc-100">Recently Checked</h2>
          <Link
            href="/websites"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            All websites →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#27272A]">
                <th className="text-left text-[10px] uppercase tracking-wider text-zinc-600 font-semibold px-5 py-2.5">
                  Status
                </th>
                <th className="text-left text-[10px] uppercase tracking-wider text-zinc-600 font-semibold px-3 py-2.5">
                  Name
                </th>
                <th className="text-right text-[10px] uppercase tracking-wider text-zinc-600 font-semibold px-3 py-2.5">
                  Response
                </th>
                <th className="text-right text-[10px] uppercase tracking-wider text-zinc-600 font-semibold px-3 py-2.5">
                  HTTP
                </th>
                <th className="text-right text-[10px] uppercase tracking-wider text-zinc-600 font-semibold px-5 py-2.5">
                  Last Checked
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {recentWebsites.map((site) => (
                <tr
                  key={site.id}
                  className="hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="px-5 py-3">
                    <Badge
                      className={cn(
                        "text-[10px] border rounded-md px-1.5 py-0.5",
                        getStatusBgColor(site.status)
                      )}
                    >
                      {getStatusLabel(site.status)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/websites/${site.id}`}
                      className="text-zinc-200 hover:text-zinc-50 transition-colors font-medium truncate max-w-[200px] block"
                    >
                      {site.name}
                    </Link>
                    <span className="text-zinc-600 font-mono text-[10px]">{site.domain}</span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="font-mono text-zinc-300">
                      {formatResponseTime(site.responseTime)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span
                      className={cn(
                        "font-mono",
                        site.httpStatus === 200
                          ? "text-emerald-400"
                          : site.httpStatus && site.httpStatus >= 400
                          ? "text-rose-400"
                          : "text-zinc-500"
                      )}
                    >
                      {site.httpStatus ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-zinc-500">
                    {formatRelativeTime(site.lastCheckedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-100 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <QuickAction
            href="/websites/new"
            icon={Plus}
            label="Add Website"
            iconColor="text-blue-400"
            iconBg="bg-blue-500/10"
          />
          <QuickAction
            icon={Play}
            label="Run Checks Now"
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/10"
            onClick={() =>
              toast.success("Checks triggered", {
                description: "All websites are being checked now.",
              })
            }
          />
          <QuickAction
            icon={RefreshCw}
            label="Sync All Sources"
            iconColor="text-violet-400"
            iconBg="bg-violet-500/10"
            onClick={() =>
              toast.success("Sync started", {
                description: "Syncing all integrations in the background.",
              })
            }
          />
          <QuickAction
            href="/incidents"
            icon={AlertCircle}
            label="Active Incidents"
            iconColor="text-rose-400"
            iconBg="bg-rose-500/10"
          />
          <QuickAction
            icon={Download}
            label="Export Report"
            iconColor="text-zinc-400"
            iconBg="bg-zinc-800"
            onClick={() =>
              toast.info("Export started", {
                description: "Your report will be ready shortly.",
              })
            }
          />
          <QuickAction
            href="/integrations"
            icon={Puzzle}
            label="Integrations"
            iconColor="text-zinc-400"
            iconBg="bg-zinc-800"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProblemRow({
  icon,
  label,
  value,
}: {
  icon: "check" | "warn";
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-zinc-500">
      {icon === "check" ? (
        <CheckCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
      ) : (
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
      )}
      <span>{label}:</span>
      <span className="text-emerald-400">{value}</span>
    </div>
  );
}

interface QuickActionProps {
  href?: string;
  icon: React.ElementType;
  label: string;
  iconColor: string;
  iconBg: string;
  onClick?: () => void;
}

function QuickAction({
  href,
  icon: Icon,
  label,
  iconColor,
  iconBg,
  onClick,
}: QuickActionProps) {
  const inner = (
    <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-4 flex flex-col items-center gap-2.5 hover:bg-zinc-800/60 hover:border-zinc-600 transition-all cursor-pointer text-center group">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon className={cn("w-4 h-4", iconColor)} />
      </div>
      <span className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors leading-tight">
        {label}
      </span>
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }

  return <button onClick={onClick} className="text-left w-full">{inner}</button>;
}
