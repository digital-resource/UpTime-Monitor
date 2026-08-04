# Application Routes

All routes live under the `app/` directory.

## Authentication Routes (`app/(auth)/`)

No sidebar or top bar. Full-page centered layouts.

| Route | Component | Description |
|---|---|---|
| `/login` | `app/(auth)/login/page.tsx` | Login form with email/password |

**Planned (future):**
- `/forgot-password` — Request password reset email
- `/reset-password` — Set new password with token
- `/verify-2fa` — Two-factor verification code entry

## Application Routes (`app/(dashboard)/`)

All require authentication. Share the sidebar + top bar shell from `app/(dashboard)/layout.tsx`.

| Route | Page | Description |
|---|---|---|
| `/` | `page.tsx` | Redirects to `/overview` |
| `/overview` | `overview/page.tsx` | KPI cards, charts, quick actions |
| `/websites` | `websites/page.tsx` | Paginated website list with filters |
| `/websites/new` | `websites/new/page.tsx` | 4-step Add Website wizard |
| `/websites/[id]` | `websites/[id]/page.tsx` | Website detail with 8 tabs |
| `/incidents` | `incidents/page.tsx` | Incident list with expandable timeline |
| `/incidents/[id]` | `incidents/[id]/page.tsx` | Full incident detail (stub) |
| `/alerts` | `alerts/page.tsx` | Alert history, notification groups |
| `/integrations` | `integrations/page.tsx` | Integration cards by category |
| `/sync-logs` | `sync-logs/page.tsx` | Sync run history with log viewer |
| `/activity` | `activity/page.tsx` | Full audit event log |
| `/reports` | `reports/page.tsx` | Report builder and export |
| `/maintenance` | `maintenance/page.tsx` | Maintenance window scheduling |
| `/users` | `users/page.tsx` | Team members and permissions |
| `/settings` | `settings/page.tsx` | Organization and system settings |
| `/profile` | `profile/page.tsx` | Current user profile (stub) |
| `/support` | `support/page.tsx` | Help and support (stub) |
