import type { AuditEvent } from "@/lib/types";

const now = new Date();
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60000).toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

export const MOCK_ACTIVITY: AuditEvent[] = [
  { id: "ae_001", userId: "usr_001", userName: "Alex Rivera", action: "Manual Check", target: "Acme Corp - Main Website", targetId: "ws_001", result: "success", ipAddress: "192.168.1.10", details: "Manual check triggered from overview page", timestamp: minutesAgo(5) },
  { id: "ae_002", userId: "usr_002", userName: "Sarah Chen", action: "Incident Acknowledged", target: "TechStart - Landing Page", targetId: "inc_001", result: "success", ipAddress: "10.0.1.22", details: "Incident INC-001 acknowledged", timestamp: minutesAgo(90) },
  { id: "ae_003", userId: "usr_001", userName: "Alex Rivera", action: "Website Added", target: "NovaTech - API Docs", targetId: "ws_006", result: "success", ipAddress: "192.168.1.10", details: "Website added manually", timestamp: hoursAgo(3) },
  { id: "ae_004", userId: "usr_003", userName: "Marcus Johnson", action: "Sync Started", target: "Rocket.net", targetId: "int_002", result: "success", ipAddress: "10.0.1.45", details: "Manual sync triggered for Rocket.net integration", timestamp: hoursAgo(1) },
  { id: "ae_005", userId: "usr_001", userName: "Alex Rivera", action: "Settings Changed", target: "Monitoring Settings", targetId: null, result: "success", ipAddress: "192.168.1.10", details: "Default check interval changed from 5m to 2m", timestamp: daysAgo(1) },
  { id: "ae_006", userId: "usr_002", userName: "Sarah Chen", action: "Login", target: null, targetId: null, result: "success", ipAddress: "10.0.1.22", details: "Successful login via password", timestamp: minutesAgo(90) },
  { id: "ae_007", userId: "usr_004", userName: "Priya Patel", action: "Monitoring Paused", target: "LocalBiz - WordPress Site", targetId: "ws_005", result: "success", ipAddress: "10.0.1.67", details: "Monitoring paused for scheduled maintenance", timestamp: daysAgo(2) },
  { id: "ae_008", userId: "usr_001", userName: "Alex Rivera", action: "Integration Connected", target: "Cloudflare", targetId: "int_001", result: "success", ipAddress: "192.168.1.10", details: "Cloudflare integration connected via API token", timestamp: daysAgo(90) },
  { id: "ae_009", userId: "usr_005", userName: "Tom Bradley", action: "Failed Login", target: null, targetId: null, result: "failure", ipAddress: "203.0.113.5", details: "Invalid credentials. Account locked after 5 attempts.", timestamp: daysAgo(30) },
  { id: "ae_010", userId: "usr_001", userName: "Alex Rivera", action: "User Added", target: "Priya Patel", targetId: "usr_004", result: "success", ipAddress: "192.168.1.10", details: "New user invited with Operator role", timestamp: daysAgo(60) },
];
