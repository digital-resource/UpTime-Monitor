"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, RefreshCw, Bell, Command, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getSession, logout, AuthUser } from "@/lib/auth/mockAuth";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/formatters";

interface TopBarProps {
  onMenuClick?: () => void;
}

interface RecentAlert {
  id: string;
  websiteName: string;
  type: string;
  status: string;
  createdAt: string;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const router = useRouter();
  const [isLive, setIsLive] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([]);

  useEffect(() => {
    getSession().then(setUser);

    const db = createClient();
    db.from("websites").select("last_checked_at").order("last_checked_at", { ascending: false }).limit(1).single()
      .then(({ data }) => setLastSync((data?.last_checked_at as string | undefined) ?? null));
    db.from("alerts").select("id, website_name, type, status, created_at").order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => setRecentAlerts((data ?? []).map((a) => ({
        id: a.id as string,
        websiteName: a.website_name as string,
        type: a.type as string,
        status: a.status as string,
        createdAt: a.created_at as string,
      }))));
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    window.location.reload();
  }, []);

  return (
    <header className="h-14 flex-shrink-0 flex items-center gap-4 px-4 lg:px-6 bg-[#09090B] border-b border-[#27272A]">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors flex-shrink-0"
        aria-label="Open navigation"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search websites, incidents, users..."
            className={cn(
              "w-full h-8 pl-9 pr-16 rounded-lg text-sm",
              "bg-[#18181B] border border-[#27272A]",
              "text-zinc-300 placeholder:text-zinc-600",
              "focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50",
              "transition-colors"
            )}
            style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
          />
          <div className="absolute right-2.5 flex items-center gap-0.5 pointer-events-none">
            <kbd className="flex items-center gap-0.5 text-[10px] text-zinc-600 bg-[#27272A] px-1 py-0.5 rounded border border-zinc-700">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </kbd>
          </div>
        </div>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Last sync */}
        <span
          className="text-xs text-zinc-500 hidden sm:block"
          style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
        >
          Last sync: {lastSync ? formatRelativeTime(lastSync) : "—"}
        </span>

        <div className="w-px h-5 bg-[#27272A] hidden sm:block" />

        {/* Live toggle */}
        <button
          onClick={() => setIsLive((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border",
            isLive
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15"
              : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
          )}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              isLive ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
            )}
          />
          <span>Live</span>
        </button>

        {/* Refresh button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          onClick={handleRefresh}
          aria-label="Refresh data"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")}
          />
        </Button>

        {/* Notification bell */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 relative"
              aria-label="Notifications"
            >
              <Bell className="w-3.5 h-3.5" />
              {recentAlerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white leading-none">
                  {recentAlerts.length > 9 ? "9+" : recentAlerts.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#18181B] border-[#27272A] text-zinc-300 text-sm w-72">
            <div className="px-3 py-2 border-b border-[#27272A]">
              <p className="text-xs font-medium text-zinc-200">Recent Alerts</p>
            </div>
            {recentAlerts.length === 0 ? (
              <p className="px-3 py-4 text-xs text-zinc-500 text-center">No recent alerts</p>
            ) : (
              recentAlerts.map((a) => (
                <DropdownMenuItem key={a.id} asChild>
                  <Link href="/alerts" className="flex flex-col items-start gap-0.5 py-2">
                    <span className="flex items-center gap-1.5 text-xs text-zinc-200">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full flex-shrink-0",
                        a.type === "recovery" ? "bg-emerald-400" : "bg-rose-400"
                      )} />
                      {a.websiteName}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {a.type === "recovery" ? "Recovered" : "Went down"} · {formatRelativeTime(a.createdAt)}
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/alerts" className="text-xs text-blue-400 justify-center">View all alerts</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-[#27272A]" />

        {/* User avatar / dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
              <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <span className="text-[10px] font-semibold text-blue-400">{user?.avatarInitials ?? "?"}</span>
              </div>
              <span className="text-xs text-zinc-400 hidden md:block">{user?.name ?? ""}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#18181B] border-[#27272A] text-zinc-300 text-sm w-48">
            <div className="px-3 py-2 border-b border-[#27272A]">
              <p className="text-xs font-medium text-zinc-200">{user?.name}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{user?.email}</p>
            </div>
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#27272A]" />
            <DropdownMenuItem
              onClick={() => { logout(); router.push("/login"); }}
              className="text-rose-400 focus:text-rose-400"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
