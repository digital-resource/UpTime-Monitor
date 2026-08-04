"use client";
import { useEffect, useState } from "react";
import { getSession, AuthUser } from "@/lib/auth/mockAuth";
import { PageHeader } from "@/components/shared/PageHeader";
import { User, Mail, Shield } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  useEffect(() => { getSession().then(setUser); }, []);

  function formatRole(role: string) {
    return role.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Profile" subtitle="Your account details and preferences" />
      <div className="flex-1 p-8 max-w-2xl">
        {user && (
          <div className="space-y-4">
            {/* Avatar + name card */}
            <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6 flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-blue-400">{user.avatarInitials}</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-50" style={{ fontFamily: "'Geist', sans-serif" }}>{user.name}</h2>
                <p className="text-sm text-zinc-500 mt-0.5">{user.email}</p>
                <span className="inline-flex items-center mt-2 text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold uppercase tracking-wide">
                  {formatRole(user.role)}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Account Details</h3>
              {[
                { icon: User, label: "Full Name", value: user.name },
                { icon: Mail, label: "Email Address", value: user.email },
                { icon: User, label: "Username", value: user.username },
                { icon: Shield, label: "Role", value: formatRole(user.role) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-[#27272A] last:border-0">
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-xs text-zinc-500">{label}</span>
                  </div>
                  <span className="text-sm text-zinc-300 font-mono">{value}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-zinc-600 text-center">
              To change your password or 2FA settings, contact your administrator.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
