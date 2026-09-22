"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Mail, Lock, User, Loader2, ShieldCheck, Building2, UserCheck, Sparkles } from "lucide-react";
import { Button, Input, Card } from "@/components/ui";
import { useAuth } from "@/providers";
import { cn } from "@/lib/utils";
import Link from "next/link";

function useSafeTranslations(namespace: string) {
  try {
    return useTranslations(namespace);
  } catch (e) {
    const fallbacks: Record<string, Record<string, string>> = {
      login: {
        title: 'Sign In to CivicFix',
        subtitle: 'Access your account or test platform features',
        signInToAccount: 'Sign In to your Account',
        createNewAccount: 'Create New Account',
        needAccount: "Don't have an account? Sign Up",
        alreadyHaveAccount: 'Already have an account? Sign In',
        terms: 'CivicFix 2026 Platform • Addis Ababa City Administration',
      },
      auth: {
        email: 'Email Address',
        password: 'Password',
        signIn: 'Sign In',
        signUp: 'Sign Up',
        forgotPassword: 'Forgot Password?',
        googleSignIn: 'Sign In with Google',
      },
      common: {
        fullName: 'Full Name',
        fullNamePlaceholder: 'Abebe Bikila',
        phoneNumber: 'Phone Number',
        residence: 'Residence / Woreda',
        residencePlaceholder: 'Bole Sub-City, Woreda 03',
      }
    };
    return (key: string) => fallbacks[namespace]?.[key] || key;
  }
}

function useSafeLocale() {
  try {
    return useLocale();
  } catch (e) {
    return 'en';
  }
}

export default function LoginPage() {
  const t = useSafeTranslations('login');
  const auth = useSafeTranslations('auth');
  const common = useSafeTranslations('common');
  const locale = useSafeLocale();
  const router = useRouter();
  const isAmharic = locale === "am";

  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [residence, setResidence] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [demoRoleLoading, setDemoRoleLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleDemoLogin = async (roleKey: 'admin' | 'department_officer' | 'citizen') => {
    setError("");
    setDemoRoleLoading(roleKey);

    const emailMap = {
      admin: "admin@civicfix.gov.et",
      department_officer: "officer@civicfix.gov.et",
      citizen: "citizen@civicfix.gov.et"
    };

    setEmail(emailMap[roleKey]);
    setPassword("CivicFix2026!Demo");

    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleKey }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo login failed');

      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else {
        router.push(`/${locale}/dashboard`);
      }
    } catch (err: any) {
      console.warn('Demo API fallback:', err);
      try {
        await signIn(emailMap[roleKey], "CivicFix2026!Demo");
        if (roleKey === 'admin') router.push('/admin/dashboard');
        else if (roleKey === 'department_officer') router.push('/department/dashboard');
        else router.push(`/${locale}/dashboard`);
      } catch (signInErr: any) {
        setError("Demo sign-in initialized. You can also sign up or sign in manually.");
      }
    } finally {
      setDemoRoleLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (mode === "login") {
        await signIn(email, password);
        
        // Fetch role to know where to redirect
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single() as { data: { role: string } | null };
            
          if (profile?.role === 'admin') {
            router.push('/admin/dashboard');
            return;
          }
        }
        router.push(`/${locale}/dashboard`);
      } else {
        console.log("Attempting signup with:", { email, displayName, phone, residence });
        await signUp(email, password, displayName, phone, residence);
        setSuccessMsg(isAmharic 
          ? "መለያዎ ተፈጥሯል። እባክዎን ኢሜይልዎን ያረጋግጡ እና ከዚያ ይግቡ።" 
          : "Account created! Please check your email to confirm your account, then sign in.");
        setMode("login");
        setPassword(""); 
      }
    } catch (err: any) {
      console.error("Auth error detail:", err);
      // Handle the specific "Email not confirmed" error from Supabase
      if (err.message?.includes("Email not confirmed")) {
        setError(isAmharic ? "ኢሜይል አልተረጋገጠም" : "Email not confirmed. Please check your inbox.");
      } else {
        setError(err.message || "Authentication failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);
    try {
      await signInWithGoogle(`/${locale}/dashboard`);
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl mx-auto space-y-8"
      >
        <div className="text-center">
          <Link href={`/${locale}`}>
            <h1
              className={cn(
                "text-3xl sm:text-4xl font-black text-deep-navy tracking-tighter",
                isAmharic && "font-ethiopic",
              )}
            >
              {isAmharic ? "ሲቪክፊክስ" : "CivicFix"}
            </h1>
          </Link>
          <p
            className={cn(
              "text-slate-gray mt-2 font-medium text-sm",
              isAmharic && "font-ethiopic",
            )}
          >
            {mode === "login"
              ? t('signInToAccount')
              : t('createNewAccount')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Clean Form Card */}
          <div className="lg:col-span-6">
            <Card
              className="p-8 bg-white border border-zinc-200 shadow-sm rounded-3xl"
              tilt={false}
            >
              {error && (
                <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="mb-6 p-3 rounded-xl bg-green-50 border border-green-100 text-green-600 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <Input
                      label={t('fullName')}
                      placeholder={t('fullNamePlaceholder')}
                      leftIcon={<User className="w-5 h-5" />}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                    />
                    <Input
                      label={t('phoneNumber')}
                      placeholder="+251..."
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                    <Input
                      label={t('residence')}
                      placeholder={t('residencePlaceholder')}
                      value={residence}
                      onChange={(e) => setResidence(e.target.value)}
                      required
                    />
                  </>
                )}

                <Input
                  label={auth('email')}
                  type="email"
                  placeholder="you@example.com"
                  leftIcon={<Mail className="w-5 h-5" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Input
                  label={auth('password')}
                  type="password"
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-5 h-5" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <div className="flex justify-end">
                  <Link
                    href={`/${locale}/forgot-password`}
                    className="text-xs font-bold text-slate-400 hover:text-teal-primary transition-colors"
                  >
                    {auth('forgotPassword')}
                  </Link>
                </div>

                <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
                  {mode === "login"
                    ? auth('signIn')
                    : auth('signUp')}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setMode(mode === "login" ? "signup" : "login")}
                  className="text-sm font-bold text-teal-primary hover:text-teal-primary/80 transition-colors"
                >
                  {mode === "login"
                    ? t('needAccount')
                    : t('alreadyHaveAccount')}
                </button>
              </div>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-100" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black text-slate-gray/40">
                  <span className="px-4 bg-white">{t('or')}</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full border-zinc-200 text-deep-navy hover:bg-zinc-50 font-bold bg-white shadow-sm hover:shadow-md transition-all duration-300 group"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="group-hover:translate-x-0.5 transition-transform duration-300">
                    {t('googleSignIn')}
                  </span>
                </div>
              </Button>
            </Card>
          </div>

          {/* RIGHT COLUMN: CivicFix Light System Showcase Panel */}
          <div className="lg:col-span-6">
            <Card className="p-8 bg-white border border-zinc-200 shadow-sm rounded-3xl space-y-6" tilt={false}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-teal-700 flex items-center gap-1.5 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Demo Quick Access
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                    REAL SUPABASE AUTH
                  </span>
                </div>
                <h2 className="text-xl font-black text-deep-navy tracking-tight pt-1">
                  1-Click Role Showcase
                </h2>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Select a pre-configured account below to auto-fill credentials and evaluate role-based features & workflows:
                </p>
              </div>

              <div className="space-y-3.5">
                {/* 1. Super Admin */}
                <button
                  type="button"
                  disabled={!!demoRoleLoading}
                  onClick={() => handleDemoLogin('admin')}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-amber-50/60 hover:bg-amber-100/70 border border-amber-200/80 transition-all text-left group shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 border border-amber-200/60 group-hover:scale-105 transition-transform">
                      <ShieldCheck className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                      <p className="font-black text-amber-950 text-sm">Municipal Super Admin</p>
                      <p className="text-[11px] text-amber-800/80 font-medium">admin@civicfix.gov.et</p>
                    </div>
                  </div>
                  {demoRoleLoading === 'admin' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-amber-700" />
                  ) : (
                    <span className="text-xs font-black text-amber-900 bg-amber-200/60 px-3.5 py-1.5 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-colors">
                      Demo &rarr;
                    </span>
                  )}
                </button>

                {/* 2. Department Officer */}
                <button
                  type="button"
                  disabled={!!demoRoleLoading}
                  onClick={() => handleDemoLogin('department_officer')}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-purple-50/60 hover:bg-purple-100/70 border border-purple-200/80 transition-all text-left group shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-purple-100 text-purple-800 border border-purple-200/60 group-hover:scale-105 transition-transform">
                      <Building2 className="w-5 h-5 text-purple-700" />
                    </div>
                    <div>
                      <p className="font-black text-purple-950 text-sm">Department Officer (Roads)</p>
                      <p className="text-[11px] text-purple-800/80 font-medium">officer@civicfix.gov.et</p>
                    </div>
                  </div>
                  {demoRoleLoading === 'department_officer' ? (
                    <Loader2 className="w-5 h-5 animate-spin text-purple-700" />
                  ) : (
                    <span className="text-xs font-black text-purple-900 bg-purple-200/60 px-3.5 py-1.5 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      Demo &rarr;
                    </span>
                  )}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Supabase Auth Active
                </span>
                <span>CivicFix Platform Showcase</span>
              </div>
            </Card>
          </div>
        </div>

        <p
          className={cn(
            "text-center text-slate-gray/60 text-[10px] mt-8 uppercase font-black tracking-widest",
            isAmharic && "font-ethiopic",
          )}
        >
          {t('terms')}
        </p>
      </motion.div>
    </div>
  );
}
