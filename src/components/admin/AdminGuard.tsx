'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/providers';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading, refetch } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isVerifyingRole, setIsVerifyingRole] = useState(false);
  const [hasRefetched, setHasRefetched] = useState(false);

  const [hasAdminCookie, setHasAdminCookie] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined' && document.cookie.includes('sb-user-role=admin')) {
      setHasAdminCookie(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkAdminAccess = async () => {
      if (isLoading) return;

      if (!user && !hasAdminCookie) {
        router.replace('/en/login');
        return;
      }

      // If profile is already loaded and role is admin -> INSTANT PASS
      const userRole = (profile?.role as string | undefined);
      if (userRole === 'admin' || hasAdminCookie) {
        return;
      }

      // If profile is not admin and we haven't refetched yet, try refetching once from DB
      if (!hasRefetched) {
        setIsVerifyingRole(true);
        try {
          await refetch(true);
        } catch (err) {
          console.error('Error refetching profile for AdminGuard:', err);
        } finally {
          if (isMounted) {
            setIsVerifyingRole(false);
            setHasRefetched(true);
          }
        }
        return;
      }

      // If after refetching, role is still not admin
      if (userRole !== 'admin' && !hasAdminCookie) {
        if (pathname !== '/admin/not-authorized') {
          router.replace('/admin/not-authorized');
        }
      }
    };

    checkAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [user, profile, isLoading, router, pathname, refetch, hasRefetched, hasAdminCookie]);

  // Render children instantly if verified admin cookie is present (eliminates spinner flash on reload)
  if (hasAdminCookie) {
    return <>{children}</>;
  }

  if (isLoading || isVerifyingRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Verifying admin permissions...</p>
        </div>
      </div>
    );
  }

  if (user && !profile && !hasRefetched) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Loading Profile...</p>
        </div>
      </div>
    );
  }

  const role = (profile?.role as string | undefined);

  // If they are not an admin, we only render the children IF they are on the not-authorized page.
  if (!user || role !== 'admin') {
    if (pathname === '/admin/not-authorized') {
      return <>{children}</>;
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

