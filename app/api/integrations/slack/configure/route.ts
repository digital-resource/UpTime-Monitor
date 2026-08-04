/**
 * POST /api/integrations/slack/configure
 * Saves Slack config (webhook URL, workspace name, channel) to the integrations table.
 * Tests the webhook before saving — returns error if it fails.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { webhookUrl, workspaceName, defaultChannel } = await req.json();

  if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
    return NextResponse.json({ success: false, message: "Invalid Slack webhook URL." }, { status: 400 });
  }

  // Test the webhook before saving
  const testRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `✅ *Monitoring Hub connected to Slack* — ${workspaceName ?? "Workspace"} ${defaultChannel ?? "#alerts"}`,
    }),
  });

  if (!testRes.ok) {
    return NextResponse.json({ success: false, message: "Webhook test failed — check the URL and try again." }, { status: 400 });
  }

  // Save to integrations table — the webhook URL itself is never stored here:
  // this table is readable by every authenticated user (RLS grants SELECT to
  // all logged-in roles), so only non-secret display fields are persisted.
  // The live send path reads the real webhook from SLACK_WEBHOOK_URL server-side.
  const db = createServiceClient();
  const { error } = await db
    .from("integrations")
    .update({
      status:          "connected",
      last_success_at: new Date().toISOString(),
      last_error:      null,
      config: {
        workspaceName: workspaceName ?? "",
        defaultChannel: defaultChannel ?? "#alerts",
      },
    })
    .eq("slug", "slack");

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: `Connected to ${workspaceName ?? "Slack"} ${defaultChannel ?? "#alerts"}` });
}
