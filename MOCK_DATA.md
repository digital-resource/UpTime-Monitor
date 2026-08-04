# Mock Data & Service Repositories

All mock data lives in `lib/mock-data/` and is consumed via service modules in `lib/services/`.

## Data Files

### `lib/mock-data/websites.ts`
- `MOCK_WEBSITES` — 10 hand-crafted representative websites (varying status, provider, client, SSL state)
- `MOCK_WEBSITES_EXTENDED` — 100 websites (10 hand-crafted + 90 generated) for pagination testing
- Statuses covered: up, down, degraded, paused, pending
- Providers covered: rocket_net, webflow, wordpress, vercel, aws, shopify, custom_server
- Sources: cloudflare_import, webflow_import, vercel_import, manual

### `lib/mock-data/incidents.ts`
- `MOCK_INCIDENTS` — 3 incidents: 1 open (TechStart), 1 acknowledged (RetailEdge), 1 resolved (Acme)
- Each includes full `timeline` array with typed IncidentEvent records

### `lib/mock-data/alerts.ts`
- `MOCK_ALERTS` — 7 alerts across down/degraded/recovery/ssl_expiry types
- Channels: slack, email
- Statuses: delivered, sent, failed

### `lib/mock-data/integrations.ts`
- `MOCK_INTEGRATIONS` — 8 integrations: Cloudflare (connected), Rocket.net (connected), Webflow (auth_error), Slack (connected), Mailgun (connected), Vercel (not_configured), Supabase (not_configured), GitHub (not_configured)

### `lib/mock-data/users.ts`
- `MOCK_USERS` — 5 users with roles: super_admin, admin, operator (×2), viewer
- `CURRENT_USER` — the logged-in user (Alex Rivera, super_admin)

### `lib/mock-data/sync-runs.ts`
- `MOCK_SYNC_RUNS` — 3 sync runs: Cloudflare success, Rocket.net manual success, Webflow auth failure with log output

### `lib/mock-data/activity.ts`
- `MOCK_ACTIVITY` — 10 audit events: logins, website actions, sync, settings changes, user management

## Service Modules

Each service module wraps mock data in async functions with simulated network delays (150–500ms).

### `lib/services/websiteService.ts`
```typescript
websiteService.list(filters)         // PaginatedResult<Website>
websiteService.getById(id)           // Website | null
websiteService.create(payload)       // Website
websiteService.update(id, payload)   // Website
websiteService.delete(id)            // void
websiteService.runCheck(id)          // { status, message }
websiteService.pause(id)             // Website
websiteService.resume(id)            // Website
websiteService.getStats()            // { total, up, down, degraded, paused, ... }
```

`list()` supports: `search`, `status[]`, `provider[]`, `source[]`, `monitoringState[]`, `client[]`, `tags[]`, `page`, `perPage`, `sortBy`, `sortDir`.

### `lib/services/incidentService.ts`
```typescript
incidentService.list(filters)        // PaginatedResult<Incident>
incidentService.getById(id)          // Incident | null
incidentService.acknowledge(id)      // Incident
incidentService.resolve(id)          // Incident
incidentService.getActive()          // Incident[]
```

### `lib/services/alertService.ts`
```typescript
alertService.list(filters)               // PaginatedResult<Alert>
alertService.listNotificationGroups()    // NotificationGroup[]
alertService.getNotificationGroup(id)    // NotificationGroup | null
alertService.retryAlert(id)              // Alert
```

### `lib/services/integrationService.ts`
```typescript
integrationService.list()            // Integration[]
integrationService.getById(id)       // Integration | null
integrationService.testConnection(id) // { success, message }
integrationService.syncNow(id)       // SyncRun
integrationService.disconnect(id)    // void
integrationService.listSyncRuns(f)   // PaginatedResult<SyncRun>
integrationService.getSyncRun(id)    // SyncRun | null
```

## Replacing Mock Data

When Supabase is connected, replace each service implementation file with real queries. The function signatures remain identical — only the internals change. UI components do not need to be modified.
