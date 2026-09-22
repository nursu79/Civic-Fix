import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

function sanitizeNextPath(nextParam: string | null): string {
  if (!nextParam) return "/";

  try {
    if (
      nextParam.startsWith("http://") ||
      nextParam.startsWith("https://") ||
      nextParam.startsWith("//")
    ) {
      return "/";
    }

    if (!nextParam.startsWith("/")) {
      return "/";
    }

    return nextParam;
  } catch {
    return "/";
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next");
  const safeNextPath = sanitizeNextPath(rawNext);

  if (!code) {
    return NextResponse.redirect(
      new URL("/en/login?error=missing_code", request.url),
    );
  }

  // Construct initial redirect response object so Supabase SSR can write set-cookie headers directly onto it
  let response = NextResponse.redirect(new URL(safeNextPath, request.url));

  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll().map(({ name, value }) => ({ name, value }));
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set({ name, value });
              response.cookies.set({ name, value, ...options });
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Auth callback exchange error:", error);
      return NextResponse.redirect(new URL("/en/login?error=auth", request.url));
    }

    // Fetch user and profile role to attach sb-user-role cookie directly
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle() as { data: { role: string } | null };

      const role = profile?.role || "citizen";
      response.cookies.set({
        name: "sb-user-role",
        value: role,
        path: "/",
        maxAge: 604800,
        sameSite: "lax",
      });

      // Target path resolution based on role
      let targetPath = safeNextPath;
      if (safeNextPath === "/" || safeNextPath === "/en" || safeNextPath === "/am") {
        targetPath = role === "admin" ? "/admin/dashboard" : "/en/dashboard";
      }

      const finalRedirect = NextResponse.redirect(new URL(targetPath, request.url));
      response.cookies.getAll().forEach((cookie) => {
        finalRedirect.cookies.set(cookie);
      });
      return finalRedirect;
    }
  } catch (err) {
    console.error("Auth callback exception:", err);
  }

  return response;
}
