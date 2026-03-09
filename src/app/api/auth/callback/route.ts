import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Basic guard to prevent open redirects by enforcing a relative path.
function sanitizeNextPath(nextParam: string | null): string {
  if (!nextParam) return "/";

  try {
    // Disallow full URLs and protocol-relative URLs.
    if (
      nextParam.startsWith("http://") ||
      nextParam.startsWith("https://") ||
      nextParam.startsWith("//")
    ) {
      return "/";
    }

    // Enforce leading slash so we only redirect within this app.
    if (!nextParam.startsWith("/")) {
      return "/";
    }

    return nextParam;
  } catch {
    return "/";
  }
}

// Handle OAuth callback
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next");
  const safeNextPath = sanitizeNextPath(rawNext);

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", request.url),
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  return NextResponse.redirect(new URL(safeNextPath, request.url));
}
