import type { User } from "@/lib/types";

const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();

export const MOCK_USERS: User[] = [
  {
    id: "usr_001",
    name: "Alex Rivera",
    email: "alex.rivera@company.com",
    role: "super_admin",
    avatarUrl: null,
    isActive: true,
    lastLoginAt: minutesAgo(5),
    twoFactorEnabled: true,
    createdAt: daysAgo(365),
    updatedAt: minutesAgo(5),
  },
  {
    id: "usr_002",
    name: "Sarah Chen",
    email: "sarah.chen@company.com",
    role: "admin",
    avatarUrl: null,
    isActive: true,
    lastLoginAt: minutesAgo(90),
    twoFactorEnabled: true,
    createdAt: daysAgo(180),
    updatedAt: minutesAgo(90),
  },
  {
    id: "usr_003",
    name: "Marcus Johnson",
    email: "marcus.johnson@company.com",
    role: "operator",
    avatarUrl: null,
    isActive: true,
    lastLoginAt: minutesAgo(30),
    twoFactorEnabled: false,
    createdAt: daysAgo(90),
    updatedAt: minutesAgo(30),
  },
  {
    id: "usr_004",
    name: "Priya Patel",
    email: "priya.patel@company.com",
    role: "operator",
    avatarUrl: null,
    isActive: true,
    lastLoginAt: daysAgo(1),
    twoFactorEnabled: true,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(1),
  },
  {
    id: "usr_005",
    name: "Tom Bradley",
    email: "tom.bradley@company.com",
    role: "viewer",
    avatarUrl: null,
    isActive: false,
    lastLoginAt: daysAgo(30),
    twoFactorEnabled: false,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(30),
  },
];

export const CURRENT_USER = MOCK_USERS[0];
