"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { Button, Input, Card } from "@/components/ui";
import { useAuth } from "@/providers";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const t = useTranslations('forgotPassword');
  const auth = useTranslations('auth');
  const locale = useLocale();
  const isAmharic = locale === "am";
  const { resetPasswordForEmail } = useAuth();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await resetPasswordForEmail(email);
      setIsSent(true);
    } catch (err: any) {
      setError(err.message || (isAmharic ? "ሊንኩን መላክ አልተቻለም" : "Failed to send reset link"));
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
          <Link href={`/${locale}/login`} className="inline-flex items-center gap-2 text-slate-gray hover:text-deep-navy font-bold text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('backToLogin')}
          </Link>
          <h1 className={cn("text-3xl font-black text-deep-navy tracking-tighter", isAmharic && "font-ethiopic")}>
            {t('title')}
          </h1>
          <p className={cn("text-slate-gray mt-2 font-medium text-sm", isAmharic && "font-ethiopic")}>
            {t('subtitle')}
          </p>
        </div>

        <Card className="p-8 bg-white border border-zinc-200 shadow-sm">
          {isSent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-deep-navy mb-2">
                {t('checkEmail')}
              </h3>
              <p className="text-slate-500 mb-8 font-medium">
                {t('linkSent')}
              </p>
              <Link href={`/${locale}/login`}>
                <Button className="w-full">{t('returnToLogin')}</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold animate-in fade-in slide-in-from-top-1">
                  {error}
                </div>
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

              <Button type="submit" className="w-full h-14 rounded-2xl bg-teal-primary hover:bg-teal-600" isLoading={isLoading}>
                {t('sendLink')}
              </Button>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
