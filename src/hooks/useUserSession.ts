'use client';

import { useEffect, useState } from 'react';
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

  const fetchUserAndProfile = async (retryCount = 0, quiet = false): Promise<void> => {
    try {
      if (!quiet) setIsLoading(true);
      setError(null);

      // 1. Get current session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!session) {
        setUser(null);
        setProfile(null);
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
        console.error('useUserSession: profile fetch error', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        });
        // Profile doesn't exist yet - retry up to 3 times (trigger might be processing)
        if (profileError.code === 'PGRST116' && retryCount < 3) {
          console.log(`Profile not found, retrying... (${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, 800 * (retryCount + 1)));
          return fetchUserAndProfile(retryCount + 1);
        }
        
        if (profileError.code === 'PGRST116') {
          // If profile still missing, we still have the user object
          setProfile(null);
        } else {
          throw profileError;
        }
      } else {
        setProfile(profileData);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load session';
      setError(message);
      console.error('useUserSession error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchUserAndProfile();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event change:', event);
        
        if (session) {
          setUser(session.user);
          // Only fetch profile if event suggests it's needed (login or token refresh)
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            await fetchUserAndProfile();
          }
        } else {
          setUser(null);
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    profile,
    isLoading,
    error,
    refetch: (quiet?: boolean) => fetchUserAndProfile(0, quiet),
    setProfile,
  };
}
