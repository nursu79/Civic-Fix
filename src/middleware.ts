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
    
    // Exact match for protected paths (ignoring the locale prefix like /en/ or /am/)
    const protectedPaths = ['/issues', '/report', '/dashboard', '/profile', '/notifications'];
    
    // Check if the current path starts with any of the protected paths 
    // after stripping the optional /[locale] prefix
    const pathWithoutLocale = pathname.replace(/^\/(?:en|am)/, '') || '/';
    
    const isProtectedPath = protectedPaths.some(p => 
      pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`)
    );

    if (!user && isProtectedPath) {
      // Redirect to login page
      const localeMatch = pathname.match(/^\/(en|am)/);
      const locale = localeMatch ? localeMatch[1] : defaultLocale;
      const redirectUrl = new URL(`/${locale}/login`, request.url);
      
      // Prevent infinite redirect loops just in case
      if (pathWithoutLocale !== '/login') {
        return NextResponse.redirect(redirectUrl);
      }
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
