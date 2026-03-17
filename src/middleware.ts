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
  const pathname = request.nextUrl.pathname;

  // Admin routes bypass intl middleware — handle separately
  if (pathname.startsWith('/admin')) {
    try {
      const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll().map(({ name, value }) => ({ name, value }));
            },
            setAll() {}, // reads only in middleware
          },
        },
      );
      const { data: { user } } = await supabase.auth.getUser();

      // Allow not-authorized page without redirect
      if (!user && pathname !== '/admin/not-authorized') {
        return NextResponse.redirect(new URL('/en/login', request.url));
      }
    } catch (err) {
      console.error('Admin middleware auth error:', err);
    }
    return NextResponse.next();
  }

  // Run next-intl middleware for all citizen routes
  const response = intlMiddleware(request);

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
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Citizen protected paths (after stripping locale prefix)
    const protectedPaths = ['/issues', '/report', '/dashboard', '/profile', '/notifications'];
    const pathWithoutLocale = pathname.replace(/^\/(en|am)/, '') || '/';

    const isProtectedPath = protectedPaths.some(p =>
      pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`)
    );

    if (!user && isProtectedPath) {
      const localeMatch = pathname.match(/^\/(en|am)/);
      const locale = localeMatch ? localeMatch[1] : defaultLocale;
      if (pathWithoutLocale !== '/login') {
        return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
      }
    }

  } catch (err) {
    console.error('Middleware auth error:', err);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
