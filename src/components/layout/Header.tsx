"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Globe, MapPin, Bell } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

import { useAuth } from "@/providers";
import { useScroll, useTransform } from "framer-motion";
import { NotificationCenter } from "@/components/features/NotificationCenter";

export function Header() {
  const locale = useLocale();
  const t = useTranslations();
  const common = useTranslations('common');
  const profileT = useTranslations('profile');
  const { user, profile, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAmharic = locale === "am";

  const otherLocale = locale === "en" ? "am" : "en";
  const switchLocalePath =
    pathname.replace(`/${locale}`, `/${otherLocale}`) || `/${otherLocale}`;

  const { scrollYProgress } = useScroll();
  const borderColor = useTransform(
    scrollYProgress,
    [0.1, 0.4, 0.7],
    [
      "rgba(226, 232, 240, 1)",
      "rgba(13, 148, 136, 0.3)",
      "rgba(15, 23, 42, 0.2)",
    ],
  );

  // Detect Dark Section (Footer/CTA)
  const [isDarkSection, setIsDarkSection] = useState(false);

  useEffect(() => {
    return scrollYProgress.onChange((latest) => {
      setIsDarkSection(latest > 0.92);
    });
  }, [scrollYProgress]);

  const homeHref = user ? `/${locale}/dashboard` : `/${locale}`;

  const navItems = [
    { href: homeHref, label: t("nav.home") },
    { href: `/${locale}/issues`, label: t("nav.issues") },
    { href: `/${locale}/report`, label: t("nav.report") },
  ];

  const isActive = (href: string) => {
    // Treat home as active when on either the marketing home or dashboard (for logged-in users).
    if (href === homeHref) {
      if (user) {
        return (
          pathname === `/${locale}/dashboard` ||
          pathname === `/${locale}/dashboard/`
        );
      }
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="fixed top-6 left-0 right-0 z-[100] flex justify-center px-6">
      <motion.div
        className={cn(
          "nav-pill flex items-center h-16 max-w-5xl w-full justify-between relative px-6 transition-all duration-500",
          isDarkSection
            ? "bg-transparent backdrop-blur-md shadow-none border-white/10 border" // Added border and blur as requested for readability
            : "bg-white/80 backdrop-blur-lg shadow-sm",
        )}
        style={{ borderColor: isDarkSection ? "transparent" : borderColor }}
      >
        <Link href={homeHref} className="flex items-center gap-2 group">
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center border transition-all",
              isDarkSection
                ? "bg-white/10 border-white/20 group-hover:bg-white/20"
                : "bg-teal-primary/5 border-teal-primary/10 group-hover:bg-teal-primary/10",
            )}
          >
            <MapPin
              className={cn(
                "w-5 h-5 transition-colors",
                isDarkSection ? "text-white" : "text-teal-primary",
              )}
            />
          </div>
        </Link>

        {/* Desktop Nav - Absolute Center */}
        <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-5 py-2 rounded-full text-[10px] font-extrabold tracking-[0.2em] uppercase transition-all duration-300",
                isActive(item.href)
                  ? isDarkSection
                    ? "text-white bg-white/20"
                    : "text-teal-primary bg-teal-primary/5"
                  : isDarkSection
                    ? "text-white/70 hover:text-white hover:bg-white/10"
                    : "text-slate-gray hover:text-teal-primary hover:bg-teal-primary/[0.03]",
                isAmharic && "font-ethiopic",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href={switchLocalePath}
            scroll={false}
            className={cn(
              "p-2 rounded-full border border-transparent transition-all",
              isDarkSection
                ? "text-white hover:bg-white/10"
                : "hover:bg-zinc-100",
            )}
            title={locale === "en" ? "አማርኛ" : "English"}
          >
            <Globe
              className={cn(
                "w-4 h-4",
                isDarkSection ? "text-white" : "text-slate-gray",
              )}
            />
          </Link>

          {user && <NotificationCenter />}

          {/* Profile / Login Button - Persistent visibility for auth */}
          {user ? (
            <Link
              href={`/${locale}/profile`}
              className={cn(
                "flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full border transition-all duration-300 group min-w-[140px]",
                isDarkSection
                  ? "bg-white/10 border-white/20 hover:border-white/40"
                  : "bg-teal-primary/5 border-teal-primary/10 hover:border-teal-primary/30",
              )}
            >
              {authLoading && !profile ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-zinc-200 animate-pulse ring-2 ring-white shadow-sm" />
                  <div className="flex flex-col gap-1.5">
                    <div className="w-10 h-2 bg-zinc-200 animate-pulse rounded-full" />
                    <div className="w-16 h-2 bg-zinc-200 animate-pulse rounded-full" />
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center overflow-hidden text-xs font-bold ring-2 shadow-sm transition-transform group-hover:scale-105",
                      isDarkSection
                        ? "bg-white text-deep-navy ring-white/20"
                        : "bg-teal-primary text-white ring-white",
                    )}
                  >
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.display_name || 'User'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>
                        {profile?.display_name?.[0]?.toUpperCase() ||
                          user.email?.[0]?.toUpperCase() ||
                          "U"}
                      </span>
                    )}
                  </div>

                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <span
                      className={cn(
                        "text-[7px] uppercase tracking-[0.2em] font-extrabold",
                        isDarkSection
                          ? "text-white/60"
                          : "text-teal-primary/60",
                      )}
                    >
                      {profileT('memberSinceMeta')}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold",
                        isDarkSection ? "text-white" : "text-deep-navy",
                        isAmharic && "font-ethiopic font-semibold",
                      )}
                    >
                      {profile?.display_name ||
                        user.email?.split("@")[0] ||
                        profileT('memberSinceMeta')}
                    </span>
                  </div>
                </>
              )}
            </Link>
          ) : authLoading ? (
            <div className="w-24 h-10 rounded-full bg-zinc-100 animate-pulse border border-zinc-200" />
          ) : (
            <Link href={`/${locale}/login`}>
              <Button
                variant="primary"
                className={cn(
                  "h-10 px-6 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-md transition-all hover:scale-105",
                  isDarkSection
                    ? "bg-teal-primary text-white border-none hover:bg-teal-600" // Force solid teal even in dark section if requested, or keep white? User said "Force... to bg-teal-primary with text-white".
                    : "bg-teal-primary text-white hover:bg-teal-600",
                )}
              >
                {t("nav.login")}
              </Button>
            </Link>
          )}

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={cn(
              "md:hidden p-2 rounded-xl border transition-colors",
              isDarkSection
                ? "border-white/20 hover:bg-white/10"
                : "border-zinc-200 hover:bg-zinc-50",
            )}
          >
            {mobileMenuOpen ? (
              <X
                className={cn(
                  "w-4 h-4",
                  isDarkSection ? "text-white" : "text-deep-navy",
                )}
              />
            ) : (
              <Menu
                className={cn(
                  "w-4 h-4",
                  isDarkSection ? "text-white" : "text-deep-navy",
                )}
              />
            )}
          </button>
        </div>
      </motion.div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-20 left-6 right-6 p-4 rounded-3xl bg-white border border-zinc-200 shadow-2xl z-[60]"
          >
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-2xl text-sm font-bold tracking-widest uppercase transition-all",
                    isActive(item.href)
                      ? "text-teal-primary bg-teal-primary/5 border border-teal-primary/10"
                      : "text-slate-gray hover:text-teal-primary hover:bg-zinc-50",
                    isAmharic && "font-ethiopic",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
