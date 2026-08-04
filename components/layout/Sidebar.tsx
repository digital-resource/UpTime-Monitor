"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Globe,
  AlertCircle,
  Bell,
  Puzzle,
  RefreshCw,
  Activity,
  BarChart3,
  Clock,
  Users,
  Settings,
  LifeBuoy,
  LogOut,
  Monitor,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { getSession, logout, AuthUser } from "@/lib/auth/mockAuth";

interface NavItemDef {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeClass?: string;
}

const monitoringNav: NavItemDef[] = [
  {
    label: "Overview",
    href: "/overview",
    icon: LayoutDashboard,
  },
  {
    label: "Websites",
    href: "/websites",
    icon: Globe,
    badgeClass: "bg-zinc-800 text-zinc-400 border-zinc-700",
  },
  {
    label: "Incidents",
    href: "/incidents",
    icon: AlertCircle,
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  },
  {
    label: "Alerts",
    href: "/alerts",
    icon: Bell,
  },
  {
    label: "Integrations",
    href: "/integrations",
    icon: Puzzle,
  },
  {
    label: "Sync Logs",
    href: "/sync-logs",
    icon: RefreshCw,
  },
  {
    label: "Activity Log",
    href: "/activity",
    icon: Activity,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    label: "Maintenance",
    href: "/maintenance",
    icon: Clock,
  },
];

const adminNav: NavItemDef[] = [
  {
    label: "Users",
    href: "/users",
    icon: Users,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    label: "Support",
    href: "/support",
    icon: LifeBuoy,
  },
];

function NavLink({
  item,
  active,
  badge,
}: {
  item: NavItemDef;
  active: boolean;
  badge?: string;
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group border",
        active
          ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 border-transparent"
      )}
    >
      <item.icon
        className={cn(
          "w-4 h-4 flex-shrink-0 transition-colors",
          active
            ? "text-blue-400"
            : "text-zinc-500 group-hover:text-zinc-300"
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {badge && (
        <Badge
          className={cn(
            "h-5 min-w-[20px] text-[10px] px-1.5 font-medium border rounded-md",
            active
              ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
              : item.badgeClass
          )}
        >
          {badge}
        </Badge>
      )}
    </Link>
  );
}

function formatRole(role: string) {
  return role.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [websiteCount, setWebsiteCount] = useState<number | null>(null);
  const [activeIncidentCount, setActiveIncidentCount] = useState<number | null>(null);

  useEffect(() => {
    getSession().then(setCurrentUser);

    const db = createClient();
    db.from("websites").select("id", { count: "exact", head: true })
      .then(({ count }) => setWebsiteCount(count ?? 0));
    db.from("incidents").select("id", { count: "exact", head: true }).eq("status", "open")
      .then(({ count }) => setActiveIncidentCount(count ?? 0));
  }, []);

  const navBadges: Record<string, string | undefined> = {
    "/websites":  websiteCount !== null ? String(websiteCount) : undefined,
    "/incidents": activeIncidentCount !== null ? String(activeIncidentCount) : undefined,
  };

  function checkActive(href: string) {
    if (href === "/overview") {
      return (
        pathname === "/" ||
        pathname === "/overview" ||
        pathname.startsWith("/overview/")
      );
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="flex flex-col w-64 h-full bg-[#18181B] border-r border-[#27272A]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#27272A] flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-600/25">
          <Monitor className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-semibold text-zinc-50 leading-none truncate"
            style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}
          >
            Monitoring Hub
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
            Enterprise Website Monitoring
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex-shrink-0"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {/* Monitoring section */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider px-3 mb-1.5">
            Monitoring
          </p>
          <div className="space-y-0.5">
            {monitoringNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={checkActive(item.href)}
                badge={navBadges[item.href]}
              />
            ))}
          </div>
        </div>

        {/* Administration section */}
        <div>
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider px-3 mb-1.5">
            Administration
          </p>
          <div className="space-y-0.5">
            {adminNav.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={checkActive(item.href)}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* User footer */}
      <div className="px-3 pb-3 pt-3 border-t border-[#27272A] flex-shrink-0">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors border w-full mb-0.5",
            checkActive("/profile")
              ? "bg-blue-600/10 border-blue-500/20 text-blue-400"
              : "hover:bg-zinc-800 border-transparent"
          )}
        >
          <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-blue-400 tracking-tight">
              {currentUser?.avatarInitials ?? "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-zinc-200 truncate">
              {currentUser?.name ?? ""}
            </p>
            <p className="text-[10px] text-zinc-500 truncate">
              {currentUser ? formatRole(currentUser.role) : ""}
            </p>
          </div>
        </Link>
        <button
          onClick={() => { logout(); router.push("/login"); }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
