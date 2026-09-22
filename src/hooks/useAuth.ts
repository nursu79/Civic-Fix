'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/lib/supabase';

interface UseAuthReturn {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Stable client — recreating on every render caused infinite re-renders
  // because [supabase] was listed as a useEffect dependency
  const supabase = useMemo(() => createClient(), []);
  
  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(profile);
      }
      
      setIsLoading(false);
    };
    
    getSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfile(profile);
        } else {
          setProfile(null);
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);
  
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
  };
  
  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName,
        },
      },
    });
    
    if (error) throw error;
  };
  
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
    
    if (error) throw error;
  };
  
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('SignOut warning:', err);
    }
    // Wipes all role cookies and session storage
    if (typeof window !== 'undefined') {
      document.cookie = 'sb-user-role=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'sb-user-role=; Max-Age=0; path=/';
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Storage access error fallback
      }
      setUser(null);
      setProfile(null);
      const currentLocale = window.location.pathname.startsWith('/am') ? 'am' : 'en';
      window.location.replace(`/${currentLocale}/login`);
    }
  };
  
  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) throw new Error('Not authenticated');
    
    const { error } = await (supabase as any)
      .from('profiles')
      .update(data)
      .eq('id', user.id);
    
    if (error) throw error;
    
    // Refresh profile
    const { data: updated } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setProfile(updated);
  };
  
  return {
    user,
    profile,
    isLoading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
  };
}
