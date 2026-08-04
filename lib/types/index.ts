// ============================================================
// CORE DOMAIN TYPES
// ============================================================

export type WebsiteStatus =
  | "up"
  | "down"
  | "degraded"
  | "pending"
  | "never_checked"
  | "paused"
  | "disabled"
  | "maintenance"
  | "unknown";

export type MonitoringState = "enabled" | "paused" | "disabled";

export type Environment = "production" | "staging" | "development" | "preview" | "internal";

export type Provider =
  | "rocket_net"
  | "webflow"
  | "wordpress"
  | "wp_engine"
  | "siteground"
  | "cloudways"
  | "squarespace"
  | "wix"
  | "shopify"
  | "vercel"
  | "aws"
  | "custom_server"
  | "unknown"
  | "other";

export type Source =
  | "manual"
  | "cloudflare_import"
  | "rocket_net_import"
  | "webflow_import"
  | "vercel_import"
  | "github_import"
  | "api";

export type HttpMethod = "GET" | "HEAD" | "POST";

export interface SslInfo {
  valid: boolean;
  expiresAt: string | null;
  daysRemaining: number | null;
  issuer: string | null;
  grade: "A+" | "A" | "B" | "C" | "F" | "unknown";
  warningThreshold: number;
}

export interface Website {
  id: string;
  name: string;
  url: string;
  domain: string;
  client: string | null;
  environment: Environment;
  source: Source;
  provider: Provider;
  tags: string[];
  internalNotes: string | null;
  status: WebsiteStatus;
  monitoringState: MonitoringState;
  httpStatus: number | null;
  responseTime: number | null;
  lastCheckedAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  consecutiveFailures: number;
  lastError: string | null;
  uptime24h: number | null;
  uptime30d: number | null;
  uptime90d: number | null;
  ssl: SslInfo | null;
  hasActiveIncident: boolean;
  activeIncidentId: string | null;
  checkInterval: number; // seconds
  timeout: number; // seconds
  failureThreshold: number;
  recoveryThreshold: number;
  expectedHttpStatus: number;
  followRedirects: boolean;
  httpMethod: HttpMethod;
  headers: Record<string, string>;
  contentKeyword: string | null;
  sslMonitoring: boolean;
  sslExpirationWarning: number; // days
  notificationGroupId: string | null;
  maintenanceWindowId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckResult {
  id: string;
  websiteId: string;
  checkedAt: string;
  status: WebsiteStatus;
  httpStatus: number | null;
  responseTime: number | null;
  error: string | null;
  region: string;
  dnsTime: number | null;
  connectTime: number | null;
  tlsTime: number | null;
  ttfbTime: number | null;
}

export type IncidentStatus = "open" | "acknowledged" | "resolved";

export interface Incident {
  id: string;
  websiteId: string;
  websiteName: string;
  websiteUrl: string;
  client: string | null;
  status: IncidentStatus;
  startedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  duration: number | null; // seconds
  error: string | null;
  failedChecks: number;
  slackAlertSent: boolean;
  emailAlertSent: boolean;
  recoveryAlertSent: boolean;
  assignedTo: string | null;
  internalNotes: string;
  timeline: IncidentEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface IncidentEvent {
  id: string;
  incidentId: string;
  type: string;
  message: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export type AlertStatus = "queued" | "sent" | "delivered" | "failed" | "retrying" | "suppressed" | "grouped";
export type AlertType = "down" | "degraded" | "recovery" | "ssl_expiry" | "maintenance_start" | "maintenance_end";
export type AlertChannel = "slack" | "email";

export interface Alert {
  id: string;
  websiteId: string;
  websiteName: string;
  incidentId: string | null;
  type: AlertType;
  channel: AlertChannel;
  recipient: string;
  status: AlertStatus;
  retryCount: number;
  error: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface NotificationGroup {
  id: string;
  name: string;
  slackChannel: string | null;
  emailRecipients: string[];
  escalationRuleId: string | null;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursTimezone: string;
  maintenanceSuppression: boolean;
  websiteCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EscalationRule {
  id: string;
  name: string;
  steps: EscalationStep[];
  createdAt: string;
}

export interface EscalationStep {
  id: string;
  delayMinutes: number;
  channel: AlertChannel;
  recipient: string;
}

export type IntegrationStatus =
  | "connected"
  | "not_configured"
  | "syncing"
  | "auth_error"
  | "rate_limited"
  | "partial_sync"
  | "connection_failed"
  | "disabled"
  | "last_sync_failed";

export type IntegrationType = "discovery" | "alert" | "infrastructure";

export interface Integration {
  id: string;
  name: string;
  slug: string;
  type: IntegrationType;
  status: IntegrationStatus;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  websitesDiscovered: number | null;
  websitesImported: number | null;
  websitesUpdated: number | null;
  websitesSkipped: number | null;
  lastError: string | null;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type SyncTrigger = "manual" | "scheduled" | "webhook";
export type SyncResult = "success" | "partial" | "failed" | "cancelled";

export interface SyncRun {
  id: string;
  integrationId: string;
  integrationName: string;
  provider: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null; // seconds
  trigger: SyncTrigger;
  result: SyncResult | null;
  added: number;
  updated: number;
  skipped: number;
  failed: number;
  triggeredBy: string;
  logs: SyncLog[];
  createdAt: string;
}

export interface SyncLog {
  id: string;
  syncRunId: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface MaintenanceWindow {
  id: string;
  name: string;
  websiteIds: string[];
  websiteNames: string[];
  startAt: string;
  endAt: string;
  timezone: string;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  reason: string | null;
  suppressAlerts: boolean;
  continueRecordingChecks: boolean;
  status: "upcoming" | "active" | "completed";
  createdAt: string;
  updatedAt: string;
}

export type UserRole = "super_admin" | "admin" | "operator" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string | null;
  targetId: string | null;
  result: "success" | "failure";
  ipAddress: string;
  details: string | null;
  timestamp: string;
}

export type ReportType =
  | "overall_uptime"
  | "client_uptime"
  | "website_uptime"
  | "incident_history"
  | "downtime_duration"
  | "response_time"
  | "ssl_expiration"
  | "alert_delivery";

export interface Report {
  id: string;
  name: string;
  type: ReportType;
  filters: ReportFilters;
  createdAt: string;
  generatedAt: string | null;
  status: "pending" | "generating" | "ready" | "failed";
}

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  clientIds: string[];
  websiteIds: string[];
  providerIds: string[];
  sourcIds: string[];
  tags: string[];
  statuses: string[];
}

// ============================================================
// API / SERVICE TYPES
// ============================================================

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface FilterParams {
  search?: string;
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface WebsiteFilters extends FilterParams {
  status?: WebsiteStatus[];
  source?: Source[];
  provider?: Provider[];
  client?: string[];
  tags?: string[];
  sslState?: "valid" | "expiring" | "expired" | "unknown";
  monitoringState?: MonitoringState[];
  incidentState?: "active" | "none";
  lastChecked?: "never" | "1h" | "24h" | "7d";
  uptimeMin?: number;
  uptimeMax?: number;
}

// ============================================================
// FORM TYPES
// ============================================================

export interface AddWebsiteFormData {
  // Step 1
  name: string;
  url: string;
  client: string;
  environment: Environment;
  source: Source;
  provider: Provider;
  tags: string[];
  internalNotes: string;
  // Step 2
  monitoringEnabled: boolean;
  checkInterval: number;
  timeout: number;
  failureThreshold: number;
  recoveryThreshold: number;
  expectedHttpStatus: number;
  followRedirects: boolean;
  httpMethod: HttpMethod;
  headers: Record<string, string>;
  contentKeyword: string;
  sslMonitoring: boolean;
  sslExpirationWarning: number;
  // Step 3
  slackAlerts: boolean;
  emailAlerts: boolean;
  recoveryAlerts: boolean;
  notificationGroupId: string;
  emailRecipients: string[];
  slackChannel: string;
  escalationRuleId: string;
  quietHoursEnabled: boolean;
  maintenanceSuppression: boolean;
}
