"use client";

import { Bell, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-[#27272A] bg-[#09090B]">
      <div>
        <h1 className="text-xl font-semibold text-zinc-50 font-display">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <div className="relative">
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-100 relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
          </Button>
        </div>
      </div>
    </header>
  );
}
