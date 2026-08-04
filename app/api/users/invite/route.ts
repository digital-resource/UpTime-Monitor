/**
 * POST /api/users/invite — create a new user account and send a Supabase invite email
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name  = (body.name  as string | undefined)?.trim();
  const email = (body.email as string | undefined)?.trim();
  const role  = (body.role  as string | undefined) ?? "viewer";

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }
  if (!["super_admin", "admin", "operator", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const db = createServiceClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const { data: invited, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
    data: { name },
    redirectTo: `${appUrl}/reset-password`,
  });

  if (inviteError || !invited.user) {
    return NextResponse.json(
      { error: inviteError?.message ?? "Failed to send invitation" },
      { status: 400 }
    );
  }

  const { data: profile, error: profileError } = await db
    .from("users")
    .insert({
      id: invited.user.id,
      name,
      email,
      role,
      is_active: true,
    })
    .select()
    .single();

  if (profileError) {
    // Roll back the auth user so a retry doesn't collide on email
    await db.auth.admin.deleteUser(invited.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ user: profile }, { status: 201 });
}
