/**
 * Monitoring Hub — Cloudflare Worker
 *
 * Cron: every 2 minutes → checkAllWebsites()
 * Cron: every hour      → syncAllProviders(), and at 9 AM / 5 PM America/New_York
 *                          (checked live each hour so it self-adjusts for
 *                          DST — no separate cron trigger needed) →
 *                          sendOpenIncidentsDigest()
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 520-526 are Cloudflare's "edge-to-origin" error codes, but they're also
// what the Workers runtime itself synthesizes when *its own* outbound fetch
// hits a connection/TLS-layer problem reaching a site — even one that isn't
// behind Cloudflare at all (confirmed: dentondentalsolutions.com resolves to
// a plain GCP IP, no Cloudflare anycast in its path, yet still produced a
// "Cloudflare" 520). Seen repeatedly: a burst of unrelated client sites all
// tripping 520 within the same few minutes, and one site stuck on 525 for
// 230+ hours straight while loading fine for every real visitor the whole
// time. That pattern means the Worker's own connection attempt is what's
// failing, not the origin app. A single retry after a short delay clears the
// transient cases; a site that fails it twice in a row is treated as a real
// failure like any other non-2xx/3xx response.
const CF_EDGE_ERROR_CODES = new Set([520, 521, 522, 523, 524, 525, 526]);

// Retries share one small budget per cron invocation (see RETRY_BUDGET_PER_CYCLE
// below, next to the subrequest-count math this protects) — a burst of sites
// all hitting a CF edge code in the same cycle must not multiply the
// per-invocation subrequest count past Cloudflare's free-plan cap.
async function attemptFetch(
  site: { url: string; timeout: number },
): Promise<{ code: number | null; responseTime: number | null; err: string | null }> {
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
    // We only need the status code, never the body — but leaving the body
    // stream unconsumed holds open one of the Worker's limited concurrent
    // connection slots until the runtime force-cancels it, which was
    // spamming "stalled HTTP response" warnings (worse now that 520-526
    // responses can trigger a second fetch for the same site). Cancel it
    // explicitly so the slot frees up immediately.
    if (res.body) {
      try { await res.body.cancel(); } catch { /* already closed/errored — nothing to clean up */ }
    }
    return { code: res.status, responseTime, err: null };
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : "Unknown error";
    const isTimeout = msg.includes("abort") || msg.includes("timeout");
    return { code: null, responseTime: null, err: isTimeout ? "Timeout" : msg };
  }
}

async function checkWebsite(
  site: { id: string; url: string; timeout: number; expected_http_status: number },
  retryBudget: { n: number },
): Promise<CheckResult> {
  let attempt = await attemptFetch(site);
  if (attempt.code !== null && CF_EDGE_ERROR_CODES.has(attempt.code) && retryBudget.n > 0) {
    retryBudget.n--;
    await sleep(500);
    attempt = await attemptFetch(site);
  }

  if (attempt.code === null) {
    return {
      websiteId:    site.id,
      status:       "down",
      httpStatus:   null,
      responseTime: null,
      error:        attempt.err,
      region:       "cloudflare",
    };
  }

  const code     = attempt.code;
  const expected = site.expected_http_status ?? 200;
  // 401/403 prove the server is up and answering — it just refused this one
  // request. That's almost always a WAF/bot-protection flagging the checker
  // itself (confirmed repeatedly: sites returning 403 to this worker return
  // 200 to a real browser seconds later), not a real outage. Treat it as up
  // rather than manufacturing false "site is down" incidents/Slack alerts.
  // 429 gets the same treatment: up to 35 sites are checked in parallel from
  // one shared Cloudflare IP every run, which trips host-side rate limiters
  // (seen repeatedly on Shopify storefronts) even though real visitors from
  // distinct IPs never hit the limit. The real HTTP code is still recorded
  // below for anyone who wants to check.
  const isLikelyBlock = code === 401 || code === 403 || code === 429;
  // 2xx and 3xx are both "up" — redirects mean the site is alive
  const ok = isLikelyBlock || ((code >= 200 && code < 400) && (expected === 200 ? true : code === expected));
  return {
    websiteId:    site.id,
    status:       ok ? "up" : "down",
    httpStatus:   code,
    responseTime: attempt.responseTime,
    error:        ok ? null : `HTTP ${code}`,
    region:       "cloudflare",
  };
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

  // 1. Load the sites most overdue for a check (1 subrequest)
  //    ORDER BY last_checked_at ASC NULLS FIRST → always checks the stalest sites first.
  //    With 672 sites and cron every 2 min, each site is checked roughly every ~34 min.
  //    Keeping to 35 (down from 40, to make room for CF-edge-error retries below)
  //    ensures total subrequests stay well within Cloudflare free-plan limits:
  //      1 (get) + 35 (checks) + RETRY_BUDGET_PER_CYCLE (retries, capped) + 1 (post)
  //      + 1-2 (slack) + 1 (down-incident flag) + 1 (recovery-incident flag)
  //      + 1 (email trigger) = ~47 subrequests worst case.
  const sites = await supabaseGet(
    env,
    `websites?monitoring_state=eq.enabled&order=last_checked_at.asc.nullsfirst&limit=35&select=id,url,domain,timeout,expected_http_status,consecutive_failures,failure_threshold,has_active_incident,active_incident_id,name,client,last_error`
  ) as Array<{
    id: string; url: string; domain: string; timeout: number; expected_http_status: number;
    consecutive_failures: number; failure_threshold: number;
    has_active_incident: boolean; active_incident_id: string | null;
    name: string; client: string | null; last_error: string | null;
  }>;

  if (!Array.isArray(sites) || sites.length === 0) return;
  const siteMap = new Map(sites.map(s => [s.id, s]));

  // 2. Check all sites in parallel (single batch). Retries for CF edge-error
  //    codes (520-526) share one small budget across the whole batch so a
  //    burst of sites hitting them at once can't blow the subrequest cap.
  const RETRY_BUDGET_PER_CYCLE = 5;
  const retryBudget = { n: RETRY_BUDGET_PER_CYCLE };
  const allResults: CheckResult[] = await Promise.all(sites.map(s => checkWebsite(s, retryBudget)));

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

  // 4. Send a single Slack summary for anything that newly went down this cycle.
  //    Single message = 1 subrequest regardless of how many sites changed.
  //    Recovery ("back up") messages are intentionally NOT sent to Slack — the
  //    incident itself still auto-resolves via the DB trigger regardless; this
  //    just keeps the channel to down-alerts only, per what was asked for.
  type AlertRecord = { websiteId: string; websiteName: string; line: string };
  const newDownAlerts: AlertRecord[] = [];

  for (const r of allResults) {
    const site = siteMap.get(r.websiteId);
    if (!site || r.status === "up") continue;

    const newFailures = (site.consecutive_failures ?? 0) + 1;
    const threshold   = site.failure_threshold ?? 3;
    if (newFailures === threshold && !site.has_active_incident) {
      newDownAlerts.push({
        websiteId: r.websiteId, websiteName: site.name,
        // Domain shown alongside the client/site name so it's clear which
        // actual site is down — the name alone was confusing people.
        line: `• <${site.url}|${site.name}> — ${site.domain}\n   🔻 ${explainFailure(r.httpStatus, r.error)}`,
      });
    }
  }

  if (newDownAlerts.length > 0) {
    const text = `🔴 *${newDownAlerts.length === 1 ? "Site Down" : `${newDownAlerts.length} Sites Down`}*\n\n${newDownAlerts.map(a => a.line).join("\n\n")}`;
    const sentOk = await sendSlack(env, text);
    const alertRows = newDownAlerts.map(a => ({
      website_id:   a.websiteId,
      website_name: a.websiteName,
      incident_id:  null,
      type:         "down",
      channel:      "slack",
      recipient:    "#alerts",
      status:       sentOk ? "sent" : "failed",
      sent_at:      sentOk ? now : null,
    }));

    // Down-alert email to the web team — queued as "email"/"down" rows the
    // app's /api/alerts/send route (Mailgun) picks up. No recovery emails,
    // no other recipients — just this one address, per what was asked for.
    if (env.ALERT_EMAIL_TO) {
      alertRows.push(...newDownAlerts.map(a => ({
        website_id:   a.websiteId,
        website_name: a.websiteName,
        incident_id:  null,
        type:         "down",
        channel:      "email",
        recipient:    env.ALERT_EMAIL_TO,
        status:       "queued",
        sent_at:      null,
      })));
    }

    await supabasePost(env, "alerts", alertRows);

    // Reflect the Slack send back onto the incident rows — the UI's
    // Slack/Email columns read these flags, and they were never being set.
    if (sentOk) {
      const ids = newDownAlerts.map(a => a.websiteId).join(",");
      await supabasePatch(env, `incidents?website_id=in.(${ids})&status=eq.open`, {
        slack_alert_sent: true,
      });
    }

    // Ask the app to actually send the queued email alerts via Mailgun.
    if (env.ALERT_EMAIL_TO && env.APP_API_URL) {
      try {
        await fetch(`${env.APP_API_URL}/api/alerts/send`, {
          method: "POST",
          headers: { "x-worker-secret": env.WORKER_SECRET },
        });
      } catch (err) {
        console.error("[Email alert trigger] Error:", err);
      }
    }
  }
}

// ─── Twice-daily open-incidents Slack digest (9 AM / 5 PM Eastern) ────────
//
// Separate from the real-time down/recovery alerts sent in checkAllWebsites
// — this is a standing summary of everything still open at digest time,
// same set the dashboard's Active tab shows (incidents.status = 'open').

function formatDurationShort(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

function isDigestHourEastern(): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }).format(new Date())
  );
  return hour === 9 || hour === 17;
}

async function sendOpenIncidentsDigest(env: Env) {
  const openIncidents = await supabaseGet(
    env,
    `incidents?status=eq.open&order=started_at.asc&select=website_name,website_url,client,started_at,error`
  ) as Array<{ website_name: string; website_url: string; client: string | null; started_at: string; error: string | null }>;

  if (!Array.isArray(openIncidents)) return;

  const now = Date.now();
  let text: string;
  if (openIncidents.length === 0) {
    text = `✅ *Daily Status Update* — all monitored sites are currently up. No open incidents.`;
  } else {
    const lines = openIncidents.map(inc => {
      const downFor = formatDurationShort((now - new Date(inc.started_at).getTime()) / 1000);
      const domain = (() => { try { return new URL(inc.website_url).hostname; } catch { return inc.website_url; } })();
      return `• <${inc.website_url}|${inc.website_name}> — ${domain}${inc.client ? ` (${inc.client})` : ""}\n   🔻 Down ${downFor} — ${inc.error ?? "Unknown error"}`;
    });
    text = `🟡 *Daily Status Update* — ${openIncidents.length} site${openIncidents.length === 1 ? "" : "s"} currently down:\n\n${lines.join("\n\n")}`;
  }

  await sendSlack(env, text);
}

// ─── Sync helpers ────────────────────────────────────────────

// Domains a user explicitly deleted from the monitor — sync must not
// re-import these just because they're still a zone/site upstream.
async function getExcludedDomains(env: Env): Promise<Set<string>> {
  const excluded = await supabaseGet(env, `excluded_domains?select=domain`) as Array<{ domain: string }>;
  return new Set(excluded.map((e) => e.domain));
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

  // Get existing websites from Supabase, plus anything explicitly excluded
  const existing = await supabaseGet(env, `websites?select=domain`) as Array<{ domain: string }>;
  const existingDomains = new Set(existing.map((e) => e.domain));
  const excludedDomains = await getExcludedDomains(env);

  let added = 0;
  for (const zone of allZones) {
    if (existingDomains.has(zone.name) || excludedDomains.has(zone.name)) continue;
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
    const excludedDomains = await getExcludedDomains(env);

    let added = 0;
    for (const site of sites) {
      const domain = site.domain;
      if (!domain || existingDomains.has(domain) || excludedDomains.has(domain)) continue;
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
    const excludedDomains = await getExcludedDomains(env);

    let discovered = 0;
    const rows: Record<string, unknown>[] = [];
    for (const site of wfSites) {
      for (const cd of (site.customDomains ?? [])) {
        // Only import domains actually live right now — a connected-but-never-
        // published custom domain isn't serving anything to monitor yet.
        if (!cd.lastPublished) continue;
        discovered++;
        const domain = cd.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
        if (!domain || existingDomains.has(domain) || excludedDomains.has(domain)) continue;
        rows.push({
          name:            site.displayName ?? domain,
          url:             `https://${domain}`,
          domain,
          source:          "webflow_import",
          provider:        "webflow",
          status:          "pending",
          monitoring_state: "enabled",
        });
        existingDomains.add(domain);
      }
    }

    // Insert as one bulk request — a per-site POST loop can blow past the
    // Workers per-invocation subrequest cap on large workspaces, killing the
    // request before the sync_runs/integrations status update ever runs.
    if (rows.length > 0) {
      await supabasePost(env, "websites", rows);
    }
    const added = rows.length;
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
      // At 9 AM / 5 PM America/New_York (checked live, so DST-safe) — send
      // the twice-daily open-incidents Slack digest.
      if (isDigestHourEastern()) {
        await sendOpenIncidentsDigest(env);
      }
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
    if (path === "/digest") {
      try {
        await sendOpenIncidentsDigest(env);
        return new Response("Digest sent", { status: 200 });
      } catch (err) {
        const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err);
        return new Response(`Digest error:\n${msg}`, { status: 500 });
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
