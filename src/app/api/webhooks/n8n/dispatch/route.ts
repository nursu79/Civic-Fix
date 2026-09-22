import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifySystemEvent, getIssueSubscribers } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user session or Bearer token
    let { data: { user } } = await supabase.auth.getUser();

    let userEmail = "Department Officer";

    if (user) {
      userEmail = user.email || "Department Officer";
    } else {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.split(" ")[1];
          const { createClient: createDirectClient } = await import("@supabase/supabase-js");
          const directClient = createDirectClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
          );
          const { data: userData } = await directClient.auth.getUser(token);
          if (userData?.user) {
            user = userData.user;
            userEmail = user.email || "Department Officer";
          }
        } catch (err) {
          console.error("[Dispatch Webhook Auth Error]:", err);
        }
      }
    }

    // Direct Service Role Admin Client to ensure reliability
    const { createClient: createDirectClient } = await import("@supabase/supabase-js");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const dbAdmin = createDirectClient(supabaseUrl, supabaseKey);

    const payload = await request.json();
    const { issue_id, subcity, assigned_unit, dispatch_notes } = payload;

    if (!issue_id) {
      return NextResponse.json({ error: "Missing required field: issue_id" }, { status: 400 });
    }

    // Get current issue
    const { data: currentIssue, error: fetchErr } = await dbAdmin
      .from("issues")
      .select("*")
      .eq("id", issue_id)
      .single();

    if (fetchErr || !currentIssue) {
      console.error("[Dispatch Fetch Error]:", fetchErr);
      return NextResponse.json({ error: fetchErr?.message || "Issue not found" }, { status: 404 });
    }

    let reporterName = "Citizen";
    if (currentIssue.reporter_id) {
      try {
        const { data: profile } = await dbAdmin
          .from("profiles")
          .select("email, display_name")
          .eq("id", currentIssue.reporter_id)
          .maybeSingle();
        if (profile) {
          reporterName = profile.display_name || profile.email || "Citizen";
        }
      } catch (e) {
        console.warn("[Dispatch Reporter Fetch Warning]:", e);
      }
    }

    const targetSubcity = subcity || (currentIssue as any).subcity || "Bole";
    const targetUnit = assigned_unit || "Field Crew Unit 1";
    const nowIso = new Date().toISOString();

    // Update issue in DB cleanly using authenticated client first, then dbAdmin fallback
    let updatedIssue = null;
    try {
      // 1. Try authenticated client first (carries user session cookies)
      const { data: authData, error: authErr } = await (supabase as any)
        .from("issues")
        .update({
          status: "in_progress",
          subcity: targetSubcity,
          assigned_unit: targetUnit,
          dispatched_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", issue_id)
        .select();

      if (authData && authData.length > 0) {
        updatedIssue = authData[0];
      } else {
        // 2. Try dbAdmin fallback
        const { data: adminData } = await (dbAdmin as any)
          .from("issues")
          .update({
            status: "in_progress",
            subcity: targetSubcity,
            assigned_unit: targetUnit,
            dispatched_at: nowIso,
            updated_at: nowIso,
          })
          .eq("id", issue_id)
          .select();

        if (adminData && adminData.length > 0) {
          updatedIssue = adminData[0];
        } else {
          // 3. Fallback to status only if columns subcity/assigned_unit aren't in DB schema yet
          const { data: statusData } = await (supabase as any)
            .from("issues")
            .update({ status: "in_progress", updated_at: nowIso })
            .eq("id", issue_id)
            .select();
          updatedIssue = statusData ? statusData[0] : null;
        }
      }
    } catch (e) {
      console.error("[Dispatch DB Update Exception]:", e);
    }

    const issueObj = currentIssue as any;

    // Formulate payload for n8n Webhook
    const n8nPayload = {
      event: "issue_dispatched",
      timestamp: nowIso,
      dispatch_notes: dispatch_notes || "Field maintenance crew dispatched.",
      issue: {
        id: issueObj.id,
        title: issueObj.title,
        description: issueObj.description,
        category: issueObj.category,
        address: issueObj.address,
        lat: issueObj.lat,
        lng: issueObj.lng,
        subcity: targetSubcity,
        assigned_unit: targetUnit,
        priority_score: issueObj.priority_score,
        reporter_name: reporterName,
        dispatched_by: userEmail,
        images: issueObj.images || [],
        maps_link: issueObj.lat && issueObj.lng 
          ? `https://www.google.com/maps?q=${issueObj.lat},${issueObj.lng}` 
          : null,
      },
    };

    // Forward payload to n8n (support both active and test webhook URLs in parallel with fast 1.5s timeout)
    let n8nTriggered = false;
    const baseWebhookUrl = process.env.N8N_DISPATCH_WEBHOOK_URL || "http://localhost:5678/webhook/civicfix-dispatch";
    const testWebhookUrl = baseWebhookUrl.includes("/webhook-test/")
      ? baseWebhookUrl
      : baseWebhookUrl.replace("/webhook/", "/webhook-test/");

    const urlsToTry = Array.from(new Set([testWebhookUrl, baseWebhookUrl]));

    try {
      const fetchPromises = urlsToTry.map(async (url) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1500);
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(n8nPayload),
            signal: controller.signal,
          });
          clearTimeout(timer);
          return res.ok;
        } catch (e) {
          clearTimeout(timer);
          return false;
        }
      });

      const results = await Promise.all(fetchPromises);
      n8nTriggered = results.some((ok) => ok === true);
    } catch (n8nErr) {
      console.warn("[n8n Forwarding Warning]: Could not reach n8n URL", n8nErr);
    }

    // Safely notify reporter and followers of field dispatch
    try {
      const subscriberIds = await getIssueSubscribers(currentIssue.id, currentIssue.reporter_id);
      if (subscriberIds.length > 0) {
        notifySystemEvent({
          target_user_ids: subscriberIds,
          title: `🚧 Field Crew Dispatched: ${currentIssue.title}`,
          message: `Municipal team (${targetUnit}) has been dispatched to ${targetSubcity} Sub-City.`,
          link: `/issues/${currentIssue.id}`,
        }).catch((e) => console.warn("[Dispatch Notification Warning]:", e));
      }
    } catch (notifErr) {
      console.warn("[Dispatch Notification Exception]:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: `Issue dispatched to ${targetUnit} (${targetSubcity})`,
      issue: updatedIssue,
      n8n_triggered: n8nTriggered,
      n8n_payload: n8nPayload,
    });
  } catch (error: any) {
    console.error("[Dispatch Webhook Server Error]:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}
