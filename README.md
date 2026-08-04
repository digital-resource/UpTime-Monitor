# Monitoring Hub

**Enterprise Website Monitoring** — A complete frontend for managing and monitoring website uptime, incidents, alerts, and integrations.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4
- **Components:** shadcn/ui + Radix UI primitives
- **Icons:** Lucide React
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **Tables:** TanStack Table v8
- **Notifications:** Sonner
- **Fonts:** Geist (headings), Inter (body), JetBrains Mono (data)

## Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/overview`.

## Demo Login

Navigate to `/login`. Use any credentials — authentication is mocked for this frontend phase.

## Project Structure

```
app/
  (auth)/              # Auth pages (no sidebar)
    login/
  (dashboard)/         # Protected app shell
    layout.tsx         # Sidebar + TopBar shell
    overview/          # Main dashboard
    websites/          # Website management
      new/             # Add Website wizard
      [id]/            # Website detail
    incidents/
      [id]/
    alerts/
    integrations/
    sync-logs/
    activity/
    reports/
    maintenance/
    users/
    settings/
    profile/
    support/

components/
  layout/              # Sidebar, TopBar
  shared/              # PageHeader, StatCard, StatusBadge
  dashboard/           # OverviewDashboard
  websites/            # WebsitesView, WebsiteTable, WebsiteDetail, Add wizard
  incidents/           # IncidentsView
  alerts/              # AlertsView
  integrations/        # IntegrationsView
  sync-logs/           # SyncLogsView
  activity/            # ActivityView
  reports/             # ReportsView
  maintenance/         # MaintenanceView
  users/               # UsersView
  settings/            # SettingsView
  ui/                  # shadcn/ui components

lib/
  types/               # All TypeScript domain types
  mock-data/           # Typed mock data repositories
  services/            # Data access layer (currently mock)
  utils/               # formatters, cn helper
```

## Backend Integration

All data access goes through service modules in `lib/services/`. Replace mock implementations with Supabase queries when ready. See `BACKEND_INTEGRATION_PLAN.md` for details.
