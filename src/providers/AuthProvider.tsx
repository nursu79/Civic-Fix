"use client";

import { createContext, useContext, ReactNode, useEffect, useCallback, useMemo } from "react";
import { useUserSession } from "@/hooks/useUserSession";
import { User } from "@supabase/supabase-js";
import { Profile } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { SessionWarningModal } from "@/components/features/SessionWarningModal";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  refetch: (quiet?: boolean) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    phone?: string,
    residence?: string,
  ) => Promise<void>;
  signInWithGoogle: (redirectPath?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>, quiet?: boolean) => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Use production useUserSession hook (Single Source of Truth)
  const { user, profile, isLoading, error, refetch, setProfile } = useUserSession();
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();
  const localeMatch = pathname?.match(/^\/(en|am)/);
  const locale = localeMatch ? localeMatch[1] : 'en';
  
  // Initialize Session Timeout Management
  const { showWarning, extendSession } = useSessionTimeout();

  // Handle immediate session detection and global state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_OUT') {
          // Redirect to Welcome Landing Page on logout
          router.push(`/${locale}`);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router, locale]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }, [supabase]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    displayName: string,
    phone?: string,
    residence?: string,
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          full_name: displayName,
          phone: phone,
          residence: residence
        },
      },
    });
    if (error) throw error;
  }, [supabase]);

  const signInWithGoogle = useCallback(async (redirectPath?: string) => {
    const nextPath = redirectPath ?? "/";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(
          nextPath,
        )}`,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
      },
    });
    if (error) throw error;
  }, [supabase]);

  const signOut = useCallback(async () => {
    try {
      document.cookie = "sb-user-role=; path=/; max-age=0; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      document.cookie = "sb-user-role=; path=/; max-age=0; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      window.location.href = `/${locale}/login`;
    }
  }, [supabase, locale]);

  const updateProfile = useCallback(async (data: Partial<Profile>, quiet?: boolean) => {
    if (!user) throw new Error("Not authenticated");

    const { data: updatedData, error: updateError } = await (supabase as any)
      .from("profiles")
      .update(data)
      .eq("id", user.id)
      .select();

    if (updateError) throw updateError;
    
    // If we have updated data, update local state
    if (updatedData && updatedData.length > 0) {
      setProfile(updatedData[0]);
    }
    
    // Refetch in background for consistency
    await refetch(quiet);
  }, [user, supabase, setProfile, refetch]);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/${locale}/reset-password`,
    });
    if (error) throw error;
  }, [supabase, locale]);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, [supabase]);

  const value = useMemo(() => ({
    user,
    profile,
    isLoading,
    error,
    refetch,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
    resetPasswordForEmail,
    updatePassword,
  }), [
    user,
    profile,
    isLoading,
    error,
    refetch,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
    resetPasswordForEmail,
    updatePassword,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {showWarning && (
        <SessionWarningModal
          isOpen={showWarning}
          onExtend={extendSession}
          onLogout={signOut}
        />
      )}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
