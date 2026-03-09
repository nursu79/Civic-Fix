import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CommentCreateSchema } from "@/lib/validation";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/issues/[id]/comments - Get all comments
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      *,
      user:profiles!user_id(id, display_name, avatar_url, role)
    `,
    )
    .eq("issue_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comments: data });
}

// POST /api/issues/[id]/comments - Add a comment
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let parsedBody;
  try {
    const json = await request.json();
    parsedBody = CommentCreateSchema.parse(json);
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

  const { content } = parsedBody;

  // Check if user is admin for official badge
  const { data: profile } = (await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()) as { data: { role: string } | null };

  const isOfficial = profile?.role === "admin";

  const commentData = {
    issue_id: id,
    user_id: user.id,
    content,
    is_official: isOfficial,
  };

  const { data, error } = await supabase
    .from("comments")
    .insert(commentData as any)
    .select(
      `
      *,
      user:profiles!user_id(id, display_name, avatar_url, role)
    `,
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comment: data }, { status: 201 });
}
