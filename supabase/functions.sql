-- ============================================================
-- Monitoring Hub — Supabase Functions & Triggers
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ─── Trigger: auto-update websites when check_results inserted ────────────────
-- This lets the Cloudflare Worker do a single bulk INSERT into check_results
-- and have Supabase handle all website status updates + incident management.
-- Result: Worker uses ~3 subrequests instead of 200+.

CREATE OR REPLACE FUNCTION on_check_result_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  site             websites%ROWTYPE;
  new_failures     INTEGER;
  incident_id      UUID;
  inc_started      TIMESTAMPTZ;
  downtime_sec     INTEGER;
BEGIN
  -- Load the website
  SELECT * INTO site FROM websites WHERE id = NEW.website_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  IF NEW.status = 'up' THEN
    -- ── Site is UP ──────────────────────────────────────────
    UPDATE websites SET
      status               = 'up',
      http_status          = NEW.http_status,
      response_time        = NEW.response_time,
      last_checked_at      = NEW.checked_at,
      last_success_at      = NEW.checked_at,
      consecutive_failures = 0,
      last_error           = NULL,
      has_active_incident  = FALSE,
      active_incident_id   = NULL,
      updated_at           = NOW()
    WHERE id = NEW.website_id;

    -- Close open incident if any
    IF site.has_active_incident AND site.active_incident_id IS NOT NULL THEN
      SELECT started_at INTO inc_started
        FROM incidents WHERE id = site.active_incident_id;

      downtime_sec := EXTRACT(EPOCH FROM (NOW() - inc_started))::INTEGER;

      UPDATE incidents SET
        status      = 'resolved',
        resolved_at = NOW(),
        duration    = downtime_sec,
        updated_at  = NOW()
      WHERE id = site.active_incident_id;

      INSERT INTO incident_events (incident_id, type, message, timestamp)
      VALUES (
        site.active_incident_id,
        'recovery',
        'Site recovered after ' || (downtime_sec / 60) || ' min',
        NOW()
      );
    END IF;

  ELSE
    -- ── Site is DOWN / DEGRADED ──────────────────────────────
    new_failures := COALESCE(site.consecutive_failures, 0) + 1;

    UPDATE websites SET
      status               = CASE
                               WHEN new_failures >= COALESCE(failure_threshold, 3)
                               THEN 'down'
                               ELSE 'degraded'
                             END,
      http_status          = NEW.http_status,
      response_time        = NEW.response_time,
      last_checked_at      = NEW.checked_at,
      last_failure_at      = NEW.checked_at,
      consecutive_failures = new_failures,
      last_error           = NEW.error,
      updated_at           = NOW()
    WHERE id = NEW.website_id;

    -- Open a new incident when failure threshold first reached
    IF new_failures = COALESCE(site.failure_threshold, 3)
       AND NOT COALESCE(site.has_active_incident, FALSE) THEN

      INSERT INTO incidents (
        website_id, website_name, website_url, client,
        status, error, failed_checks, started_at
      )
      VALUES (
        NEW.website_id, site.name, site.url, site.client,
        'open',
        COALESCE(NEW.error, 'HTTP ' || COALESCE(NEW.http_status::TEXT, 'unknown')),
        new_failures,
        NOW()
      )
      RETURNING id INTO incident_id;

      UPDATE websites SET
        has_active_incident = TRUE,
        active_incident_id  = incident_id
      WHERE id = NEW.website_id;

      INSERT INTO incident_events (incident_id, type, message, timestamp)
      VALUES (
        incident_id,
        'detected',
        'Site down: ' || COALESCE(NEW.error, 'HTTP ' || COALESCE(NEW.http_status::TEXT, 'unknown')),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger (drop first if exists)
DROP TRIGGER IF EXISTS trg_check_result_insert ON check_results;

CREATE TRIGGER trg_check_result_insert
AFTER INSERT ON check_results
FOR EACH ROW
EXECUTE FUNCTION on_check_result_insert();

-- ─── RPC: process_check_results (batch version, alternative to trigger) ───────
-- Not needed if using the trigger above, but kept as a fallback.
CREATE OR REPLACE FUNCTION process_check_results(results JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r            JSONB;
  site         websites%ROWTYPE;
  new_failures INTEGER;
  incident_id  UUID;
  inc_started  TIMESTAMPTZ;
  down_alerts  TEXT[]  = ARRAY[]::TEXT[];
  rec_alerts   JSONB   = '[]'::JSONB;
  down_count   INTEGER = 0;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(results) LOOP
    SELECT * INTO site FROM websites WHERE id = (r->>'website_id')::UUID;
    IF NOT FOUND THEN CONTINUE; END IF;

    IF r->>'status' = 'up' THEN
      UPDATE websites SET
        status='up', http_status=(r->>'http_status')::INTEGER,
        response_time=(r->>'response_time')::INTEGER,
        last_checked_at=NOW(), last_success_at=NOW(),
        consecutive_failures=0, last_error=NULL,
        has_active_incident=FALSE, active_incident_id=NULL, updated_at=NOW()
      WHERE id=(r->>'website_id')::UUID;

      IF site.has_active_incident AND site.active_incident_id IS NOT NULL THEN
        SELECT started_at INTO inc_started FROM incidents WHERE id=site.active_incident_id;
        UPDATE incidents SET status='resolved', resolved_at=NOW(),
          duration=EXTRACT(EPOCH FROM (NOW()-inc_started))::INTEGER, updated_at=NOW()
        WHERE id=site.active_incident_id;
        INSERT INTO incident_events(incident_id,type,message,timestamp)
          VALUES(site.active_incident_id,'recovery','Site recovered',NOW());
        rec_alerts := rec_alerts || jsonb_build_array(jsonb_build_object(
          'name',site.name,'url',site.url,
          'downtime_min',EXTRACT(EPOCH FROM (NOW()-inc_started))::INTEGER/60));
      END IF;

    ELSE
      new_failures := COALESCE(site.consecutive_failures,0)+1;
      UPDATE websites SET
        status=CASE WHEN new_failures>=COALESCE(failure_threshold,3) THEN 'down' ELSE 'degraded' END,
        http_status=(r->>'http_status')::INTEGER,
        response_time=(r->>'response_time')::INTEGER,
        last_checked_at=NOW(), last_failure_at=NOW(),
        consecutive_failures=new_failures, last_error=r->>'error', updated_at=NOW()
      WHERE id=(r->>'website_id')::UUID;

      IF new_failures=COALESCE(site.failure_threshold,3)
         AND NOT COALESCE(site.has_active_incident,FALSE) THEN
        INSERT INTO incidents(website_id,website_name,website_url,client,status,error,failed_checks)
          VALUES((r->>'website_id')::UUID,site.name,site.url,site.client,'open',r->>'error',new_failures)
          RETURNING id INTO incident_id;
        UPDATE websites SET has_active_incident=TRUE,active_incident_id=incident_id
          WHERE id=(r->>'website_id')::UUID;
        INSERT INTO incident_events(incident_id,type,message,timestamp)
          VALUES(incident_id,'detected','Site down: '||COALESCE(r->>'error','HTTP '||COALESCE(r->>'http_status','')),NOW());
        down_alerts:=array_append(down_alerts,site.name||' - '||COALESCE(r->>'error','HTTP '||COALESCE(r->>'http_status','')));
        down_count:=down_count+1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('down_alerts',to_jsonb(down_alerts),'down_count',down_count,'rec_alerts',rec_alerts);
END;
$$;

GRANT EXECUTE ON FUNCTION process_check_results(JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION on_check_result_insert()     TO service_role;

-- Composite index to keep refresh_website_uptime() (below) cheap as
-- check_results grows — the worker inserts ~196 rows every 2 minutes.
CREATE INDEX IF NOT EXISTS idx_check_results_website_checked
  ON check_results(website_id, checked_at DESC);

-- ─── Function: refresh_website_uptime ──────────────────────────
-- Recomputes uptime_24h / uptime_30d / uptime_90d for every website from
-- check_results. Nothing else ever writes these columns — the schema
-- defines them and the whole UI reads them (Overview's "30-Day Uptime"
-- card, the Websites table's "Uptime 30D" column, per-site detail pages),
-- but without this running on a schedule they stay NULL forever and every
-- one of those reads back as "0.00%" / "—".
CREATE OR REPLACE FUNCTION refresh_website_uptime()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE websites w SET
    uptime_24h = sub.uptime_24h,
    uptime_30d = sub.uptime_30d,
    uptime_90d = sub.uptime_90d
  FROM (
    SELECT
      website_id,
      ROUND(100.0 * COUNT(*) FILTER (WHERE checked_at >= NOW() - INTERVAL '1 day'  AND status = 'up')
            / NULLIF(COUNT(*) FILTER (WHERE checked_at >= NOW() - INTERVAL '1 day'), 0), 2)  AS uptime_24h,
      ROUND(100.0 * COUNT(*) FILTER (WHERE checked_at >= NOW() - INTERVAL '30 days' AND status = 'up')
            / NULLIF(COUNT(*) FILTER (WHERE checked_at >= NOW() - INTERVAL '30 days'), 0), 2) AS uptime_30d,
      ROUND(100.0 * COUNT(*) FILTER (WHERE checked_at >= NOW() - INTERVAL '90 days' AND status = 'up')
            / NULLIF(COUNT(*) FILTER (WHERE checked_at >= NOW() - INTERVAL '90 days'), 0), 2) AS uptime_90d
    FROM check_results
    WHERE checked_at >= NOW() - INTERVAL '90 days'
    GROUP BY website_id
  ) sub
  WHERE w.id = sub.website_id;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_website_uptime() TO service_role;

-- Requires the pg_cron extension (enabled by default on Supabase projects;
-- if this errors, enable it first via Dashboard → Database → Extensions →
-- pg_cron, then re-run just the block below).
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'refresh-website-uptime',
  '*/10 * * * *',
  $$ SELECT refresh_website_uptime(); $$
);
