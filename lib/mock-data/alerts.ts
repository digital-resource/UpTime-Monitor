import type { Alert } from "@/lib/types";

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

export const MOCK_ALERTS: Alert[] = [
  { id: "alt_001", websiteId: "ws_002", websiteName: "TechStart - Landing Page", incidentId: "inc_001", type: "down", channel: "slack", recipient: "#alerts-critical", status: "delivered", retryCount: 0, error: null, sentAt: hoursAgo(1.89), deliveredAt: hoursAgo(1.88), createdAt: hoursAgo(1.89) },
  { id: "alt_002", websiteId: "ws_002", websiteName: "TechStart - Landing Page", incidentId: "inc_001", type: "down", channel: "email", recipient: "team@techstart.io", status: "delivered", retryCount: 0, error: null, sentAt: hoursAgo(1.88), deliveredAt: hoursAgo(1.85), createdAt: hoursAgo(1.88) },
  { id: "alt_003", websiteId: "ws_008", websiteName: "RetailEdge - Checkout", incidentId: "inc_002", type: "down", channel: "slack", recipient: "#p1-incidents", status: "delivered", retryCount: 0, error: null, sentAt: hoursAgo(2.96), deliveredAt: hoursAgo(2.95), createdAt: hoursAgo(2.96) },
  { id: "alt_004", websiteId: "ws_008", websiteName: "RetailEdge - Checkout", incidentId: "inc_002", type: "down", channel: "email", recipient: "oncall@retailedge.com", status: "delivered", retryCount: 0, error: null, sentAt: hoursAgo(2.95), deliveredAt: hoursAgo(2.93), createdAt: hoursAgo(2.95) },
  { id: "alt_005", websiteId: "ws_003", websiteName: "GreenLeaf - Shop", incidentId: null, type: "degraded", channel: "slack", recipient: "#alerts", status: "failed", retryCount: 3, error: "Slack API rate limit exceeded", sentAt: minutesAgo(45), deliveredAt: null, createdAt: minutesAgo(45) },
  { id: "alt_006", websiteId: "ws_005", websiteName: "LocalBiz - WordPress Site", incidentId: null, type: "ssl_expiry", channel: "email", recipient: "admin@localbiz.com", status: "sent", retryCount: 0, error: null, sentAt: daysAgo(1), deliveredAt: null, createdAt: daysAgo(1) },
  { id: "alt_007", websiteId: "ws_001", websiteName: "Acme Corp - Main Website", incidentId: "inc_003", type: "recovery", channel: "slack", recipient: "#alerts-critical", status: "delivered", retryCount: 0, error: null, sentAt: daysAgo(5), deliveredAt: daysAgo(5), createdAt: daysAgo(5) },
];
