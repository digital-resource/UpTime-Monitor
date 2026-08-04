import { createClient } from "@/lib/supabase/client";
import type { Incident, IncidentEvent, FilterParams, PaginatedResult } from "@/lib/types";

function mapEvent(row: Record<string, unknown>): IncidentEvent {
  return {
    id:         row.id as string,
    incidentId: row.incident_id as string,
    type:       row.type as string,
    message:    row.message as string,
    timestamp:  row.timestamp as string,
    metadata:   (row.metadata as Record<string, unknown>) ?? {},
  };
}

function mapRow(row: Record<string, unknown>): Incident {
  const events = Array.isArray(row.incident_events)
    ? (row.incident_events as Record<string, unknown>[]).map(mapEvent)
    : [];
  return {
    id:                 row.id as string,
    websiteId:          row.website_id as string,
    websiteName:        row.website_name as string,
    websiteUrl:         row.website_url as string,
    client:             (row.client as string | null) ?? null,
    status:             (row.status as Incident["status"]) ?? "open",
    startedAt:          row.started_at as string,
    acknowledgedAt:     (row.acknowledged_at as string | null) ?? null,
    resolvedAt:         (row.resolved_at as string | null) ?? null,
    duration:           (row.duration as number | null) ?? null,
    error:              (row.error as string | null) ?? null,
    failedChecks:       (row.failed_checks as number) ?? 0,
    slackAlertSent:     (row.slack_alert_sent as boolean) ?? false,
    emailAlertSent:     (row.email_alert_sent as boolean) ?? false,
    recoveryAlertSent:  (row.recovery_alert_sent as boolean) ?? false,
    assignedTo:         (row.assigned_to as string | null) ?? null,
    internalNotes:      (row.internal_notes as string) ?? "",
    timeline:           events,
    createdAt:          row.created_at as string,
    updatedAt:          row.updated_at as string,
  };
}

export const incidentService = {
  async list(filters: FilterParams & { status?: string[]; websiteId?: string; dateFrom?: string } = {}): Promise<PaginatedResult<Incident>> {
    const db = createClient();
    const page    = filters.page ?? 1;
    const perPage = filters.perPage ?? 25;
    const from    = (page - 1) * perPage;

    let query = db
      .from("incidents")
      .select("*, incident_events(*)", { count: "exact" });

    if (filters.status?.length) query = query.in("status", filters.status);
    if (filters.websiteId)      query = query.eq("website_id", filters.websiteId);
    if (filters.search)         query = query.ilike("website_name", `%${filters.search}%`);
    if (filters.dateFrom)       query = query.gte("started_at", filters.dateFrom);

    const { data, count, error } = await query
      .order("started_at", { ascending: false })
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

  async getById(id: string): Promise<Incident | null> {
    const db = createClient();
    const { data, error } = await db
      .from("incidents")
      .select("*, incident_events(*)")
      .eq("id", id)
      .single();
    if (error) return null;
    return mapRow(data);
  },

  async getActive(): Promise<Incident[]> {
    const db = createClient();
    const { data, error } = await db
      .from("incidents")
      .select("*, incident_events(*)")
      .eq("status", "open")
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapRow);
  },

  async acknowledge(id: string): Promise<Incident> {
    const db = createClient();
    await db.from("incidents").update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
    }).eq("id", id);

    await db.from("incident_events").insert({
      incident_id: id,
      type:    "acknowledged",
      message: "Incident acknowledged by team member",
    });

    const { data, error } = await db
      .from("incidents").select("*, incident_events(*)").eq("id", id).single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  },

  async resolve(id: string): Promise<Incident> {
    const db = createClient();
    const { data: existing } = await db
      .from("incidents").select("started_at").eq("id", id).single();

    const resolvedAt = new Date().toISOString();
    const duration = existing
      ? Math.round((Date.now() - new Date(existing.started_at).getTime()) / 1000)
      : null;

    await db.from("incidents").update({
      status: "resolved", resolved_at: resolvedAt, duration,
    }).eq("id", id);

    await db.from("incident_events").insert({
      incident_id: id,
      type:    "resolved",
      message: "Incident manually resolved by team member",
      timestamp: resolvedAt,
    });

    const { data, error } = await db
      .from("incidents").select("*, incident_events(*)").eq("id", id).single();
    if (error) throw new Error(error.message);
    return mapRow(data);
  },

  async addNote(incidentId: string, noteText: string): Promise<void> {
    const db = createClient();
    const { error } = await db.from("incident_events").insert({
      incident_id: incidentId,
      type:        "note",
      message:     noteText,
      timestamp:   new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  },
};
