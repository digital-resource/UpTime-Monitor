# Shared Components

## Layout Components (`components/layout/`)

### `Sidebar.tsx`
Fixed left navigation sidebar (w-64). Renders:
- Brand logo (Monitor icon + "Monitoring Hub" / "Enterprise Website Monitoring")
- Monitoring section: Overview, Websites (with count badge), Incidents (with active-incident badge), Alerts, Integrations, Sync Logs, Activity Log, Reports, Maintenance
- Administration section: Users, Settings, Support
- Footer: current user avatar, name, role, sign-out link

Active state: `bg-blue-600/10 border border-blue-500/20 text-blue-400`

### `TopBar.tsx`
56px utility bar across the top of the content area. Contains:
- Global search input with Cmd+K hint (JetBrains Mono)
- "Last sync: Xm ago" timestamp
- Live/paused toggle with animated green dot
- Refresh button with spin animation
- Notification bell with unread badge
- User menu button

### `Header.tsx`
Legacy header component (kept for reference). Use `PageHeader` for new pages.

## Shared Components (`components/shared/`)

### `PageHeader.tsx`
Standard page header with:
- `title` (Geist font, text-2xl font-semibold)
- `subtitle` (text-sm text-zinc-500)
- `actions` slot (right-aligned buttons)
- `breadcrumb` (optional navigation trail)

Usage:
```tsx
<PageHeader
  title="Websites"
  subtitle="Manage your monitored websites"
  actions={<Button>Add Website</Button>}
/>
```

### `StatusBadge.tsx` (`components/websites/StatusBadge.tsx`)
Pill badge for WebsiteStatus values. Props:
- `status: WebsiteStatus`
- `showDot?: boolean` (default: true)
- `size?: "sm" | "md"`

Colors from `getStatusBgColor()` in `lib/utils/formatters.ts`.

### `StatCard.tsx`
Simple metric card with label, value, optional trend, and optional icon.

## Feature Components

### `components/dashboard/OverviewDashboard.tsx`
Full overview page content with:
- 2×4 KPI card grid (loaded from `websiteService.getStats()`)
- Response time AreaChart (Recharts) with period tabs and avg/P95 toggle
- Current Problems panel + Recent Activity feed
- Uptime Trend + Incident Trend charts
- Provider Distribution bars
- Recently Checked Websites table
- Quick Actions grid

### `components/websites/`
- `WebsitesView.tsx` — Main list page with search, filter bar, sync/export actions
- `WebsiteTable.tsx` — TanStack Table with 13 columns, sorting, pagination, bulk actions
- `WebsiteFilters.tsx` — Filter panel with status/provider/source/monitoring-state/SSL filters + active filter chips
- `WebsiteRow.tsx` — Single table row with all columns and actions dropdown
- `WebsiteDetail.tsx` — Tabbed detail page (Overview, Check History + 6 stubs)
- `StatusBadge.tsx` — Pill status badge

### `components/incidents/IncidentsView.tsx`
Incidents list with status tabs (All/Active/Acknowledged/Resolved), full table, expandable incident timeline rows, side-sheet detail with notes and assign user.

### `components/alerts/AlertsView.tsx`
5-tab alerts page: Alert History table, Notification Groups card grid + create dialog, Escalation Rules (stub), Quiet Hours (stub), Templates (stub).

### `components/integrations/IntegrationsView.tsx`
3-section integration cards (Website Discovery, Alert Delivery, Infrastructure). Each card shows status badge, sync stats, and contextual actions.

### `components/sync-logs/SyncLogsView.tsx`
Sync run table with log viewer side-sheet. Dark monospace log output with colored INFO/WARN/ERROR prefixes.

### `components/reports/ReportsView.tsx`
Report type card grid. Generate modal with date range presets, filters, and format selector. Export history list.

### `components/maintenance/MaintenanceView.tsx`
Maintenance window table with status filter tabs. Add/Edit dialog with website multi-select, recurrence, timezone, and alert suppression toggles.

### `components/users/UsersView.tsx`
Team member table with role-colored avatars, 2FA indicators, action dropdown. Invite User dialog with role descriptions. Collapsible permission matrix.

### `components/settings/SettingsView.tsx`
Sidebar-within-page settings layout with 6 sections: General, Monitoring, Alerts, Security, Data Retention, Danger Zone (with typed confirmation dialogs for destructive actions).

## UI Primitives (`components/ui/`)

All from shadcn/ui: `alert`, `badge`, `button`, `card`, `checkbox`, `command`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `progress`, `select`, `separator`, `sheet`, `skeleton`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `tooltip`.
