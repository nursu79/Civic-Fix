import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IssueAdminUpdateSchema } from "@/lib/validation";

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

// PATCH /api/issues/[id] - Update issue (admin only)
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  // Check auth & admin role
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = (await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()) as { data: { role: string } | null };

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let parsedBody;
  try {
    const json = await request.json();
    parsedBody = IssueAdminUpdateSchema.parse(json);
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 422 },
      );
    }
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const { status, assigned_to, note } = parsedBody;

  // Get current status for history
  const { data: currentIssue } = (await supabase
    .from("issues")
    .select("status")
    .eq("id", id)
    .single()) as { data: { status: string } | null };

  // Update the issue
  const updateData = {
    status,
    assigned_to: assigned_to ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase as any)
    .from("issues")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add status history entry if status changed
  if (status && status !== currentIssue?.status) {
    const historyData = {
      issue_id: id,
      old_status: currentIssue?.status,
      new_status: status,
      changed_by: user.id,
      note,
    };
    await supabase.from("status_history").insert(historyData as any);
  }

  return NextResponse.json({ issue: data });
}
