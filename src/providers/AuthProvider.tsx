"use client";

import { createContext, useContext, ReactNode, useEffect } from "react";
import { useUserSession } from "@/hooks/useUserSession";
import { User } from "@supabase/supabase-js";
import { Profile } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "next-intl";

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
  const locale = useLocale();

  // Handle immediate session detection to prevent flicker
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        // Session exists, user session hook will handle the rest
      }
    };
    checkSession();
  }, [supabase]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (
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
  };

  const signInWithGoogle = async (redirectPath?: string) => {
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
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const updateProfile = async (data: Partial<Profile>, quiet?: boolean) => {
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
  };

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/${locale}/reset-password`,
    });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
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
