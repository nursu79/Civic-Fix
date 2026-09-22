'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/lib/supabase';

interface UseUserSessionReturn {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  refetch: (quiet?: boolean) => Promise<void>;
  setProfile: (profile: Profile | null) => void;
}

/**
 * Single Source of Truth for User + Profile
 * Handles auth.users → profiles sync with retry logic
 */
export function useUserSession(): UseUserSessionReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchUserAndProfile = useCallback(async (retryCount = 0, quiet = false): Promise<void> => {
    try {
      if (!quiet) setIsLoading(true);
      setError(null);

      // 1. Get current session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session) {
        setUser(null);
        setProfile(null);
        if (typeof document !== 'undefined') {
          document.cookie = 'sb-user-role=; path=/; max-age=0; SameSite=Lax';
        }
        setIsLoading(false);
        return;
      }

      // 2. Set user immediately from session
      setUser(session.user);

      // 3. Fetch corresponding profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        if (profileError.code !== 'PGRST116') {
          console.warn('useUserSession profile fetch notice:', profileError.message || profileError.details || profileError.code);
        }
        setProfile(null);
      } else {
        const typedProfile = profileData as Profile | null;
        setProfile(typedProfile);
        if (typeof document !== 'undefined' && typedProfile?.role) {
          document.cookie = `sb-user-role=${typedProfile.role}; path=/; max-age=604800; SameSite=Lax`;
        }
      }
    } catch (err: any) {
      const message = err?.message || err?.details || (typeof err === 'string' ? err : 'Failed to load session');
      setError(message);
      console.error('useUserSession error:', message);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const refetch = useCallback((quiet?: boolean) => fetchUserAndProfile(0, quiet), [fetchUserAndProfile]);

  useEffect(() => {
    // Single initial fetch on mount
    fetchUserAndProfile(0, false);

    // Listen for auth state changes (ignoring INITIAL_SESSION to prevent double fetches)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(session.user);
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await fetchUserAndProfile(0, true);
          }
        } else {
          setUser(null);
          setProfile(null);
          if (typeof document !== 'undefined') {
            document.cookie = 'sb-user-role=; path=/; max-age=0; SameSite=Lax';
          }
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserAndProfile, supabase]);

  return {
    user,
    profile,
    isLoading,
    error,
    refetch,
    setProfile,
  };
}
