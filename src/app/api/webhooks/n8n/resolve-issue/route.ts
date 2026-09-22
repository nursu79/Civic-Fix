import { NextRequest, NextResponse } from "next/server";
import { createClient as createDirectClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { notifySystemEvent, getIssueSubscribers } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    let payload: any = {};
    try {
      payload = await request.json();
    } catch (e) {
      console.warn("[Resolve Webhook JSON Warning]: Failed to parse JSON body", e);
    }

    const {
      issue_id,
      resolution_notes,
      resolution_images,
      billing_cost,
      technician_name,
      secret_key,
    } = payload;

    // Enforce Secret Key Security Authorization
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET || "civicfix_secret_key_2026";
    if (!secret_key || secret_key !== expectedSecret) {
      console.warn("[Resolve Webhook Auth Warning]: Unauthorized attempt with invalid secret key.");
      return NextResponse.json({ error: "Unauthorized: Invalid secret key" }, { status: 401 });
    }

    let targetIssueId = (issue_id && typeof issue_id === 'string' && issue_id.trim() !== "") ? issue_id.trim() : null;

    // Direct client and server client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseAdmin = createDirectClient(supabaseUrl, supabaseKey);
    const supabaseServer = await createClient();

    if (!targetIssueId || targetIssueId === "latest") {
      console.log("[Resolve Webhook]: Issue ID missing or set to 'latest'. Querying latest active issue...");
      const { data: latestIssue } = await supabaseAdmin
        .from("issues")
        .select("id")
        .in("status", ["in_progress", "assigned", "reported"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestIssue?.id) {
        targetIssueId = latestIssue.id;
        console.log("[Resolve Webhook]: Auto-selected latest active issue ID:", targetIssueId);
      }
    }

    if (!targetIssueId) {
      return NextResponse.json({ error: "Missing required field: issue_id and no active issue found" }, { status: 400 });
    }

    console.log("[Resolve Webhook Payload Received]:", JSON.stringify(payload));
    console.log("[Resolve Webhook Target Issue ID]:", targetIssueId);

    const nowIso = new Date().toISOString();
    const techName = technician_name || "Sub-City Field Crew";
    const notesText = resolution_notes 
      ? `[${techName}]: ${resolution_notes}` 
      : `Resolved by ${techName}.`;

    // Fetch existing issue to get reporter details
    const { data: existingIssue, error: fetchErr } = await supabaseAdmin
      .from("issues")
      .select("*")
      .eq("id", targetIssueId)
      .maybeSingle();

    if (fetchErr || !existingIssue) {
      console.error("[Resolve Webhook Fetch Issue Error]:", fetchErr || "Issue not found for ID " + targetIssueId);
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    const updatePayload = {
      status: "resolved",
      resolution_notes: notesText,
      resolution_images: Array.isArray(resolution_images) ? resolution_images : resolution_images ? [resolution_images] : [],
      billing_cost: billing_cost ? parseFloat(String(billing_cost)) : null,
      resolved_at: nowIso,
      updated_at: nowIso,
    };

    // Try server client first (carries session cookies if called from dashboard/browser)
    let { data: updatedIssue, error: updateErr } = await (supabaseServer as any)
      .from("issues")
      .update(updatePayload)
      .eq("id", targetIssueId)
      .select();

    if (!updatedIssue || updatedIssue.length === 0) {
      // Try direct admin client fallback
      const { data: adminData, error: adminErr } = await (supabaseAdmin as any)
        .from("issues")
        .update(updatePayload)
        .eq("id", targetIssueId)
        .select();
      
      updatedIssue = adminData;
      if (adminErr) updateErr = adminErr;
    }

    console.log("[Resolve Webhook DB Update Result]:", updatedIssue, updateErr);

    if (updateErr) {
      console.error("[n8n Resolve Webhook DB Error]:", updateErr);
      return NextResponse.json({ error: "Failed to update issue to resolved" }, { status: 500 });
    }

    // Safely send non-blocking notification to reporter and followers
    try {
      const subscriberIds = await getIssueSubscribers(targetIssueId, existingIssue.reporter_id);
      if (subscriberIds.length > 0) {
        notifySystemEvent({
          target_user_ids: subscriberIds,
          title: `Issue Resolved: ${existingIssue.title}`,
          message: `The issue has been successfully resolved by ${techName}! View proof photos in your app.`,
          link: `/issues/${existingIssue.id}`,
        }).catch((e) => console.warn("[n8n Notification Non-Blocking Warning]:", e));
      }
    } catch (notifErr) {
      console.warn("[n8n Notification Bypass]:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: `Issue ${issue_id} resolved by ${techName}`,
      issue: updatedIssue,
    });
  } catch (error: any) {
    console.error("[n8n Resolve Webhook Server Error]:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
