import { createClient } from "@/lib/supabase/client";
import type {
  Website,
  WebsiteFilters,
  PaginatedResult,
  AddWebsiteFormData,
} from "@/lib/types";

function mapRow(row: Record<string, unknown>): Website {
  return {
    id:                   row.id as string,
    name:                 row.name as string,
    url:                  row.url as string,
    domain:               row.domain as string,
    client:               (row.client as string | null) ?? null,
    environment:          (row.environment as Website["environment"]) ?? "production",
    source:               (row.source as Website["source"]) ?? "manual",
    provider:             (row.provider as Website["provider"]) ?? "unknown",
    tags:                 (row.tags as string[]) ?? [],
    internalNotes:        (row.internal_notes as string | null) ?? null,
    status:               (row.status as Website["status"]) ?? "pending",
    monitoringState:      (row.monitoring_state as Website["monitoringState"]) ?? "enabled",
    httpStatus:           (row.http_status as number | null) ?? null,
    responseTime:         (row.response_time as number | null) ?? null,
    lastCheckedAt:        (row.last_checked_at as string | null) ?? null,
    lastSuccessAt:        (row.last_success_at as string | null) ?? null,
    lastFailureAt:        (row.last_failure_at as string | null) ?? null,
    consecutiveFailures:  (row.consecutive_failures as number) ?? 0,
    lastError:            (row.last_error as string | null) ?? null,
    uptime24h:            (row.uptime_24h as number | null) ?? null,
    uptime30d:            (row.uptime_30d as number | null) ?? null,
    uptime90d:            (row.uptime_90d as number | null) ?? null,
    ssl:                  (row.ssl as Website["ssl"]) ?? null,
    hasActiveIncident:    (row.has_active_incident as boolean) ?? false,
    activeIncidentId:     (row.active_incident_id as string | null) ?? null,
    checkInterval:        (row.check_interval as number) ?? 120,
    timeout:              (row.timeout as number) ?? 30,
    failureThreshold:     (row.failure_threshold as number) ?? 3,
    recoveryThreshold:    (row.recovery_threshold as number) ?? 2,
    expectedHttpStatus:   (row.expected_http_status as number) ?? 200,
    followRedirects:      (row.follow_redirects as boolean) ?? true,
    httpMethod:           (row.http_method as Website["httpMethod"]) ?? "GET",
    headers:              (row.headers as Record<string, string>) ?? {},
    contentKeyword:       (row.content_keyword as string | null) ?? null,
    sslMonitoring:        (row.ssl_monitoring as boolean) ?? true,
    sslExpirationWarning: (row.ssl_expiration_warning as number) ?? 30,
    notificationGroupId:  (row.notification_group_id as string | null) ?? null,
    maintenanceWindowId:  (row.maintenance_window_id as string | null) ?? null,
    createdAt:            row.created_at as string,
    updatedAt:            row.updated_at as string,
  };
}

export const websiteService = {
  async list(filters: WebsiteFilters = {}): Promise<PaginatedResult<Website>> {
    const db = createClient();
    const page    = filters.page ?? 1;
    const perPage = filters.perPage ?? 50;
    const from    = (page - 1) * perPage;

    let query = db.from("websites").select("*", { count: "exact" });

    if (filters.search) query = query.ilike("name", `%${filters.search}%`);
    if (filters.status?.length)          query = query.in("status", filters.status);
    if (filters.source?.length)          query = query.in("source", filters.source);
    if (filters.provider?.length)        query = query.in("provider", filters.provider);
    if (filters.monitoringState?.length) query = query.in("monitoring_state", filters.monitoringState);
    if (filters.incidentState === "active") query = query.eq("has_active_incident", true);
    if (filters.incidentState === "none")   query = query.eq("has_active_incident", false);

    const colMap: Record<string, string> = {
      name: "name", status: "status",
      lastCheckedAt: "last_checked_at", responseTime: "response_time",
      uptime30d: "uptime_30d", createdAt: "created_at",
    };
    const sortBy  = colMap[filters.sortBy ?? "createdAt"] ?? "created_at";
    const ascending = filters.sortDir === "asc";

    const { data, count, error } = await query
      .order(sortBy, { ascending })
      .range(from, from + perPage - 1);

    if (error) throw new Error(error.message);

    return {
      data:       (data ?? []).map(mapRow),
      total:      count ?? 0,
      page,
      perPage,
      totalPages: Math.ceil((count ?? 0) / perPage),
    };
  },

  async getById(id: string): Promise<Website | null> {
    const db = createClient();
    const { data, error } = await db.from("websites").select("*").eq("id", id).single();
    if (error) return null;
    return mapRow(data);
  },

  async create(form: (Partial<AddWebsiteFormData> & { url: string; name: string }) | Partial<Website>): Promise<Website> {
    const res = await fetch("/api/websites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Failed to create website");
    }
    return mapRow(await res.json());
  },

  async update(id: string, updates: Partial<Website>): Promise<Website> {
    const db = createClient();
    const payload: Record<string, unknown> = {};
    if (updates.name              !== undefined) payload.name = updates.name;
    if (updates.status            !== undefined) payload.status = updates.status;
    if (updates.monitoringState   !== undefined) payload.monitoring_state = updates.monitoringState;
    if (updates.tags              !== undefined) payload.tags = updates.tags;
    if (updates.internalNotes     !== undefined) payload.internal_notes = updates.internalNotes;

    const { data, error } = await db
      .from("websites").update(payload).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  },

  async delete(id: string): Promise<void> {
    const db = createClient();
    const { data: site } = await db.from("websites").select("domain").eq("id", id).single();
    // Record the exclusion *before* removing the row. If this write fails,
    // we abort rather than delete the site and silently lose the guarantee
    // that sync won't bring it right back on the next hourly run.
    if (site?.domain) {
      const { error: excludeError } = await db
        .from("excluded_domains")
        .upsert({ domain: site.domain, reason: "manual delete" });
      if (excludeError) throw new Error(`Failed to exclude domain from re-sync: ${excludeError.message}`);
    }
    const { error } = await db.from("websites").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },

  async pause(id: string): Promise<Website> {
    return this.update(id, { monitoringState: "paused", status: "paused" });
  },

  async resume(id: string): Promise<Website> {
    return this.update(id, { monitoringState: "enabled", status: "pending" });
  },

  async runCheck(_id: string): Promise<{ status: string; message: string }> {
    // Worker will pick it up on next cycle
    return { status: "success", message: "Queued for next check cycle" };
  },

  async getStats() {
    const db = createClient();
    const { data, error } = await db
      .from("websites")
      .select("status, has_active_incident, monitoring_state, response_time, uptime_30d");
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const withResponseTime = rows.filter((r) => r.response_time !== null);
    const withUptime       = rows.filter((r) => r.uptime_30d !== null);

    return {
      total:           rows.length,
      up:              rows.filter((r) => r.status === "up").length,
      down:            rows.filter((r) => r.status === "down").length,
      degraded:        rows.filter((r) => r.status === "degraded").length,
      paused:          rows.filter((r) => r.monitoring_state === "paused").length,
      pending:         rows.filter((r) => r.status === "pending" || r.status === "never_checked").length,
      maintenance:     rows.filter((r) => r.status === "maintenance").length,
      unknown:         rows.filter((r) => r.status === "unknown").length,
      neverChecked:    rows.filter((r) => r.status === "never_checked").length,
      activeIncidents: rows.filter((r) => r.has_active_incident).length,
      avgResponseTime: withResponseTime.length > 0
        ? Math.round(withResponseTime.reduce((s, r) => s + (r.response_time ?? 0), 0) / withResponseTime.length)
        : 0,
      uptime30d: withUptime.length > 0
        ? parseFloat((withUptime.reduce((s, r) => s + (r.uptime_30d ?? 0), 0) / withUptime.length).toFixed(2))
        : 0,
    };
  },
};
