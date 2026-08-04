/**
 * Auth module — backed by Supabase Auth.
 * Keeps the same exported interface so login page needs no changes.
 */
import { createClient } from "@/lib/supabase/client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: "super_admin" | "admin" | "operator" | "viewer";
  avatarInitials: string;
}

export type LoginResult =
  | { success: true; user: AuthUser }
  | { success: false; reason: "invalid_credentials" | "account_locked" | "unknown" };

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export async function mockLogin(identifier: string, password: string): Promise<LoginResult> {
  const db = createClient();

  // Supabase requires an email — resolve username → email if needed
  let email = identifier;
  if (!identifier.includes("@")) {
    // Try "username" field lookup in our users table
    const { data: userRow } = await db
      .from("users")
      .select("email")
      .ilike("email", `${identifier}@%`)
      .limit(1)
      .single();
    if (userRow?.email) {
      email = userRow.email;
    } else {
      return { success: false, reason: "invalid_credentials" };
    }
  }

  const { data, error } = await db.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { success: false, reason: "invalid_credentials" };
  }

  // Load extended profile from users table
  const { data: profile } = await db
    .from("users")
    .select("name, role, email")
    .eq("id", data.user.id)
    .single();

  const name  = profile?.name  ?? data.user.email ?? "User";
  const role  = (profile?.role as AuthUser["role"]) ?? "viewer";
  const emailAddr = profile?.email ?? data.user.email ?? "";

  // Update last login
  await db.from("users").update({ last_login_at: new Date().toISOString() }).eq("id", data.user.id);

  return {
    success: true,
    user: {
      id:             data.user.id,
      name,
      email:          emailAddr,
      username:       emailAddr.split("@")[0],
      role,
      avatarInitials: initials(name),
    },
  };
}

export async function getSession(): Promise<AuthUser | null> {
  if (typeof window === "undefined") return null;
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return null;

  const { data: profile } = await db
    .from("users")
    .select("name, role, email")
    .eq("id", user.id)
    .single();

  const name = profile?.name ?? user.email ?? "User";
  return {
    id:             user.id,
    name,
    email:          profile?.email ?? user.email ?? "",
    username:       (profile?.email ?? user.email ?? "").split("@")[0],
    role:           (profile?.role as AuthUser["role"]) ?? "viewer",
    avatarInitials: initials(name),
  };
}

export async function logout(): Promise<void> {
  const db = createClient();
  await db.auth.signOut();
}

export function isAuthenticated(): boolean {
  // @supabase/ssr stores the session in cookies, not localStorage.
  if (typeof window === "undefined") return false;
  try {
    return document.cookie
      .split(";")
      .some((c) => c.trim().startsWith("sb-") && c.includes("auth-token"));
  } catch {
    return false;
  }
}
