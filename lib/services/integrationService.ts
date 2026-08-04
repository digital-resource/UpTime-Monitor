import { createClient } from "@/lib/supabase/client";
import type { Integration, SyncRun, SyncLog, FilterParams, PaginatedResult } from "@/lib/types";

function mapIntegration(row: Record<string, unknown>): Integration {
  return {
    id:                 row.id as string,
    name:               row.name as string,
    slug:               row.slug as string,
    type:               (row.type as Integration["type"]) ?? "discovery",
    status:             (row.status as Integration["status"]) ?? "not_configured",
    lastSuccessAt:      (row.last_success_at as string | null) ?? null,
    lastAttemptAt:      (row.last_attempt_at as string | null) ?? null,
    websitesDiscovered: (row.websites_discovered as number | null) ?? null,
    websitesImported:   (row.websites_imported as number | null) ?? null,
    websitesUpdated:    (row.websites_updated as number | null) ?? null,
    websitesSkipped:    (row.websites_skipped as number | null) ?? null,
    lastError:          (row.last_error as string | null) ?? null,
    config:             (row.config as Record<string, unknown>) ?? {},
    createdAt:          row.created_at as string,
    updatedAt:          row.updated_at as string,
  };
}

function mapSyncRun(row: Record<string, unknown>): SyncRun {
  const logs = Array.isArray(row.sync_logs)
    ? (row.sync_logs as Record<string, unknown>[]).map((l): SyncLog => ({
        id:        l.id as string,
        syncRunId: l.sync_run_id as string,
        level:     (l.level as SyncLog["level"]) ?? "info",
        message:   l.message as string,
        timestamp: l.timestamp as string,
        metadata:  (l.metadata as Record<string, unknown>) ?? {},
      }))
    : [];

  return {
    id:              row.id as string,
    integrationId:   row.integration_id as string,
    integrationName: row.integration_name as string,
    provider:        row.provider as string,
    startedAt:       row.started_at as string,
    completedAt:     (row.completed_at as string | null) ?? null,
    duration:        (row.duration as number | null) ?? null,
    trigger:         (row.trigger as SyncRun["trigger"]) ?? "manual",
    result:          (row.result as SyncRun["result"] | null) ?? null,
    added:           (row.added as number) ?? 0,
    updated:         (row.updated as number) ?? 0,
    skipped:         (row.skipped as number) ?? 0,
    failed:          (row.failed as number) ?? 0,
    triggeredBy:     row.triggered_by as string,
    logs,
    createdAt:       row.created_at as string,
  };
}

export const integrationService = {
  async list(): Promise<Integration[]> {
    const db = createClient();
    const { data, error } = await db.from("integrations").select("*").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapIntegration);
  },

  async getById(id: string): Promise<Integration | null> {
    const db = createClient();
    const { data, error } = await db.from("integrations").select("*").eq("id", id).single();
    if (error) return null;
    return mapIntegration(data);
  },

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    const db = createClient();
    const { data } = await db.from("integrations").select("status").eq("id", id).single();
    const ok = data?.status === "connected";
    return { success: ok, message: ok ? "Connection successful" : "Not connected" };
  },

  async syncNow(id: string): Promise<SyncRun> {
    const db = createClient();
    const { data: integration } = await db.from("integrations").select("slug, name").eq("id", id).single();

    const res = await fetch("/api/sync/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: integration?.slug }),
    });
    const json = await res.json();

    // Return a partial run — will be updated by worker
    return {
      id:              json.syncRunId ?? `sync_${Date.now()}`,
      integrationId:   id,
      integrationName: integration?.name ?? "Unknown",
      provider:        integration?.slug ?? "unknown",
      startedAt:       new Date().toISOString(),
      completedAt:     null,
      duration:        null,
      trigger:         "manual",
      result:          null,
      added: 0, updated: 0, skipped: 0, failed: 0,
      triggeredBy:     "Admin",
      logs:            [],
      createdAt:       new Date().toISOString(),
    };
  },

  async disconnect(id: string): Promise<void> {
    const db = createClient();
    await db.from("integrations").update({ status: "not_configured", config: {} }).eq("id", id);
  },

  async listSyncRuns(integrationId: string, filters: FilterParams = {}): Promise<PaginatedResult<SyncRun>> {
    const db = createClient();
    const page    = filters.page ?? 1;
    const perPage = filters.perPage ?? 25;
    const from    = (page - 1) * perPage;

    let query = db
      .from("sync_runs")
      .select("*, sync_logs(*)", { count: "exact" });

    if (integrationId !== "all") {
      query = query.eq("integration_id", integrationId);
    }

    const { data, count, error } = await query
      .order("started_at", { ascending: false })
      .range(from, from + perPage - 1);

    if (error) throw new Error(error.message);
    return {
      data:       (data ?? []).map(mapSyncRun),
      total:      count ?? 0,
      page,
      perPage,
      totalPages: Math.ceil((count ?? 0) / perPage),
    };
  },

  async getSyncRun(id: string): Promise<SyncRun | null> {
    const db = createClient();
    const { data, error } = await db
      .from("sync_runs").select("*, sync_logs(*)").eq("id", id).single();
    if (error) return null;
    return mapSyncRun(data);
  },
};
