import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles, error } = await (supabase as any)
      .from("profiles")
      .select("id, display_name, username, role, department, residence, avatar_url, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      // If department column missing in SELECT query, fallback to select without department column
      const fallbackQuery = await (supabase as any)
        .from("profiles")
        .select("id, display_name, username, role, residence, avatar_url, created_at")
        .order("created_at", { ascending: false });

      if (fallbackQuery.error) {
        return NextResponse.json({ error: fallbackQuery.error.message }, { status: 500 });
      }

      const formattedProfiles = (fallbackQuery.data || []).map((p: any) => ({
        ...p,
        department: p.department || (p.residence?.startsWith("dept:") ? p.residence.replace("dept:", "") : null),
      }));

      return NextResponse.json({ profiles: formattedProfiles });
    }

    const formattedProfiles = (profiles || []).map((p: any) => ({
      ...p,
      department: p.department || (p.residence?.startsWith("dept:") ? p.residence.replace("dept:", "") : null),
    }));

    return NextResponse.json({ profiles: formattedProfiles });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch profiles" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = (await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()) as { data: { role: string } | null };

    const isAdmin = adminProfile?.role === "admin";

    const body = await request.json();
    const { userId, role, department, avatar_url, display_name } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Self-update: any authenticated user can update their own avatar/display_name
    const isSelfUpdate = userId === user.id;

    // Role/department changes are admin-only
    if ((role !== undefined || department !== undefined) && !isAdmin) {
      return NextResponse.json({ error: "Forbidden: Only admins can change roles or departments" }, { status: 403 });
    }

    // Non-self updates are admin-only
    if (!isSelfUpdate && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build update fields
    const updateFields: Record<string, any> = {
      ...(role !== undefined && { role }),
      ...(department !== undefined && { department: department || null }),
      ...(department !== undefined && { residence: department ? `dept:${department}` : null }),
      ...(avatar_url !== undefined && { avatar_url }),
      ...(display_name !== undefined && { display_name }),
    };

    // Attempt update with department column
    let result = await (supabase as any)
      .from("profiles")
      .update(updateFields)
      .eq("id", userId)
      .select()
      .single();

    // Fallback: If department column does not exist in DB schema yet, update role and residence fallback
    if (result.error && result.error.message.includes("department")) {
      console.warn("department column missing in DB schema, storing in residence fallback:", result.error.message);
      result = await (supabase as any)
        .from("profiles")
        .update({
          ...(role !== undefined && { role }),
          ...(department !== undefined && { residence: department ? `dept:${department}` : null }),
        })
        .eq("id", userId)
        .select()
        .single();
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    const profileData = {
      ...result.data,
      department: result.data?.department || (result.data?.residence?.startsWith("dept:") ? result.data.residence.replace("dept:", "") : null),
    };

    return NextResponse.json({ profile: profileData });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update user" },
      { status: 500 }
    );
  }
}
