/**
 * POST /api/check-result
 * Called by the Cloudflare Worker every 2 minutes with check results.
 * Protected by MONITORING_WORKER_SECRET header.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function authorized(req: NextRequest) {
  const secret = req.headers.get("x-worker-secret");
  return secret === process.env.MONITORING_WORKER_SECRET;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { results } = body as {
    results: Array<{
      websiteId: string;
      status: string;
      httpStatus: number | null;
      responseTime: number | null;
      error: string | null;
      region: string;
      dnsTime?: number | null;
      connectTime?: number | null;
      tlsTime?: number | null;
      ttfbTime?: number | null;
    }>;
  };

  if (!results || !Array.isArray(results)) {
    return NextResponse.json({ error: "results array required" }, { status: 400 });
  }

  const db = createServiceClient();

  const checkRows = results.map((r) => ({
    website_id:   r.websiteId,
    status:       r.status,
    http_status:  r.httpStatus,
    response_time: r.responseTime,
    error:        r.error,
    region:       r.region ?? "auto",
    dns_time:     r.dnsTime ?? null,
    connect_time: r.connectTime ?? null,
    tls_time:     r.tlsTime ?? null,
    ttfb_time:    r.ttfbTime ?? null,
    checked_at:   new Date().toISOString(),
  }));

  const { error: insertError } = await db.from("check_results").insert(checkRows);
  if (insertError) {
    console.error("check_results insert error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Update each website's current status
  for (const r of results) {
    const isUp = r.status === "up";
    const isDown = r.status === "down" || r.status === "degraded";

    const { data: site } = await db
      .from("websites")
      .select("consecutive_failures, failure_threshold, has_active_incident, active_incident_id, name, url, client")
      .eq("id", r.websiteId)
      .single();

    if (!site) continue;

    if (isUp) {
      const wasDown = site.has_active_incident;
      await db.from("websites").update({
        status:              "up",
        http_status:         r.httpStatus,
        response_time:       r.responseTime,
        last_checked_at:     new Date().toISOString(),
        last_success_at:     new Date().toISOString(),
        consecutive_failures: 0,
        last_error:          null,
        has_active_incident: false,
        active_incident_id:  null,
      }).eq("id", r.websiteId);

      // Close open incident
      if (wasDown && site.active_incident_id) {
        const resolvedAt = new Date().toISOString();
        const { data: incident } = await db
          .from("incidents")
          .select("started_at")
          .eq("id", site.active_incident_id)
          .single();

        const duration = incident
          ? Math.round((Date.now() - new Date(incident.started_at).getTime()) / 1000)
          : null;

        await db.from("incidents").update({
          status:      "resolved",
          resolved_at: resolvedAt,
          duration,
          updated_at:  resolvedAt,
        }).eq("id", site.active_incident_id);

        await db.from("incident_events").insert({
          incident_id: site.active_incident_id,
          type:    "recovery",
          message: `Site recovered after ${duration ? Math.round(duration / 60) + " minutes" : "unknown duration"}`,
          timestamp: resolvedAt,
        });

        // Queue recovery alert
        await db.from("alerts").insert([
          {
            website_id:   r.websiteId,
            website_name: site.name,
            incident_id:  site.active_incident_id,
            type:         "recovery",
            channel:      "slack",
            recipient:    "slack",
            status:       "queued",
          },
          {
            website_id:   r.websiteId,
            website_name: site.name,
            incident_id:  site.active_incident_id,
            type:         "recovery",
            channel:      "email",
            recipient:    process.env.ALERT_EMAIL_TO ?? "",
            status:       "queued",
          },
        ]);
      }
    } else if (isDown) {
      const newFailures = site.consecutive_failures + 1;
      const threshold = site.failure_threshold ?? 3;

      await db.from("websites").update({
        status:               newFailures >= threshold ? "down" : "pending",
        http_status:          r.httpStatus,
        response_time:        r.responseTime,
        last_checked_at:      new Date().toISOString(),
        last_failure_at:      new Date().toISOString(),
        consecutive_failures: newFailures,
        last_error:           r.error,
      }).eq("id", r.websiteId);

      // Open incident once threshold reached
      if (newFailures === threshold && !site.has_active_incident) {
        const { data: incident } = await db.from("incidents").insert({
          website_id:   r.websiteId,
          website_name: site.name,
          website_url:  site.url,
          client:       site.client,
          status:       "open",
          error:        r.error,
          failed_checks: newFailures,
        }).select().single();

        if (incident) {
          await db.from("websites").update({
            has_active_incident: true,
            active_incident_id:  incident.id,
          }).eq("id", r.websiteId);

          await db.from("incident_events").insert({
            incident_id: incident.id,
            type:    "detected",
            message: `Site down: ${r.error ?? `HTTP ${r.httpStatus}`}`,
          });

          // Queue down alerts
          await db.from("alerts").insert([
            {
              website_id:   r.websiteId,
              website_name: site.name,
              incident_id:  incident.id,
              type:         "down",
              channel:      "slack",
              recipient:    "slack",
              status:       "queued",
            },
            {
              website_id:   r.websiteId,
              website_name: site.name,
              incident_id:  incident.id,
              type:         "down",
              channel:      "email",
              recipient:    process.env.ALERT_EMAIL_TO ?? "",
              status:       "queued",
            },
          ]);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, processed: results.length });
}
