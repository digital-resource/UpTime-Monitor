-- ============================================================
-- Monitoring Hub — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── websites ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS websites (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  url                   TEXT NOT NULL UNIQUE,
  domain                TEXT NOT NULL,
  client                TEXT,
  environment           TEXT NOT NULL DEFAULT 'production',
  source                TEXT NOT NULL DEFAULT 'manual',
  provider              TEXT NOT NULL DEFAULT 'unknown',
  tags                  TEXT[] DEFAULT '{}',
  internal_notes        TEXT,
  status                TEXT NOT NULL DEFAULT 'pending',
  monitoring_state      TEXT NOT NULL DEFAULT 'enabled',
  http_status           INTEGER,
  response_time         INTEGER,
  last_checked_at       TIMESTAMPTZ,
  last_success_at       TIMESTAMPTZ,
  last_failure_at       TIMESTAMPTZ,
  consecutive_failures  INTEGER NOT NULL DEFAULT 0,
  last_error            TEXT,
  uptime_24h            NUMERIC(5,2),
  uptime_30d            NUMERIC(5,2),
  uptime_90d            NUMERIC(5,2),
  ssl                   JSONB,
  has_active_incident   BOOLEAN NOT NULL DEFAULT FALSE,
  active_incident_id    UUID,
  check_interval        INTEGER NOT NULL DEFAULT 120,
  timeout               INTEGER NOT NULL DEFAULT 30,
  failure_threshold     INTEGER NOT NULL DEFAULT 3,
  recovery_threshold    INTEGER NOT NULL DEFAULT 2,
  expected_http_status  INTEGER NOT NULL DEFAULT 200,
  follow_redirects      BOOLEAN NOT NULL DEFAULT TRUE,
  http_method           TEXT NOT NULL DEFAULT 'GET',
  headers               JSONB DEFAULT '{}',
  content_keyword       TEXT,
  ssl_monitoring        BOOLEAN NOT NULL DEFAULT TRUE,
  ssl_expiration_warning INTEGER NOT NULL DEFAULT 30,
  notification_group_id UUID,
  maintenance_window_id UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── check_results ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS check_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id    UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        TEXT NOT NULL,
  http_status   INTEGER,
  response_time INTEGER,
  error         TEXT,
  region        TEXT NOT NULL DEFAULT 'auto',
  dns_time      INTEGER,
  connect_time  INTEGER,
  tls_time      INTEGER,
  ttfb_time     INTEGER
);

-- ─── incidents ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id          UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  website_name        TEXT NOT NULL,
  website_url         TEXT NOT NULL,
  client              TEXT,
  status              TEXT NOT NULL DEFAULT 'open',
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at     TIMESTAMPTZ,
  resolved_at         TIMESTAMPTZ,
  duration            INTEGER,
  error               TEXT,
  failed_checks       INTEGER NOT NULL DEFAULT 0,
  slack_alert_sent    BOOLEAN NOT NULL DEFAULT FALSE,
  email_alert_sent    BOOLEAN NOT NULL DEFAULT FALSE,
  recovery_alert_sent BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_to         TEXT,
  internal_notes      TEXT NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── incident_events ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incident_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  message     TEXT NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata    JSONB DEFAULT '{}'
);

-- ─── alerts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id   UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  website_name TEXT NOT NULL,
  incident_id  UUID REFERENCES incidents(id) ON DELETE SET NULL,
  type         TEXT NOT NULL,
  channel      TEXT NOT NULL,
  recipient    TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'queued',
  retry_count  INTEGER NOT NULL DEFAULT 0,
  error        TEXT,
  sent_at      TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── notification_groups ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_groups (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  slack_channel           TEXT,
  email_recipients        TEXT[] DEFAULT '{}',
  escalation_rule_id      UUID,
  quiet_hours_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_start       TEXT,
  quiet_hours_end         TEXT,
  quiet_hours_timezone    TEXT NOT NULL DEFAULT 'UTC',
  maintenance_suppression BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── escalation_rules ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escalation_rules (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  steps      JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── integrations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  type                TEXT NOT NULL DEFAULT 'discovery',
  status              TEXT NOT NULL DEFAULT 'not_configured',
  last_success_at     TIMESTAMPTZ,
  last_attempt_at     TIMESTAMPTZ,
  websites_discovered INTEGER,
  websites_imported   INTEGER,
  websites_updated    INTEGER,
  websites_skipped    INTEGER,
  last_error          TEXT,
  config              JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── sync_runs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id   UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  integration_name TEXT NOT NULL,
  provider         TEXT NOT NULL,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at     TIMESTAMPTZ,
  duration         INTEGER,
  trigger          TEXT NOT NULL DEFAULT 'manual',
  result           TEXT,
  added            INTEGER NOT NULL DEFAULT 0,
  updated          INTEGER NOT NULL DEFAULT 0,
  skipped          INTEGER NOT NULL DEFAULT 0,
  failed           INTEGER NOT NULL DEFAULT 0,
  triggered_by     TEXT NOT NULL DEFAULT 'system',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── sync_logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id UUID NOT NULL REFERENCES sync_runs(id) ON DELETE CASCADE,
  level       TEXT NOT NULL DEFAULT 'info',
  message     TEXT NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata    JSONB DEFAULT '{}'
);

-- ─── maintenance_windows ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS maintenance_windows (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  website_ids               UUID[] DEFAULT '{}',
  website_names             TEXT[] DEFAULT '{}',
  start_at                  TIMESTAMPTZ NOT NULL,
  end_at                    TIMESTAMPTZ NOT NULL,
  timezone                  TEXT NOT NULL DEFAULT 'UTC',
  recurrence                TEXT NOT NULL DEFAULT 'none',
  reason                    TEXT,
  suppress_alerts           BOOLEAN NOT NULL DEFAULT TRUE,
  continue_recording_checks BOOLEAN NOT NULL DEFAULT TRUE,
  status                    TEXT NOT NULL DEFAULT 'upcoming',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── users (extends auth.users) ──────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  email               TEXT NOT NULL,
  role                TEXT NOT NULL DEFAULT 'viewer',
  avatar_url          TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at       TIMESTAMPTZ,
  two_factor_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── audit_events ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name  TEXT NOT NULL,
  action     TEXT NOT NULL,
  target     TEXT,
  target_id  TEXT,
  result     TEXT NOT NULL DEFAULT 'success',
  ip_address TEXT NOT NULL DEFAULT '0.0.0.0',
  details    TEXT,
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── settings ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── excluded_domains ────────────────────────────────────────
-- Domains a user explicitly deleted from monitoring. The Cloudflare/
-- Rocket.net/Webflow sync checks this before re-importing a domain, so a
-- deleted site doesn't silently come back on the next hourly sync just
-- because it's still a zone/site on the provider side.
CREATE TABLE IF NOT EXISTS excluded_domains (
  domain      TEXT PRIMARY KEY,
  excluded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason      TEXT
);

-- ─── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_websites_status           ON websites(status);
CREATE INDEX IF NOT EXISTS idx_websites_monitoring_state ON websites(monitoring_state);
CREATE INDEX IF NOT EXISTS idx_websites_has_incident     ON websites(has_active_incident);
CREATE INDEX IF NOT EXISTS idx_websites_domain           ON websites(domain);

CREATE INDEX IF NOT EXISTS idx_check_results_website_id ON check_results(website_id);
CREATE INDEX IF NOT EXISTS idx_check_results_checked_at ON check_results(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_results_website_checked ON check_results(website_id, checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_website_id  ON incidents(website_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status      ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_started_at  ON incidents(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_incident_events_incident_id ON incident_events(incident_id);

CREATE INDEX IF NOT EXISTS idx_alerts_website_id  ON alerts(website_id);
CREATE INDEX IF NOT EXISTS idx_alerts_incident_id ON alerts(incident_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status      ON alerts(status);

CREATE INDEX IF NOT EXISTS idx_sync_runs_integration_id ON sync_runs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_runs_started_at     ON sync_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id   ON audit_events(user_id);

-- ─── Row Level Security ──────────────────────────────────────
ALTER TABLE websites            ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_runs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE excluded_domains    ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/write everything (admin panel)
CREATE POLICY "auth_select" ON websites            FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON websites            FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON websites            FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_delete" ON websites            FOR DELETE TO authenticated USING (TRUE);

CREATE POLICY "auth_select" ON excluded_domains    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON excluded_domains    FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_delete" ON excluded_domains    FOR DELETE TO authenticated USING (TRUE);

CREATE POLICY "auth_select" ON check_results       FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON check_results       FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "auth_select" ON incidents           FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON incidents           FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON incidents           FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "auth_select" ON incident_events     FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON incident_events     FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "auth_select" ON alerts              FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON alerts              FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON alerts              FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "auth_select" ON notification_groups FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON notification_groups FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON notification_groups FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_delete" ON notification_groups FOR DELETE TO authenticated USING (TRUE);

CREATE POLICY "auth_select" ON escalation_rules    FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON escalation_rules    FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON escalation_rules    FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "auth_select" ON integrations        FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON integrations        FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON integrations        FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "auth_select" ON sync_runs           FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON sync_runs           FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "auth_select" ON sync_logs           FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON sync_logs           FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "auth_select" ON maintenance_windows FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON maintenance_windows FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "auth_update" ON maintenance_windows FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "auth_delete" ON maintenance_windows FOR DELETE TO authenticated USING (TRUE);

CREATE POLICY "auth_select" ON users               FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_update" ON users               FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "auth_select" ON audit_events        FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_insert" ON audit_events        FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "auth_select" ON settings            FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "auth_update" ON settings            FOR UPDATE TO authenticated USING (TRUE);

-- ─── Seed: integrations ──────────────────────────────────────
INSERT INTO integrations (name, slug, type, status) VALUES
  ('Cloudflare',  'cloudflare',  'discovery', 'not_configured'),
  ('Rocket.net',  'rocket_net',  'discovery', 'not_configured'),
  ('Webflow',     'webflow',     'discovery', 'not_configured'),
  ('Slack',       'slack',       'alert',     'not_configured'),
  ('Mailgun',     'mailgun',     'alert',     'not_configured')
ON CONFLICT (slug) DO NOTHING;

-- ─── Seed: settings ──────────────────────────────────────────
INSERT INTO settings (key, value) VALUES
  ('failure_threshold',   '3'),
  ('check_interval',      '120'),
  ('alert_email_to',      '""'),
  ('slack_webhook_url',   '""'),
  ('grouped_alert_min',   '5')
ON CONFLICT (key) DO NOTHING;

-- ─── updated_at trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER websites_updated_at            BEFORE UPDATE ON websites            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER incidents_updated_at           BEFORE UPDATE ON incidents           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER notification_groups_updated_at BEFORE UPDATE ON notification_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER integrations_updated_at        BEFORE UPDATE ON integrations        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER maintenance_windows_updated_at BEFORE UPDATE ON maintenance_windows FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at               BEFORE UPDATE ON users               FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER settings_updated_at            BEFORE UPDATE ON settings            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
