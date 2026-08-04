# Backend Integration Plan

This document describes how to connect Supabase and external APIs when the frontend phase is complete.

## 1. Supabase Setup

### Environment Variables (`.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Supabase Client
Create `lib/supabase/client.ts` and `lib/supabase/server.ts` using `@supabase/ssr`.

### Database Tables
Map to TypeScript types in `lib/types/index.ts`:

| Table | Type |
|---|---|
| `websites` | `Website` |
| `check_results` | `CheckResult` |
| `incidents` | `Incident` |
| `incident_events` | `IncidentEvent` |
| `alerts` | `Alert` |
| `notification_groups` | `NotificationGroup` |
| `escalation_rules` | `EscalationRule` |
| `integrations` | `Integration` |
| `sync_runs` | `SyncRun` |
| `sync_logs` | `SyncLog` |
| `maintenance_windows` | `MaintenanceWindow` |
| `users` (via auth.users) | `User` |
| `audit_events` | `AuditEvent` |

## 2. Service Layer Replacement

Each service in `lib/services/` maps cleanly to Supabase queries. Replace the mock implementation only — function signatures stay identical.

### Example: `websiteService.list()`
```typescript
// CURRENT (mock):
async list(filters) {
  await delay(300);
  let data = [...MOCK_WEBSITES_EXTENDED];
  // filter...
  return { data: paginatedData, total, page, perPage, totalPages };
}

// FUTURE (Supabase):
async list(filters) {
  let query = supabase.from('websites').select('*', { count: 'exact' });
  if (filters.search) query = query.ilike('name', `%${filters.search}%`);
  if (filters.status?.length) query = query.in('status', filters.status);
  // ...
  const { data, count, error } = await query
    .range((page - 1) * perPage, page * perPage - 1);
  return { data: data ?? [], total: count ?? 0, page, perPage, totalPages };
}
```

## 3. Authentication

Replace mock auth state with Supabase Auth:

- `app/(auth)/login/page.tsx` → call `supabase.auth.signInWithPassword()`
- `app/(dashboard)/layout.tsx` → add `supabase.auth.getSession()` check
- `components/layout/Sidebar.tsx` → replace `CURRENT_USER` with session user

### Auth Middleware (`middleware.ts`)
```typescript
import { createMiddlewareClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session && !req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return res;
}
```

## 4. External API Integrations

### Cloudflare
- API Token stored in `integrations.config.apiToken` (encrypted in Supabase Vault)
- Sync runs triggered via a Next.js API Route or Supabase Edge Function
- `POST /api/integrations/cloudflare/sync` → calls Cloudflare API, upserts to `websites`

### Rocket.net
- API credentials in `integrations.config`
- Same sync pattern as Cloudflare

### Webflow
- OAuth flow: `/api/integrations/webflow/auth` → `/api/integrations/webflow/callback`
- Token refresh handled server-side

### Slack
- OAuth: `/api/integrations/slack/auth` → `/api/integrations/slack/callback`
- Alert delivery: call Slack Incoming Webhook URL stored in `notification_groups.slack_channel`

### Mailgun
- API key in env: `MAILGUN_API_KEY`, domain: `MAILGUN_DOMAIN`
- Alert delivery via Mailgun SDK in a Supabase Edge Function or API Route

## 5. Real-time Updates

Use Supabase Realtime for live status updates:

```typescript
// In OverviewDashboard or WebsiteDetail:
const channel = supabase
  .channel('websites')
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'websites' }, 
    (payload) => updateWebsite(payload.new))
  .subscribe();
```

The `TopBar.tsx` "Live" toggle controls whether realtime subscriptions are active.

## 6. API Routes for External Triggers

Create these Next.js API routes to be called by monitoring workers:

- `POST /api/check-result` — Accept a check result from the monitoring worker
- `POST /api/incident/open` — Open a new incident
- `POST /api/incident/close` — Close an incident
- `POST /api/alert/send` — Dispatch an alert (Slack/email)
- `POST /api/sync/[provider]` — Trigger a sync run

## 7. Environment Variables (Complete List)

See `.env.example` for all required variables.
