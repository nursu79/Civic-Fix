import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IssueAdminUpdateSchema } from "@/lib/validation";
import type { UpdateTables } from "@/lib/supabase/database.types";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/issues/[id] - Get single issue
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("issues")
    .select(
      `
      *,
      reporter:profiles!reporter_id(id, display_name, avatar_url),
      assigned:profiles!assigned_to(id, display_name, avatar_url)
    `,
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Get user's upvote status
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let hasUpvoted = false;

  if (user) {
    const { data: upvote } = await supabase
      .from("upvotes")
      .select("id")
      .eq("issue_id", id)
      .eq("user_id", user.id)
      .single();

    hasUpvoted = !!upvote;
  }

  // Get comments
  const { data: comments } = await supabase
    .from("comments")
    .select(
      `
      *,
      user:profiles!user_id(id, display_name, avatar_url, role)
    `,
    )
    .eq("issue_id", id)
    .order("created_at", { ascending: true });

  // Get status history
  const { data: statusHistory } = await supabase
    .from("status_history")
    .select(
      `
      *,
      changed_by_user:profiles!changed_by(id, display_name)
    `,
    )
    .eq("issue_id", id)
    .order("created_at", { ascending: true });

  const issue = data
    ? (() => {
        const row = data as Record<string, unknown> & {
          lat?: number | null;
          lng?: number | null;
          location?: { coordinates?: [number, number] };
        };
        const lat = row.lat ?? row.location?.coordinates?.[1] ?? null;
        const lng = row.lng ?? row.location?.coordinates?.[0] ?? null;
        const { location: _loc, ...rest } = row;
        return { ...rest, lat, lng };
      })()
    : data;

  return NextResponse.json({
    issue,
    hasUpvoted,
    comments: comments || [],
    statusHistory: statusHistory || [],
  });
}

// PATCH /api/issues/[id] - Update issue (admin or department officer)
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  // Check auth
  let {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
        user = userData?.user ?? null;
      } catch (err) {
        console.error("[PATCH /api/issues] Token auth validation error:", err);
      }
    }
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized: Active user session or token required" }, { status: 401 });
  }

  const { data: profile } = (await supabase
    .from("profiles")
    .select("role, department")
    .eq("id", user.id)
    .single()) as { data: { role: string; department?: string } | null };

  const isAuthorized = 
    profile?.role === "admin" || 
    profile?.role === "department_officer" || 
    (!!profile?.department && profile.department !== "none" && profile.department !== "");

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Forbidden: Authorized Sector Department Officer or System Admin required" }, 
      { status: 403 }
    );
  }

  let jsonPayload: any = {};
  try {
    jsonPayload = await request.json();
  } catch (error: any) {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const {
    status,
    assigned_to,
    assigned_department,
    note,
    resolution_notes,
    resolution_images,
    billing_cost,
    escalated,
    escalation_notes,
    escalation_admin_response,
  } = jsonPayload;

  // Get current issue data
  const { data: currentIssue } = (await supabase
    .from("issues")
    .select("*, reporter:profiles!reporter_id(email, display_name)")
    .eq("id", id)
    .single()) as { data: any | null };

  // Construct update fields
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
    ...(status !== undefined && { status }),
    ...(assigned_to !== undefined && { assigned_to }),
    ...(assigned_department !== undefined && { assigned_department }),
    ...(resolution_notes !== undefined && { resolution_notes }),
    ...(resolution_images !== undefined && { resolution_images }),
    ...(billing_cost !== undefined && { billing_cost }),
    ...(escalated !== undefined && { escalated }),
    ...(escalation_notes !== undefined && { escalation_notes }),
    ...(escalation_admin_response !== undefined && {
      escalation_admin_response,
      escalation_responded_at: new Date().toISOString(),
    }),
    ...(status === 'resolved' && { resolved_at: new Date().toISOString() }),
  };

  const { data: updateRows, error } = await (supabase as any)
    .from("issues")
    .update(updateData)
    .eq("id", id)
    .select();

  if (error) {
    console.error("[PATCH /api/issues] DB update error:", error.message, "| updateData keys:", Object.keys(updateData));
    return NextResponse.json({ 
      error: `Database update failed: ${error.message}`,
      details: error.message 
    }, { status: 500 });
  }

  const data = updateRows?.[0] || { id, ...updateData };

  // Add status history entry if status changed
  if (status && status !== currentIssue?.status) {
    await (supabase as any).from("status_history").insert({
      issue_id: id,
      old_status: currentIssue?.status ?? null,
      new_status: status,
      changed_by: user.id,
      note: note || resolution_notes || null,
    });
  }

  // In-app notification inserts (non-blocking background dispatch)
  (async () => {
    try {
      const { notifyAdminsOfEscalation, notifyOfficerOfAdminResponse } = await import("@/lib/notifications");

      if (escalated && !currentIssue?.escalated) {
        await notifyAdminsOfEscalation({
          issue_id: id,
          issue_title: currentIssue?.title || data?.title || "Issue",
          officer_name: currentIssue?.reporter?.display_name || "Officer",
          escalation_notes: escalation_notes,
        });
      }

      if (escalation_admin_response) {
        await notifyOfficerOfAdminResponse({
          issue_id: id,
          issue_title: currentIssue?.title || data?.title || "Issue",
          officer_user_id: currentIssue?.assigned_to || user.id,
          reporter_id: currentIssue?.reporter_id,
          admin_response: escalation_admin_response,
        });
      }
    } catch (err) {
      console.error("[PATCH /api/issues] Notification error (non-critical):", err);
    }
  })();

  // Trigger n8n Webhook asynchronously
  try {
    const { triggerN8nWebhook } = await import("@/lib/webhooks");

    // If admin is responding to an escalation, notify the reporter specifically
    if (escalation_admin_response) {
      triggerN8nWebhook({
        event: "escalation.responded",
        issue_id: id,
        title: data?.title || currentIssue?.title || "Issue Update",
        description: data?.description || currentIssue?.description,
        category: data?.category || currentIssue?.category,
        status: data?.status || currentIssue?.status || "escalated",
        address: data?.address || currentIssue?.address,
        reporter_id: currentIssue?.reporter_id,
        reporter_name: currentIssue?.reporter?.display_name,
        assigned_department: data?.assigned_department || currentIssue?.assigned_department,
        escalation_notes: currentIssue?.escalation_notes,
        escalation_admin_response,
        updated_at: new Date().toISOString(),
      });
    } else {
      triggerN8nWebhook({
        event: status === "resolved" ? "issue.resolved" : "issue.updated",
        issue_id: id,
        title: data?.title || currentIssue?.title || "Issue Update",
        description: data?.description || currentIssue?.description,
        category: data?.category || currentIssue?.category,
        status: status || currentIssue?.status || "updated",
        address: data?.address || currentIssue?.address,
        reporter_id: currentIssue?.reporter_id,
        reporter_name: currentIssue?.reporter?.display_name,
        assigned_department: data?.assigned_department || currentIssue?.assigned_department,
        resolution_notes: resolution_notes || note || null,
        resolution_images: resolution_images || [],
        billing_cost: billing_cost !== undefined ? billing_cost : null,
        resolved_at: data?.resolved_at || null,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("n8n webhook patch dispatch error:", err);
  }

  return NextResponse.json({ issue: data });
}
