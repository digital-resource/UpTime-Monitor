import { createClient } from "@/lib/supabase/client";
import type { Alert, NotificationGroup, PaginatedResult, FilterParams } from "@/lib/types";

function mapAlert(row: Record<string, unknown>): Alert {
  return {
    id:          row.id as string,
    websiteId:   row.website_id as string,
    websiteName: row.website_name as string,
    incidentId:  (row.incident_id as string | null) ?? null,
    type:        (row.type as Alert["type"]) ?? "down",
    channel:     (row.channel as Alert["channel"]) ?? "slack",
    recipient:   row.recipient as string,
    status:      (row.status as Alert["status"]) ?? "queued",
    retryCount:  (row.retry_count as number) ?? 0,
    error:       (row.error as string | null) ?? null,
    sentAt:      (row.sent_at as string | null) ?? null,
    deliveredAt: (row.delivered_at as string | null) ?? null,
    createdAt:   row.created_at as string,
  };
}

function mapGroup(row: Record<string, unknown>): NotificationGroup {
  return {
    id:                     row.id as string,
    name:                   row.name as string,
    slackChannel:           (row.slack_channel as string | null) ?? null,
    emailRecipients:        (row.email_recipients as string[]) ?? [],
    escalationRuleId:       (row.escalation_rule_id as string | null) ?? null,
    quietHoursEnabled:      (row.quiet_hours_enabled as boolean) ?? false,
    quietHoursStart:        (row.quiet_hours_start as string | null) ?? null,
    quietHoursEnd:          (row.quiet_hours_end as string | null) ?? null,
    quietHoursTimezone:     (row.quiet_hours_timezone as string) ?? "UTC",
    maintenanceSuppression: (row.maintenance_suppression as boolean) ?? true,
    websiteCount:           0,
    createdAt:              row.created_at as string,
    updatedAt:              row.updated_at as string,
  };
}

export const alertService = {
  async list(filters: FilterParams & { channel?: string; type?: string; status?: string } = {}): Promise<PaginatedResult<Alert>> {
    const db = createClient();
    const page    = filters.page ?? 1;
    const perPage = filters.perPage ?? 25;
    const from    = (page - 1) * perPage;

    let query = db.from("alerts").select("*", { count: "exact" });
    if (filters.channel) query = query.eq("channel", filters.channel);
    if (filters.type)    query = query.eq("type", filters.type);
    if (filters.status)  query = query.eq("status", filters.status);
    if (filters.search)  query = query.ilike("website_name", `%${filters.search}%`);

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, from + perPage - 1);

    if (error) throw new Error(error.message);

    return {
      data:       (data ?? []).map(mapAlert),
      total:      count ?? 0,
      page,
      perPage,
      totalPages: Math.ceil((count ?? 0) / perPage),
    };
  },

  async retryAlert(id: string): Promise<Alert> {
    const db = createClient();
    const { data, error } = await db
      .from("alerts")
      .update({ status: "queued", retry_count: 0, error: null })
      .eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return mapAlert(data);
  },

  async listNotificationGroups(): Promise<NotificationGroup[]> {
    const db = createClient();
    const { data, error } = await db.from("notification_groups").select("*").order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapGroup);
  },

  async getNotificationGroup(id: string): Promise<NotificationGroup | null> {
    const db = createClient();
    const { data, error } = await db.from("notification_groups").select("*").eq("id", id).single();
    if (error) return null;
    return mapGroup(data);
  },

  async createNotificationGroup(payload: {
    name: string;
    slack_channel: string | null;
    email_recipients: string[];
    quiet_hours_enabled: boolean;
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
    quiet_hours_timezone: string;
    maintenance_suppression: boolean;
  }): Promise<NotificationGroup> {
    const db = createClient();
    const { data, error } = await db
      .from("notification_groups")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapGroup(data);
  },

  async updateNotificationGroup(
    id: string,
    payload: {
      name: string;
      slack_channel: string | null;
      email_recipients: string[];
      quiet_hours_enabled: boolean;
      quiet_hours_start: string | null;
      quiet_hours_end: string | null;
      quiet_hours_timezone: string;
      maintenance_suppression: boolean;
    }
  ): Promise<NotificationGroup> {
    const db = createClient();
    const { data, error } = await db
      .from("notification_groups")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return mapGroup(data);
  },

  async deleteNotificationGroup(id: string): Promise<void> {
    const db = createClient();
    const { error } = await db
      .from("notification_groups")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
};
