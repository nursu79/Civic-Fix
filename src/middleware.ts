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

function redirectWithCookies(url: URL, sourceResponse: NextResponse) {
  const redirectRes = NextResponse.redirect(url);
  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirectRes.cookies.set(cookie);
  });
  return redirectRes;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Determine base response
  let response: NextResponse;
  if (pathname.startsWith('/admin') || pathname.startsWith('/department')) {
    response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  } else {
    response = intlMiddleware(request);
  }

  const localeMatch = pathname.match(/^\/(en|am)/);
  const locale = localeMatch ? localeMatch[1] : defaultLocale;
  const pathWithoutLocale = pathname.replace(/^\/(en|am)/, '') || '/';
  const protectedCitizenPaths = ['/issues', '/report', '/dashboard', '/profile', '/notifications'];
  const isProtectedCitizenPath = protectedCitizenPaths.some(p =>
    pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`)
  );

  // Initialize Supabase Server Client with cookie handler
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

  // Handle PKCE auth code exchange (?code=...)
  if (request.nextUrl.searchParams.has('code')) {
    try {
      const code = request.nextUrl.searchParams.get('code')!;
      const { data: { session } } = await supabase.auth.exchangeCodeForSession(code);
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle() as { data: { role: string } | null };

        const role = profile?.role || 'citizen';
        response.cookies.set({ name: 'sb-user-role', value: role, path: '/', maxAge: 604800, sameSite: 'lax' });
        const target = role === 'admin' ? '/admin/dashboard' : role === 'department_officer' ? '/department/dashboard' : `/${locale}/dashboard`;
        return redirectWithCookies(new URL(target, request.url), response);
      }
    } catch (err) {
      console.error('Middleware auth code exchange error:', err);
    }
  }

  // Retrieve true authenticated user session from Supabase
  const { data: { user } } = await supabase.auth.getUser();

  // -------------------------------------------------------------
  // CASE A: User is NOT Authenticated in Supabase
  // -------------------------------------------------------------
  if (!user) {
    // Expire stale sb-user-role cookie if present
    if (request.cookies.get('sb-user-role')) {
      response.cookies.set({ name: 'sb-user-role', value: '', path: '/', maxAge: 0 });
    }

    // Protect /admin routes
    if (pathname.startsWith('/admin') && pathname !== '/admin/not-authorized') {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('next', pathname);
      return redirectWithCookies(loginUrl, response);
    }

    // Protect /department routes
    if (pathname.startsWith('/department')) {
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('next', pathname);
      return redirectWithCookies(loginUrl, response);
    }

    // Protect citizen routes
    if (isProtectedCitizenPath && pathWithoutLocale !== '/login') {
      return redirectWithCookies(new URL(`/${locale}/login`, request.url), response);
    }

    return response;
  }

  // -------------------------------------------------------------
  // CASE B: User IS Authenticated in Supabase
  // -------------------------------------------------------------
  // Fetch user role from profile
  let userRole = request.cookies.get('sb-user-role')?.value;

  if (!userRole) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle() as { data: { role: string } | null };

    userRole = profile?.role || 'citizen';
    response.cookies.set({ name: 'sb-user-role', value: userRole, path: '/', maxAge: 604800, sameSite: 'lax' });
  }

  // Role Protection: Admin Routes
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'admin' && userRole !== 'department_officer' && pathname !== '/admin/not-authorized') {
      return redirectWithCookies(new URL('/admin/not-authorized', request.url), response);
    }
    if (pathname === '/admin' || pathname === '/admin/') {
      return redirectWithCookies(new URL('/admin/dashboard', request.url), response);
    }
    return response;
  }

  // Role Protection: Department Routes
  if (pathname.startsWith('/department')) {
    if (userRole !== 'department_officer' && userRole !== 'admin') {
      return redirectWithCookies(new URL('/admin/not-authorized', request.url), response);
    }
    return response;
  }

  // Redirect logged-in users away from /login or landing page root
  if (pathWithoutLocale === '/login') {
    const target = userRole === 'admin' 
      ? '/admin/dashboard' 
      : userRole === 'department_officer' 
        ? '/department/dashboard' 
        : `/${locale}/dashboard`;
    return redirectWithCookies(new URL(target, request.url), response);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
