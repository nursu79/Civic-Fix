'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/en/login');
      } else if (profile && profile.role !== 'admin') {
        router.replace('/admin/not-authorized');
      }
    }
  }, [user, profile, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium text-sm">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!user || (profile && profile.role !== 'admin')) {
    return null;
  }

  return <>{children}</>;
}
