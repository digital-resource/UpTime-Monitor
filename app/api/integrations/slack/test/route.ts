/**
 * POST /api/integrations/slack/test
 * Sends a test message to the configured Slack webhook.
 * No auth required for testing (webhook URL is server-side only).
 */
import { NextResponse } from "next/server";

export async function POST() {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    return NextResponse.json({ success: false, message: "SLACK_WEBHOOK_URL is not set on the server." }, { status: 400 });
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "✅ *Monitoring Hub — Test Message*\nSlack integration is connected and working correctly.",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ success: false, message: `Slack returned ${res.status}: ${body}` }, { status: 502 });
  }

  return NextResponse.json({ success: true, message: "Test message sent to Slack successfully." });
}
