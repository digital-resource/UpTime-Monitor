/**
 * GET /api/integrations/webflow/callback
 * Exchanges the OAuth code for an access token and stores it in
 * `integration_secrets` (service-role-only table — never exposed to the
 * client-readable `integrations` table, same pattern as SLACK_WEBHOOK_URL).
 * The worker reads the token from there at sync time.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const params = new URL(req.url).searchParams;
  const code  = params.get("code");
  const state = params.get("state");
  const savedState = req.cookies.get("webflow_oauth_state")?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${appUrl}/integrations?webflow=error`);
  }

  const tokenRes = await fetch("https://api.webflow.com/oauth/access_token", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id:     process.env.WEBFLOW_CLIENT_ID,
      client_secret: process.env.WEBFLOW_CLIENT_SECRET,
      code,
      grant_type:    "authorization_code",
      redirect_uri:  process.env.WEBFLOW_REDIRECT_URI,
    }),
  });

  const db = createServiceClient();

  if (!tokenRes.ok) {
    await db.from("integrations").update({
      status:     "error",
      last_error: `OAuth token exchange failed (HTTP ${tokenRes.status})`,
    }).eq("slug", "webflow");
    return NextResponse.redirect(`${appUrl}/integrations?webflow=error`);
  }

  const json = (await tokenRes.json()) as { access_token?: string };
  if (!json.access_token) {
    return NextResponse.redirect(`${appUrl}/integrations?webflow=error`);
  }

  await db.from("integration_secrets").upsert({
    slug:   "webflow",
    secret: { access_token: json.access_token },
  });

  await db.from("integrations").update({
    status:          "connected",
    last_success_at: new Date().toISOString(),
    last_error:      null,
  }).eq("slug", "webflow");

  const res = NextResponse.redirect(`${appUrl}/integrations?webflow=connected`);
  res.cookies.delete("webflow_oauth_state");
  return res;
}
