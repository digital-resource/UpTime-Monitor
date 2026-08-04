import { createClient } from "@/lib/supabase/client";
import type { AuditEvent, PaginatedResult, FilterParams } from "@/lib/types";

function mapRow(row: Record<string, unknown>): AuditEvent {
  return {
    id:        row.id as string,
    userId:    (row.user_id as string | null) ?? "",
    userName:  row.user_name as string,
    action:    row.action as string,
    target:    (row.target as string | null) ?? null,
    targetId:  (row.target_id as string | null) ?? null,
    result:    (row.result as AuditEvent["result"]) ?? "success",
    ipAddress: row.ip_address as string,
    details:   (row.details as string | null) ?? null,
    timestamp: row.timestamp as string,
  };
}

export const auditService = {
  async list(filters: FilterParams & { userName?: string; action?: string; result?: string } = {}): Promise<PaginatedResult<AuditEvent>> {
    const db = createClient();
    const page    = filters.page ?? 1;
    const perPage = filters.perPage ?? 100;
    const from    = (page - 1) * perPage;

    let query = db.from("audit_events").select("*", { count: "exact" });

    if (filters.userName) query = query.eq("user_name", filters.userName);
    if (filters.action)   query = query.eq("action", filters.action);
    if (filters.result)   query = query.eq("result", filters.result);
    if (filters.search) {
      query = query.or(
        `user_name.ilike.%${filters.search}%,action.ilike.%${filters.search}%,target.ilike.%${filters.search}%`
      );
    }

    const { data, count, error } = await query
      .order("timestamp", { ascending: false })
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

  async log(event: {
    userId?: string | null;
    userName: string;
    action: string;
    target?: string | null;
    targetId?: string | null;
    result?: "success" | "failure";
    details?: string | null;
  }): Promise<void> {
    const db = createClient();
    await db.from("audit_events").insert({
      user_id:   event.userId ?? null,
      user_name: event.userName,
      action:    event.action,
      target:    event.target ?? null,
      target_id: event.targetId ?? null,
      result:    event.result ?? "success",
      details:   event.details ?? null,
    });
  },
};
