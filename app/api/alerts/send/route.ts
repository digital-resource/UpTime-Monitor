/**
 * POST /api/alerts/send
 * Processes queued alerts — sends Slack and Mailgun messages.
 * Called by the Cloudflare Worker after each check cycle.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

type SendResult = { ok: true } | { ok: false; error: string };

function authorized(req: NextRequest) {
  const secret = req.headers.get("x-worker-secret");
  return secret === process.env.MONITORING_WORKER_SECRET;
}

async function sendSlack(text: string): Promise<SendResult> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return { ok: false, error: "SLACK_WEBHOOK_URL not configured" };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      return { ok: false, error: `Slack webhook returned ${res.status}: ${(await res.text()).slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Slack request failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function sendMailgun(subject: string, text: string, to: string): Promise<SendResult> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const from   = process.env.MAILGUN_FROM_EMAIL;
  if (!apiKey || !domain || !from) return { ok: false, error: "Mailgun env vars not configured" };
  if (!to) return { ok: false, error: "Alert has no recipient" };

  const form = new URLSearchParams({ from, to, subject, text });

  try {
    const res = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`api:${apiKey}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (!res.ok) {
      return { ok: false, error: `Mailgun returned ${res.status}: ${(await res.text()).slice(0, 300)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Mailgun request failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function markResult(
  db: ReturnType<typeof createServiceClient>,
  ids: string[],
  result: SendResult
) {
  if (result.ok) {
    await db.from("alerts")
      .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
      .in("id", ids);
  } else {
    await db.from("alerts")
      .update({ status: "failed", error: result.error })
      .in("id", ids);
  }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();

  // Fetch queued alerts
  const { data: alerts } = await db
    .from("alerts")
    .select("*, incidents(started_at, resolved_at, duration, error, failed_checks)")
    .eq("status", "queued")
    .limit(50);

  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0 });
  }

  let sent = 0;
  let failed = 0;

  // Group down alerts to detect mass outages
  const downSlackAlerts = alerts.filter(
    (a) => a.type === "down" && a.channel === "slack"
  );
  const recoveryAlerts = alerts.filter((a) => a.type === "recovery");
  const otherAlerts = alerts.filter(
    (a) => a.type !== "down" || a.channel !== "slack"
  );

  // Grouped Slack down alert
  if (downSlackAlerts.length >= 5) {
    const names = downSlackAlerts.map((a) => `• ${a.website_name}`).join("\n");
    const result = await sendSlack(
      `🔴 *Multiple Websites Down* — ${downSlackAlerts.length} sites affected:\n${names}`
    );
    const ids = downSlackAlerts.map((a) => a.id);
    await markResult(db, ids, result);
    if (result.ok) sent += ids.length; else failed += ids.length;
  } else {
    // Individual Slack down alerts
    for (const alert of downSlackAlerts) {
      const inc = alert.incidents as { error?: string; failed_checks?: number } | null;
      const msg = [
        `🔴 *Website Down*`,
        `Site: ${alert.website_name}`,
        inc?.error ? `Error: ${inc.error}` : null,
        inc?.failed_checks ? `Failed checks: ${inc.failed_checks}` : null,
        `Time: ${new Date().toLocaleTimeString()}`,
      ].filter(Boolean).join("\n");

      const result = await sendSlack(msg);
      await markResult(db, [alert.id], result);
      if (result.ok) sent++; else failed++;
    }
  }

  // Recovery alerts
  for (const alert of recoveryAlerts) {
    const inc = alert.incidents as { duration?: number } | null;
    const downtime = inc?.duration
      ? `${Math.round(inc.duration / 60)} minutes`
      : "unknown duration";

    let result: SendResult;
    if (alert.channel === "slack") {
      result = await sendSlack(
        `✅ *Website Back Online*\nSite: ${alert.website_name}\nDowntime: ${downtime}\nRecovered at: ${new Date().toLocaleTimeString()}`
      );
    } else if (alert.channel === "email") {
      result = await sendMailgun(
        `Website Back Online: ${alert.website_name}`,
        `Website: ${alert.website_name}\nDowntime: ${downtime}\nRecovered at: ${new Date().toISOString()}`,
        alert.recipient
      );
    } else {
      result = { ok: false, error: `Unknown channel: ${alert.channel}` };
    }

    await markResult(db, [alert.id], result);
    if (result.ok) sent++; else failed++;
  }

  // Remaining (email down alerts etc.)
  for (const alert of otherAlerts.filter((a) => a.type === "down" && a.channel === "email")) {
    const inc = alert.incidents as { error?: string; failed_checks?: number } | null;
    const result = await sendMailgun(
      `Website Down: ${alert.website_name}`,
      `Website: ${alert.website_name}\nStatus: Down\nReason: ${inc?.error ?? "Unknown"}\nFailed checks: ${inc?.failed_checks ?? "?"}\nDetected at: ${new Date().toISOString()}`,
      alert.recipient
    );
    await markResult(db, [alert.id], result);

    if (result.ok) {
      sent++;
      // Alert rows queued by the worker don't carry an incident_id yet (the
      // incident is created by a DB trigger after the worker already snapshot
      // its state) — match the still-open incident by website instead.
      await db.from("incidents").update({ email_alert_sent: true })
        .eq("website_id", alert.website_id).eq("status", "open");
    } else {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed });
}
