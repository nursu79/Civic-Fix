import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { IssueCreateSchema, type IssueCreateInput } from "@/lib/validation";

const ISSUE_CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: ISSUE_CORS_HEADERS });
}

/** Ensure each issue has lat/lng for map components (from row or from PostGIS location GeoJSON). */
function withLatLng<T extends Record<string, unknown>>(
  issue: T,
): T & { lat: number | null; lng: number | null } {
  const row = issue as T & {
    lat?: number | null;
    lng?: number | null;
    location?: { type?: string; coordinates?: [number, number] };
  };
  const lat = row.lat ?? row.location?.coordinates?.[1] ?? null;
  const lng = row.lng ?? row.location?.coordinates?.[0] ?? null;
  const { location: _loc, ...rest } = row;
  return { ...rest, lat, lng } as T & {
    lat: number | null;
    lng: number | null;
  };
}

// GET /api/issues - Get all issues with filters
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const sort = searchParams.get("sort") || "recent";
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const reporterId = searchParams.get("reporter_id");
  const search = searchParams.get("search");
  const location = searchParams.get("location");

  let query = supabase.from("issues").select(
    `
      *,
      reporter:profiles!reporter_id(id, display_name, avatar_url),
      comments:comments(count),
      upvotes:upvotes(count)
    `,
    { count: 'exact' }
  );

  if (category && category !== "all") query = query.eq("category", category);
  if (status) query = query.eq("status", status);
  if (reporterId) query = query.eq("reporter_id", reporterId);
  
  // Search title and description
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }

  // Filter by location (city/address)
  if (location) {
    query = query.ilike("address", `%${location}%`);
  }

  // Handle following "sort" (which is actually a filter)
  if (sort === "following") {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: follows } = await supabase
        .from("issue_follows")
        .select("issue_id")
        .eq("user_id", user.id);
      
      const followedIds = (follows as { issue_id: string }[] || []).map(f => f.issue_id);
      query = query.in("id", followedIds);
    } else {
      // Return empty results if not logged in
      query = query.in("id", ['00000000-0000-0000-0000-000000000000']);
    }
  }

  switch (sort) {
    case "popular":
      query = query.order("upvote_count", { ascending: false });
      break;
    case "priority":
      query = query.order("priority_score", { ascending: false });
      break;
    case "following":
    case "recent":
    default:
      query = query.order("created_at", { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);
  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: ISSUE_CORS_HEADERS },
    );
  }

  const issues = (data ?? []).map((row: any) => {
    const issueWithCounts = {
      ...row,
      comment_count: row.comments?.[0]?.count ?? row.comment_count ?? 0,
      upvote_count: row.upvotes?.[0]?.count ?? row.upvote_count ?? 0,
    };
    delete issueWithCounts.comments;
    delete issueWithCounts.upvotes;
    return withLatLng(issueWithCounts);
  });
  return NextResponse.json(
    { issues, count, offset, limit },
    { headers: ISSUE_CORS_HEADERS },
  );
}

/** Reverse geocode via Nominatim. On any failure, log and return null (caller uses "Address pending"). */
async function reverseGeocodeFallback(
  lat: number,
  lng: number,
): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CivicFix/1.0 (Community Reporting)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: Record<string, string>;
      display_name?: string;
    };
    const name =
      data?.display_name ??
      (data?.address && Object.values(data.address).join(", "));
    return typeof name === "string" && name.trim() ? name.trim() : null;
  } catch (err) {
    return null;
  }
}

// POST /api/issues - Create a new issue (real DB insert; location from lat/lng → geography in DB)
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: ISSUE_CORS_HEADERS },
    );
  }

  let parsedBody: IssueCreateInput;
  try {
    const json = await request.json();
    parsedBody = IssueCreateSchema.parse(json);
  } catch (error: unknown) {
    const zod = error as { name?: string; flatten?: () => unknown };
    if (zod?.name === "ZodError" && typeof zod.flatten === "function") {
      return NextResponse.json(
        { error: "Invalid request body", details: zod.flatten() },
        { status: 422, headers: ISSUE_CORS_HEADERS },
      );
    }
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400, headers: ISSUE_CORS_HEADERS },
    );
  }

  const { title, description, category, lat, lng, images } = parsedBody;
  let address: string | null =
    parsedBody.address != null && String(parsedBody.address).trim() !== ""
      ? String(parsedBody.address).trim()
      : null;

  if (address === null) {
    address = "Address pending";
    if (lat != null && lng != null) {
      const reverse = await reverseGeocodeFallback(lat, lng);
      if (reverse) address = reverse;
    }
  }

  if (lat != null && lng != null) {
    // Check for duplicates via RPC
    const { data: duplicates, error: rpcError } = await (
      supabase as unknown as {
        rpc: (name: string, args: object) => Promise<{ data: unknown; error: unknown }>;
      }
    ).rpc("find_nearby_duplicates", {
      p_lat: lat,
      p_lng: lng,
      p_category: category,
    });

    if (!rpcError && Array.isArray(duplicates) && duplicates.length > 0) {
      return NextResponse.json(
        { warning: "Similar issues found nearby", duplicates },
        { status: 200, headers: ISSUE_CORS_HEADERS },
      );
    }
  }

  const issueData = {
    title,
    description: description ?? null,
    category,
    lat: lat ?? null,
    lng: lng ?? null,
    address,
    images: images ?? [],
    reporter_id: user.id,
  };

  const { data, error } = await supabase
    .from("issues")
    .insert(issueData as any)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: ISSUE_CORS_HEADERS },
    );
  }

  const issue = data ? withLatLng(data as Record<string, unknown>) : data;
  return NextResponse.json(
    { issue },
    { status: 201, headers: ISSUE_CORS_HEADERS },
  );
}
