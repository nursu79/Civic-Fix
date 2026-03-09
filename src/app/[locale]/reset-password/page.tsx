"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import { Button, Input, Card } from "@/components/ui";
import { useAuth } from "@/providers";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const t = useTranslations('resetPassword');
  const locale = useLocale();
  const router = useRouter();
  const isAmharic = locale === "am";
  const { updatePassword } = useAuth();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Check if we have a session (Supabase handles the auth link automatically)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Option 1: Supabase handles recovery automatically and sets a session.
        // Option 2: If no session, they shouldn't be here unless it's a mistake.
        // We'll let updatePassword handle the actual auth check.
      }
    };
    checkSession();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t('errorMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('errorLength'));
      return;
    }

    setIsLoading(true);

    try {
      await updatePassword(password);
      setIsSuccess(true);
      setTimeout(() => {
        router.push(`/${locale}/login`);
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
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
          <h1 className={cn("text-3xl font-black text-deep-navy tracking-tighter", isAmharic && "font-ethiopic")}>
            {t('title')}
          </h1>
          <p className={cn("text-slate-gray mt-2 font-medium text-sm", isAmharic && "font-ethiopic")}>
            {t('subtitle')}
          </p>
        </div>

        <Card className="p-8 bg-white border border-zinc-200 shadow-sm">
          {isSuccess ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-deep-navy mb-2">
                {t('successTitle')}
              </h3>
              <p className="text-slate-500 mb-8 font-medium">
                {t('successMessage')}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              <Input
                label={t('newPassword')}
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="w-5 h-5" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Input
                label={t('confirmPassword')}
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="w-5 h-5" />}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <Button type="submit" className="w-full h-14 rounded-2xl bg-teal-primary hover:bg-teal-600" isLoading={isLoading}>
                {t('updateButton')}
              </Button>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
