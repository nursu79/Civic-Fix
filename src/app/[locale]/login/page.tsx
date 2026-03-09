"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Mail, Lock, User, Loader2 } from "lucide-react";
import { Button, Input, Card } from "@/components/ui";
import { useAuth } from "@/providers";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function LoginPage() {
  const t = useTranslations('login');
  const auth = useTranslations('auth');
  const common = useTranslations('common');
  const locale = useLocale();
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
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (mode === "login") {
        await signIn(email, password);
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
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href={`/${locale}`}>
            <h1
              className={cn(
                "text-3xl font-black text-deep-navy tracking-tighter",
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

        <Card
          className="p-8 bg-white border border-zinc-200 shadow-sm"
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
