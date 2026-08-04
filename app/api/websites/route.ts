/**
 * GET  /api/websites  — list websites (with filters)
 * POST /api/websites  — create website
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const db = createServiceClient();
  const { searchParams } = new URL(req.url);

  let query = db.from("websites").select("*", { count: "exact" });

  const status = searchParams.get("status");
  if (status) query = query.eq("status", status);

  const source = searchParams.get("source");
  if (source) query = query.eq("source", source);

  const search = searchParams.get("search");
  if (search) query = query.ilike("name", `%${search}%`);

  const page    = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "50");
  const from    = (page - 1) * perPage;

  query = query
    .order("created_at", { ascending: false })
    .range(from, from + perPage - 1);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count, page, perPage });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const db   = createServiceClient();

  const url    = body.url?.trim();
  const domain = url ? new URL(url).hostname : "";

  const { data, error } = await db.from("websites").insert({
    name:              body.name,
    url,
    domain,
    client:            body.client ?? null,
    environment:       body.environment ?? "production",
    source:            body.source ?? "manual",
    provider:          body.provider ?? "unknown",
    tags:              body.tags ?? [],
    internal_notes:    body.internalNotes ?? null,
    check_interval:    body.checkInterval ?? 120,
    timeout:           body.timeout ?? 30,
    failure_threshold: body.failureThreshold ?? 3,
    recovery_threshold: body.recoveryThreshold ?? 2,
    expected_http_status: body.expectedHttpStatus ?? 200,
    follow_redirects:  body.followRedirects ?? true,
    http_method:       body.httpMethod ?? "GET",
    ssl_monitoring:    body.sslMonitoring ?? true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
