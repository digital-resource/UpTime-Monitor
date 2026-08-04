/**
 * GET /api/integrations/webflow/authorize
 * Starts the Webflow OAuth flow. Redirects to Webflow's consent screen
 * requesting `sites:read` only — this app never publishes or modifies sites.
 */
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET() {
  const clientId    = process.env.WEBFLOW_CLIENT_ID;
  const redirectUri = process.env.WEBFLOW_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "Webflow OAuth is not configured (missing WEBFLOW_CLIENT_ID / WEBFLOW_REDIRECT_URI)." },
      { status: 500 }
    );
  }

  const state = randomUUID();
  const authorizeUrl = new URL("https://webflow.com/oauth/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("scope", "sites:read");
  authorizeUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authorizeUrl.toString());
  res.cookies.set("webflow_oauth_state", state, {
    httpOnly: true,
    secure:   true,
    sameSite: "lax",
    maxAge:   600,
    path:     "/api/integrations/webflow",
  });
  return res;
}
