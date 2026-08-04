/**
 * POST /api/checks/trigger
 * Triggers an immediate check cycle from the admin panel by pinging the
 * Cloudflare Worker's /check endpoint directly.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workerUrl = process.env.WORKER_URL;
  if (!workerUrl) {
    return NextResponse.json({ error: "WORKER_URL not configured" }, { status: 500 });
  }

  fetch(`${workerUrl}/check`, {
    method: "POST",
    headers: { "x-worker-secret": process.env.MONITORING_WORKER_SECRET ?? "" },
  }).catch(console.error);

  return NextResponse.json({ ok: true });
}
