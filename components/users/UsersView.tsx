"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import {
  Shield,
  ShieldCheck,
  Plus,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Check,
  Minus,
  Loader2,
} from "lucide-react";
import type { UserRole, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string; avatarBg: string; avatarText: string }> = {
  super_admin: {
    label: "Super Admin",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    avatarBg: "bg-violet-600/20 border-violet-500/20",
    avatarText: "text-violet-400",
  },
  admin: {
    label: "Admin",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    avatarBg: "bg-blue-600/20 border-blue-500/20",
    avatarText: "text-blue-400",
  },
  operator: {
    label: "Operator",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    avatarBg: "bg-emerald-600/20 border-emerald-500/20",
    avatarText: "text-emerald-400",
  },
  viewer: {
    label: "Viewer",
    color: "text-zinc-400",
    bg: "bg-zinc-800 border-zinc-700",
    avatarBg: "bg-zinc-700/30 border-zinc-600",
    avatarText: "text-zinc-400",
  },
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  super_admin: "Full access including billing and organization settings",
  admin: "Manage websites, users (except admins), and all features",
  operator: "Manage websites, run checks, acknowledge incidents",
  viewer: "Read-only access to all data",
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// Map Supabase row (snake_case) -> User (camelCase)
function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as UserRole,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    isActive: row.is_active as boolean,
    lastLoginAt: (row.last_login_at as string | null) ?? null,
    twoFactorEnabled: (row.two_factor_enabled as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string) ?? (row.created_at as string),
  };
}

interface InviteDialogProps {
  open: boolean;
  onClose: () => void;
  onInvited: (user: User) => void;
}

function InviteDialog({ open, onClose, onInvited }: InviteDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), role }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to invite user");
        return;
      }
      onInvited(rowToUser(json.user));
      toast.success("Invitation sent", { description: `${name} has been invited as ${ROLE_CONFIG[role].label}` });
      setName("");
      setEmail("");
      setRole("viewer");
      onClose();
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#18181B] border-[#27272A] text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">Invite User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Full Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="bg-[#27272A] border-[#3F3F46] text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
              className="bg-[#27272A] border-[#3F3F46] text-zinc-100 placeholder:text-zinc-600"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-zinc-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#18181B] border-[#27272A]">
                {(["super_admin", "admin", "operator", "viewer"] as UserRole[]).map((r) => (
                  <SelectItem key={r} value={r} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">
                    {ROLE_CONFIG[r].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-zinc-500 mt-1">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="border-[#27272A] bg-transparent text-zinc-300 hover:bg-zinc-800">
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {sending ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface EditRoleDialogProps {
  user: User | null;
  onClose: () => void;
  onSaved: (id: string, role: UserRole) => void;
}

function EditRoleDialog({ user, onClose, onSaved }: EditRoleDialogProps) {
  const [role, setRole] = useState<UserRole>(user?.role ?? "viewer");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setRole(user.role);
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("users").update({ role }).eq("id", user.id);
      if (error) {
        toast.error("Failed to update role");
        return;
      }
      onSaved(user.id, role);
      toast.success("Role updated", { description: `${user.name} is now ${ROLE_CONFIG[role].label}` });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#18181B] border-[#27272A] text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">Edit Role</DialogTitle>
        </DialogHeader>
        {user && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0", ROLE_CONFIG[user.role].avatarBg)}>
                <span className={cn("text-[10px] font-bold", ROLE_CONFIG[user.role].avatarText)}>
                  {getInitials(user.name)}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-100">{user.name}</p>
                <p className="text-xs text-zinc-500">{user.email}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger className="bg-[#27272A] border-[#3F3F46] text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#18181B] border-[#27272A]">
                  {(["super_admin", "admin", "operator", "viewer"] as UserRole[]).map((r) => (
                    <SelectItem key={r} value={r} className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100">
                      {ROLE_CONFIG[r].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-zinc-500 mt-1">{ROLE_DESCRIPTIONS[role]}</p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose} className="border-[#27272A] bg-transparent text-zinc-300 hover:bg-zinc-800">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || role === user.role} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving ? "Saving..." : "Save Role"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const PERMISSIONS: { label: string; super_admin: boolean; admin: boolean; operator: boolean; viewer: boolean }[] = [
  { label: "View Websites", super_admin: true, admin: true, operator: true, viewer: true },
  { label: "Add/Edit Websites", super_admin: true, admin: true, operator: true, viewer: false },
  { label: "Delete Websites", super_admin: true, admin: true, operator: false, viewer: false },
  { label: "Run Checks", super_admin: true, admin: true, operator: true, viewer: false },
  { label: "Manage Incidents", super_admin: true, admin: true, operator: true, viewer: false },
  { label: "Manage Alerts", super_admin: true, admin: true, operator: true, viewer: false },
  { label: "Manage Integrations", super_admin: true, admin: true, operator: false, viewer: false },
  { label: "View Reports", super_admin: true, admin: true, operator: true, viewer: true },
  { label: "Manage Users", super_admin: true, admin: true, operator: false, viewer: false },
  { label: "Organization Settings", super_admin: true, admin: false, operator: false, viewer: false },
];

function PermissionCell({ allowed }: { allowed: boolean }) {
  return allowed ? (
    <span className="inline-flex items-center justify-center w-6 h-6">
      <Check className="w-4 h-4 text-emerald-400" />
    </span>
  ) : (
    <span className="inline-flex items-center justify-center w-6 h-6">
      <Minus className="w-4 h-4 text-zinc-700" />
    </span>
  );
}

export function UsersView() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to load users");
        } else {
          setUsers((data ?? []).map(rowToUser));
        }
        setLoading(false);
      });
  }, []);

  const total = users.length;
  const active = users.filter((u) => u.isActive).length;
  const inactive = users.filter((u) => !u.isActive).length;
  const twofa = users.filter((u) => u.twoFactorEnabled).length;

  const STATS = [
    { label: "Total Users", value: total },
    { label: "Active", value: active },
    { label: "Inactive", value: inactive },
    { label: "2FA Enabled", value: twofa },
  ];

  function handleInvited(user: User) {
    setUsers((prev) => [user, ...prev]);
  }

  async function toggleActive(id: string) {
    const user = users.find((u) => u.id === id);
    if (!user) return;
    const newIsActive = !user.isActive;
    // Optimistic update
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isActive: newIsActive } : u));
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ is_active: newIsActive })
      .eq("id", id);
    if (error) {
      toast.error("Failed to update user");
      // Revert
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isActive: user.isActive } : u));
    } else {
      toast.success(newIsActive ? "User activated" : "User deactivated");
    }
  }

  function handleRoleSaved(id: string, role: UserRole) {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, role } : u));
  }

  async function handleResetPassword(user: User) {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error("Failed to send reset email");
    } else {
      toast.success("Password reset email sent", { description: user.email });
    }
  }

  async function handleDelete(id: string) {
    // Optimistic update
    const prev = users;
    setUsers((u) => u.filter((x) => x.id !== id));
    const supabase = createClient();
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete user");
      setUsers(prev);
    } else {
      toast.success("User removed");
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[#27272A] flex items-start justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50" style={{ fontFamily: "'Geist', 'Inter', sans-serif" }}>
            Users
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Manage team access and permissions</p>
        </div>
        <Button
          onClick={() => setInviteOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 text-sm mt-0.5"
        >
          <Plus className="w-4 h-4" />
          Invite User
        </Button>
      </div>

      <div className="flex-1 overflow-auto px-8 py-6 space-y-6">
        {/* Stats row */}
        <div className="flex items-center gap-3 flex-wrap">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-full"
            >
              <span className="text-xs text-zinc-500">{s.label}:</span>
              <span className="text-sm font-semibold text-zinc-100">{s.value}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3">
              <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
              <span className="text-sm text-zinc-500">Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-sm font-medium text-zinc-400">No users found</p>
              <p className="text-xs text-zinc-600">Invite a team member to get started</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#27272A]">
                  {["User", "Role", "Status", "Last Login", "2FA", "Created", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const role = ROLE_CONFIG[user.role];
                  return (
                    <tr key={user.id} className="border-b border-[#27272A] hover:bg-zinc-800/50 transition-colors last:border-0">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0", role.avatarBg)}>
                            <span className={cn("text-[10px] font-bold", role.avatarText)}>
                              {getInitials(user.name)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-100">{user.name}</p>
                            <p className="text-xs text-zinc-500 mt-0.5">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", role.bg, role.color)}>
                          {role.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 text-xs",
                          user.isActive ? "text-emerald-400" : "text-zinc-500"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", user.isActive ? "bg-emerald-400" : "bg-zinc-600")} />
                          {user.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs text-zinc-400">{formatRelativeTime(user.lastLoginAt)}</p>
                      </td>
                      <td className="px-4 py-4">
                        {user.twoFactorEnabled ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Shield className="w-4 h-4 text-zinc-600" />
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs text-zinc-500">{formatRelativeTime(user.createdAt)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-[#18181B] border-[#27272A] text-zinc-300" align="end">
                            <DropdownMenuItem
                              className="hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer"
                              onSelect={() => setEditingUser(user)}
                            >
                              Edit Role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer"
                              onSelect={() => handleResetPassword(user)}
                            >
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer"
                              onSelect={() => toast.info("Force logout — coming soon")}
                            >
                              Force Logout
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[#27272A]" />
                            <DropdownMenuItem
                              className="hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer"
                              onSelect={() => toggleActive(user.id)}
                            >
                              {user.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="hover:bg-rose-500/10 text-rose-400 cursor-pointer"
                              onSelect={() => handleDelete(user.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Permission Matrix */}
        <div className="bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden">
          <button
            onClick={() => setMatrixOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-800/30 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-zinc-100 text-left">Permission Matrix</p>
              <p className="text-xs text-zinc-500 mt-0.5 text-left">Role-based access control overview</p>
            </div>
            {matrixOpen ? (
              <ChevronUp className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            )}
          </button>

          {matrixOpen && (
            <div className="border-t border-[#27272A] overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#27272A]">
                    <th className="px-5 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Permission</th>
                    {(["super_admin", "admin", "operator", "viewer"] as UserRole[]).map((r) => (
                      <th key={r} className="px-4 py-3 text-center">
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", ROLE_CONFIG[r].bg, ROLE_CONFIG[r].color)}>
                          {ROLE_CONFIG[r].label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS.map((perm) => (
                    <tr key={perm.label} className="border-b border-[#27272A] last:border-0 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-2.5">
                        <span className="text-sm text-zinc-300">{perm.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center"><PermissionCell allowed={perm.super_admin} /></td>
                      <td className="px-4 py-2.5 text-center"><PermissionCell allowed={perm.admin} /></td>
                      <td className="px-4 py-2.5 text-center"><PermissionCell allowed={perm.operator} /></td>
                      <td className="px-4 py-2.5 text-center"><PermissionCell allowed={perm.viewer} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={handleInvited}
      />
      <EditRoleDialog
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSaved={handleRoleSaved}
      />
    </div>
  );
}
