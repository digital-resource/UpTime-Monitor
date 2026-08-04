/**
 * Monitoring Hub — Cloudflare Worker
 *
 * Cron: every 2 minutes → checkAllWebsites()
 * Cron: every hour      → syncAllProviders()
 *
 * Secrets required (set via wrangler secret put):
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY,
 *   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID,
 *   ROCKET_NET_API_KEY, ROCKET_NET_TEAM_ID,
 *   SLACK_WEBHOOK_URL,
 *   MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM_EMAIL, ALERT_EMAIL_TO,
 *   APP_API_URL, WORKER_SECRET
 */

export interface Env {
  SUPABASE_URL:          string;
  SUPABASE_SERVICE_KEY:  string;
  CLOUDFLARE_API_TOKEN:  string;
  CLOUDFLARE_ACCOUNT_ID: string;
  ROCKET_NET_EMAIL:      string;
  ROCKET_NET_PASSWORD:   string;
  // Webflow's token is NOT a worker secret — it's an OAuth token obtained via
  // the dashboard's /api/integrations/webflow/callback route and read from
  // Supabase's `integration_secrets` table at sync time (see syncWebflow).
  SLACK_WEBHOOK_URL:     string;
  MAILGUN_API_KEY:       string;
  MAILGUN_DOMAIN:        string;
  MAILGUN_FROM_EMAIL:    string;
  ALERT_EMAIL_TO:        string;
  APP_API_URL:           string; // optional — only used for manual triggers
  WORKER_SECRET:         string;
}

// ─── Supabase helpers ────────────────────────────────────────

async function supabaseGet(env: Env, path: string) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey:        env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  return res.json();
}

async function supabasePost(env: Env, path: string, body: unknown) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey:        env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer:        "return=representation",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function supabasePatch(env: Env, path: string, body: unknown) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey:        env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer:        "return=representation",
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ─── Website check ───────────────────────────────────────────

interface CheckResult {
  websiteId:    string;
  status:       string;
  httpStatus:   number | null;
  responseTime: number | null;
  error:        string | null;
  region:       string;
}

async function checkWebsite(site: { id: string; url: string; timeout: number; expected_http_status: number }): Promise<CheckResult> {
  const start = Date.now();
  const timeout = (site.timeout ?? 30) * 1000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(site.url, {
      method:   "GET",
      redirect: "manual",   // don't follow redirects — each redirect is a subrequest
      signal:   controller.signal,
      headers:  {
        // A generic bot UA (e.g. "MonitoringHub/1.0") gets 403'd by several
        // client WAFs (AWS/CloudFront, Cloudflare Bot Fight Mode, Wordfence)
        // even though the site is genuinely up for real visitors — this
        // mimics a real browser request closely enough to avoid that.
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timer);
    const responseTime = Date.now() - start;
    const code     = res.status;
    const expected = site.expected_http_status ?? 200;
    // 401/403 prove the server is up and answering — it just refused this one
    // request. That's almost always a WAF/bot-protection flagging the checker
    // itself (confirmed repeatedly: sites returning 403 to this worker return
    // 200 to a real browser seconds later), not a real outage. Treat it as up
    // rather than manufacturing false "site is down" incidents/Slack alerts.
    // The real HTTP code is still recorded below for anyone who wants to check.
    const isLikelyBlock = code === 401 || code === 403;
    // 2xx and 3xx are both "up" — redirects mean the site is alive
    const ok = isLikelyBlock || ((code >= 200 && code < 400) && (expected === 200 ? true : code === expected));
    return {
      websiteId:    site.id,
      status:       ok ? "up" : "down",
      httpStatus:   code,
      responseTime,
      error:        ok ? null : `HTTP ${code}`,
      region:       "cloudflare",
    };
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : "Unknown error";
    const isTimeout = msg.includes("abort") || msg.includes("timeout");
    return {
      websiteId:    site.id,
      status:       "down",
      httpStatus:   null,
      responseTime: null,
      error:        isTimeout ? "Timeout" : msg,
      region:       "cloudflare",
    };
  }
}

// ─── Human-readable failure reasons for Slack ───────────────────

const HTTP_REASONS: Record<number, string> = {
  400: "Bad Request — the server couldn't process the request",
  404: "Not Found — the page could not be found",
  408: "Request Timeout — the server took too long to respond",
  429: "Too Many Requests — the server is rate-limiting",
  500: "Internal Server Error — the origin server hit an error",
  502: "Bad Gateway — an upstream server returned an invalid response",
  503: "Service Unavailable — the server is overloaded or down for maintenance",
  504: "Gateway Timeout — the upstream server didn't respond in time",
  520: "Unknown Error (Cloudflare) — the web server returned an unexpected response",
  521: "Web Server Is Down (Cloudflare) — the origin server refused the connection",
  522: "Connection Timed Out (Cloudflare) — could not reach the origin server",
  523: "Origin Unreachable (Cloudflare) — the origin server could not be found",
  524: "A Timeout Occurred (Cloudflare) — the origin server took too long to respond",
  525: "SSL Handshake Failed (Cloudflare) — could not establish a secure connection",
  526: "Invalid SSL Certificate (Cloudflare)",
};

// Explains a CheckResult's failure. Accepts the raw httpStatus/error pair
// (used for a failure just observed) or a stored `error` string like
// "HTTP 500" / "Timeout" (used when explaining what a now-recovered site had
// been down for, since only the last error string survives between checks).
function explainFailure(httpStatus: number | null, error: string | null): string {
  if (httpStatus === null && error) {
    const m = error.match(/^HTTP (\d+)$/);
    if (m) return explainFailure(Number(m[1]), null);
    if (error === "Timeout") return "Timed Out — the server did not respond in time";
    return `Connection failed — ${error}`;
  }
  if (httpStatus === null) return "Connection failed — unknown error";
  return HTTP_REASONS[httpStatus] ?? `HTTP ${httpStatus} — unexpected response`;
}

// ─── Slack helper ────────────────────────────────────────────

async function sendSlack(env: Env, text: string): Promise<boolean> {
  if (!env.SLACK_WEBHOOK_URL) return false;
  try {
    const res = await fetch(env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Main check cycle ────────────────────────────────────────
//
// Subrequest budget per invocation (Cloudflare limit: free=50, paid=1000):
//   1  GET  — fetch all enabled sites
//   N  GET  — check each site (N = number of sites, done in batches of 50)
//   1  POST — bulk-insert check_results
//   ───────────────────────────────────────────────────────────
//   Total: N+2 subrequests for checks
//
// Website status updates, incident creation, and incident resolution are all
// handled by the Supabase trigger `trg_check_result_insert` (see
// supabase/functions.sql), so no additional subrequests are needed.
//
// Slack alerts are sent separately (1–2 subrequests) using a local diff
// against the site state fetched before the insert.

async function checkAllWebsites(env: Env) {
  const now = new Date().toISOString();

  // 1. Load the 90 sites most overdue for a check (1 subrequest)
  //    ORDER BY last_checked_at ASC NULLS FIRST → always checks the stalest sites first.
  //    With 196 sites and cron every 2 min, each site is checked every ~5 min.
  //    Keeping to 45 ensures total subrequests stay well within Cloudflare free-plan limits:
  //      1 (get) + 45 (checks, redirect:manual = 1 each) + 1 (post) + 1-2 (slack) = ~48 subrequests.
  const sites = await supabaseGet(
    env,
    `websites?monitoring_state=eq.enabled&order=last_checked_at.asc.nullsfirst&limit=45&select=id,url,timeout,expected_http_status,consecutive_failures,failure_threshold,has_active_incident,active_incident_id,name,client,last_error`
  ) as Array<{
    id: string; url: string; timeout: number; expected_http_status: number;
    consecutive_failures: number; failure_threshold: number;
    has_active_incident: boolean; active_incident_id: string | null;
    name: string; client: string | null; last_error: string | null;
  }>;

  if (!Array.isArray(sites) || sites.length === 0) return;
  const siteMap = new Map(sites.map(s => [s.id, s]));

  // 2. Check all 90 sites in parallel (single batch of 90 subrequests)
  const allResults: CheckResult[] = await Promise.all(sites.map(checkWebsite));

  // 3. Bulk-insert check_results (1 subrequest)
  //    The Supabase trigger trg_check_result_insert handles all website
  //    updates + incident management automatically per row.
  await supabasePost(env, "check_results", allResults.map(r => ({
    website_id:    r.websiteId,
    status:        r.status,
    http_status:   r.httpStatus,
    response_time: r.responseTime,
    error:         r.error,
    region:        "cloudflare",
    checked_at:    now,
  })));

  // 4. Send a single Slack summary for anything that changed this cycle.
  //    Single message = 1 subrequest regardless of how many sites changed.
  type AlertRecord = { websiteId: string; websiteName: string; incidentId: string | null; type: "down" | "recovery"; line: string };
  const newDownAlerts: AlertRecord[] = [];
  const recoveryAlerts: AlertRecord[] = [];

  for (const r of allResults) {
    const site = siteMap.get(r.websiteId);
    if (!site) continue;

    if (r.status === "up" && site.has_active_incident) {
      recoveryAlerts.push({
        websiteId: r.websiteId, websiteName: site.name, incidentId: site.active_incident_id, type: "recovery",
        line: `• <${site.url}|${site.name}>\n   ✅ Back up — was down due to: ${explainFailure(null, site.last_error)}`,
      });
    } else if (r.status !== "up") {
      const newFailures = (site.consecutive_failures ?? 0) + 1;
      const threshold   = site.failure_threshold ?? 3;
      if (newFailures === threshold && !site.has_active_incident) {
        newDownAlerts.push({
          websiteId: r.websiteId, websiteName: site.name, incidentId: null, type: "down",
          line: `• <${site.url}|${site.name}>\n   🔻 ${explainFailure(r.httpStatus, r.error)}`,
        });
      }
    }
  }

  // Build one Slack message combining all alerts (1 subrequest total)
  const parts: string[] = [];
  if (newDownAlerts.length > 0) {
    parts.push(
      `🔴 *${newDownAlerts.length === 1 ? "Site Down" : `${newDownAlerts.length} Sites Down`}*\n\n${newDownAlerts.map(a => a.line).join("\n\n")}`
    );
  }
  if (recoveryAlerts.length > 0) {
    parts.push(
      `✅ *${recoveryAlerts.length === 1 ? "Site Recovered" : `${recoveryAlerts.length} Sites Recovered`}*\n\n${recoveryAlerts.map(a => a.line).join("\n\n")}`
    );
  }

  const allAlerts = [...newDownAlerts, ...recoveryAlerts];
  if (parts.length > 0 && allAlerts.length > 0) {
    const sentOk = await sendSlack(env, parts.join("\n\n"));
    await supabasePost(env, "alerts", allAlerts.map(a => ({
      website_id:   a.websiteId,
      website_name: a.websiteName,
      incident_id:  a.incidentId,
      type:         a.type,
      channel:      "slack",
      recipient:    "#alerts",
      status:       sentOk ? "sent" : "failed",
      sent_at:      sentOk ? now : null,
    })));
  }
}

// ─── Cloudflare domain sync ──────────────────────────────────

async function syncCloudflare(env: Env) {
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) return { discovered: 0, added: 0 };

  let page = 1;
  const allZones: Array<{ name: string }> = [];

  while (true) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones?account.id=${env.CLOUDFLARE_ACCOUNT_ID}&per_page=100&page=${page}`,
      { headers: { Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}` } }
    );
    const json = await res.json() as { result: Array<{ name: string }>; result_info: { total_pages: number } };
    allZones.push(...json.result);
    if (page >= json.result_info.total_pages) break;
    page++;
  }

  // Get existing websites from Supabase
  const existing = await supabaseGet(env, `websites?select=domain`) as Array<{ domain: string }>;
  const existingDomains = new Set(existing.map((e) => e.domain));

  let added = 0;
  for (const zone of allZones) {
    if (existingDomains.has(zone.name)) continue;
    await supabasePost(env, "websites", {
      name:            zone.name,
      url:             `https://${zone.name}`,
      domain:          zone.name,
      source:          "cloudflare_import",
      provider:        "unknown",
      status:          "pending",
      monitoring_state: "enabled",
    });
    added++;
  }

  console.log(`[Cloudflare sync] Added ${added} new domains from ${allZones.length} zones`);
  return { discovered: allZones.length, added };
}

// ─── Rocket.net sync ─────────────────────────────────────────

async function syncRocketNet(env: Env) {
  if (!env.ROCKET_NET_EMAIL || !env.ROCKET_NET_PASSWORD) return { discovered: 0, added: 0 };

  try {
    // Authenticate to get a fresh JWT (tokens expire every 7 days)
    const authRes = await fetch("https://api.rocket.net/v1/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ username: env.ROCKET_NET_EMAIL, password: env.ROCKET_NET_PASSWORD }),
    });
    if (!authRes.ok) {
      console.error("[Rocket.net sync] Auth failed:", authRes.status);
      return { discovered: 0, added: 0 };
    }
    const { token } = await authRes.json() as { token: string };

    const res = await fetch("https://api.rocket.net/v1/sites?per_page=500", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) {
      console.error("[Rocket.net sync] API error:", res.status);
      return { discovered: 0, added: 0 };
    }
    // API returns { result: [...] }
    const json = await res.json() as { result?: Array<{ id: number; domain: string; label?: string; status?: string }> };
    const sites = (json.result ?? []).filter(s => s.status === "active");

    const existing = await supabaseGet(env, `websites?select=domain`) as Array<{ domain: string }>;
    const existingDomains = new Set(existing.map((e) => e.domain));

    let added = 0;
    for (const site of sites) {
      const domain = site.domain;
      if (!domain || existingDomains.has(domain)) continue;
      const rawLabel = (site.label ?? "").trim().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
      const name = rawLabel && !rawLabel.startsWith("http") ? rawLabel : domain;
      await supabasePost(env, "websites", {
        name,
        url:             `https://${domain}`,
        domain,
        source:          "rocket_net_import",
        provider:        "rocket_net",
        environment:     "production",
        status:          "pending",
        monitoring_state: "enabled",
      });
      added++;
      existingDomains.add(domain);
    }
    console.log(`[Rocket.net sync] Added ${added} new sites from ${sites.length} total`);
    return { discovered: sites.length, added };
  } catch (err) {
    console.error("[Rocket.net sync] Error:", err);
    return { discovered: 0, added: 0 };
  }
}

// ─── Webflow sync ────────────────────────────────────────────

async function syncWebflow(env: Env) {
  // The OAuth token lives in `integration_secrets` (service-role-only table,
  // written by the app's /api/integrations/webflow/callback route), not an
  // env secret — it's obtained dynamically when someone connects Webflow via
  // the dashboard, not at worker-deploy time.
  const secretRows = await supabaseGet(env, `integration_secrets?slug=eq.webflow&select=secret`) as Array<{ secret?: { access_token?: string } }>;
  const token = secretRows[0]?.secret?.access_token;
  if (!token) return { discovered: 0, added: 0 };

  try {
    const res = await fetch("https://api.webflow.com/v2/sites", {
      headers: {
        Authorization: `Bearer ${token}`,
        "accept-version": "1.0.0",
      },
    });
    if (!res.ok) return { discovered: 0, added: 0 };

    const json = await res.json() as {
      sites?: Array<{ displayName?: string; customDomains?: Array<{ url: string; lastPublished: string | null }> }>;
    };
    const wfSites = json.sites ?? [];

    const existing = await supabaseGet(env, `websites?select=domain`) as Array<{ domain: string }>;
    const existingDomains = new Set(existing.map((e) => e.domain));

    let added = 0;
    let discovered = 0;
    for (const site of wfSites) {
      for (const cd of (site.customDomains ?? [])) {
        // Only import domains actually live right now — a connected-but-never-
        // published custom domain isn't serving anything to monitor yet.
        if (!cd.lastPublished) continue;
        discovered++;
        const domain = cd.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
        if (!domain || existingDomains.has(domain)) continue;
        await supabasePost(env, "websites", {
          name:            site.displayName ?? domain,
          url:             `https://${domain}`,
          domain,
          source:          "webflow_import",
          provider:        "webflow",
          status:          "pending",
          monitoring_state: "enabled",
        });
        added++;
        existingDomains.add(domain);
      }
    }
    console.log(`[Webflow sync] Added ${added} new custom domains`);
    return { discovered, added };
  } catch (err) {
    console.error("[Webflow sync] Error:", err);
    return { discovered: 0, added: 0 };
  }
}

async function syncAllProviders(env: Env) {
  await Promise.allSettled([
    syncCloudflare(env),
    syncRocketNet(env),
    syncWebflow(env),
  ]);
}

const SYNC_PROVIDERS: Record<string, (env: Env) => Promise<{ discovered: number; added: number }>> = {
  cloudflare:  syncCloudflare,
  rocket_net:  syncRocketNet,
  webflow:     syncWebflow,
};

// ─── Cron dispatcher ─────────────────────────────────────────

export default {
  async scheduled(controller: ScheduledController, env: Env, _ctx: ExecutionContext) {
    if (controller.cron === "0 * * * *") {
      // Top of every hour — sync providers
      await syncAllProviders(env);
    } else {
      // Every 2 minutes — check websites
      await checkAllWebsites(env);
    }
  },

  // Allow manual HTTP trigger for testing
  async fetch(request: Request, env: Env): Promise<Response> {
    const secret = request.headers.get("x-worker-secret");
    if (secret !== env.WORKER_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url  = new URL(request.url);
    const path = url.pathname;

    if (path === "/check") {
      try {
        await checkAllWebsites(env);
        return new Response("Check triggered", { status: 200 });
      } catch (err) {
        const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err);
        return new Response(`Worker error:\n${msg}`, { status: 500 });
      }
    }
    if (path === "/sync") {
      let body: { provider?: string; syncRunId?: string } = {};
      try { body = await request.json(); } catch { /* no body — full sync */ }

      const syncFn = body.provider ? SYNC_PROVIDERS[body.provider] : undefined;

      // Manual single-provider trigger from the admin panel — track completion
      if (body.provider && body.syncRunId && syncFn) {
        const startedAt = Date.now();
        try {
          const { discovered, added } = await syncFn(env);
          const now = new Date().toISOString();
          await supabasePatch(env, `sync_runs?id=eq.${body.syncRunId}`, {
            completed_at: now,
            duration:     Math.round((Date.now() - startedAt) / 1000),
            result:       "success",
            added,
            skipped:      discovered - added,
          });
          await supabasePatch(env, `integrations?slug=eq.${body.provider}`, {
            status:          "connected",
            last_success_at: now,
          });
          return new Response("Sync triggered", { status: 200 });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await supabasePatch(env, `sync_runs?id=eq.${body.syncRunId}`, {
            completed_at: new Date().toISOString(),
            duration:     Math.round((Date.now() - startedAt) / 1000),
            result:       "error",
          });
          await supabasePost(env, "sync_logs", {
            sync_run_id: body.syncRunId,
            level:       "error",
            message:     msg,
          });
          await supabasePatch(env, `integrations?slug=eq.${body.provider}`, { status: "error" });
          return new Response(`Sync error:\n${msg}`, { status: 500 });
        }
      }

      try {
        await syncAllProviders(env);
        return new Response("Sync triggered", { status: 200 });
      } catch (err) {
        const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err);
        return new Response(`Sync error:\n${msg}`, { status: 500 });
      }
    }

    return new Response("Monitoring Hub Worker — OK", { status: 200 });
  },
} satisfies ExportedHandler<Env>;
