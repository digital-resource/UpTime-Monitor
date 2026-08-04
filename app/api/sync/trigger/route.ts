/**
 * POST /api/sync/trigger
 * Triggers a manual sync from the admin panel.
 * The Worker will pick it up on the next cycle or we call the Worker directly.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { provider } = await req.json();
  const db = createServiceClient();

  // Find integration
  const { data: integration } = await db
    .from("integrations")
    .select("id, name, slug")
    .eq("slug", provider)
    .single();

  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  // Create sync run record
  const { data: run } = await db.from("sync_runs").insert({
    integration_id:   integration.id,
    integration_name: integration.name,
    provider:         integration.slug,
    trigger:          "manual",
    triggered_by:     user.email ?? user.id,
  }).select().single();

  // Update integration status
  await db.from("integrations").update({
    status:          "syncing",
    last_attempt_at: new Date().toISOString(),
  }).eq("id", integration.id);

  // If WORKER_URL is configured, call it directly
  const workerUrl = process.env.WORKER_URL;
  if (workerUrl) {
    fetch(`${workerUrl}/sync`, {
      method: "POST",
      headers: {
        "x-worker-secret": process.env.MONITORING_WORKER_SECRET ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ provider, syncRunId: run?.id }),
    }).catch(console.error);
  }

  return NextResponse.json({ ok: true, syncRunId: run?.id });
}
