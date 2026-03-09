import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { locales, defaultLocale } from "./i18n";
import type { Database } from "./lib/supabase/database.types";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export async function middleware(request: NextRequest) {
  // Run next-intl middleware first to handle locale routing/redirects.
  const response = intlMiddleware(request);

  try {
    // Refresh Supabase session cookies on every page request.
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll().map(({ name, value }) => ({
              name,
              value,
            }));
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Protect routes that require authentication
    const pathname = request.nextUrl.pathname;
    
    // We skip the locale prefix (e.g. /en/..., /am/...) to check the path
    const pathWithoutLocale = pathname.replace(/^\/(?:en|am)(\/.*)?$/, '$1') || '/';

    const protectedPaths = ['/issues', '/report', '/dashboard', '/profile', '/notifications'];
    const isProtectedPath = protectedPaths.some(p => 
      pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`)
    );

    if (!user && isProtectedPath) {
      // Redirect to login page
      const locale = pathname.match(/^\/(en|am)/)?.[1] || defaultLocale;
      const redirectUrl = new URL(`/${locale}/login`, request.url);
      return NextResponse.redirect(redirectUrl);
    }
    
  } catch (err) {
    // If anything goes wrong, fall back to the original response.
    console.error('Middleware auth error:', err);
  }

  return response;
}

export const config = {
  // Match all pathnames except for
  // - API routes
  // - Static files
  // - _next internals
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
