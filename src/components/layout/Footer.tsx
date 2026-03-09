'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { MapPin, Github, Twitter, ExternalLink, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Dynamic import for Leaflet avoiding SSR
const MiniMap = dynamic(() => import('@/components/map/MiniMap'), { ssr: false });

export function Footer() {
  const t = useTranslations();
  const locale = useLocale();
  const nav = useTranslations('nav');
  const common = useTranslations('common');
  const footer = useTranslations('footer');
  const isAmharic = locale === 'am';

  return (
    <footer className="relative bg-[#F8F9FA] pt-32 pb-16 overflow-hidden">
      {/* Footer Top Border Gradient */}
      <div className="absolute top-0 inset-x-0 h-px bg-zinc-200" />
      
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-24">
          {/* Brand & Status */}
          <div className="lg:col-span-4 space-y-10">
            <div>
              <Link href={`/${locale}`} className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-teal-primary/10 flex items-center justify-center border border-teal-primary/20">
                  <MapPin className="w-6 h-6 text-teal-primary" />
                </div>
                <span className={cn("text-2xl font-extrabold tracking-tighter text-deep-navy", isAmharic && 'font-ethiopic')}>
                  {common('appName')}
                </span>
              </Link>
              <p className={cn("text-slate-gray font-bold leading-relaxed max-w-sm", isAmharic && 'font-ethiopic text-lg')}>
                {common('tagline')}
              </p>
            </div>

            {/* System Status Indicator */}
            <div className="p-4 rounded-2xl bg-white border border-zinc-200 inline-flex items-center gap-4 group hover:border-teal-primary/30 transition-colors shadow-sm">
              <div className="relative">
                <Activity className="w-5 h-5 text-teal-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-slate-gray/60 font-bold">
                  {isAmharic ? 'የስርዓት ሁኔታ' : 'Platform Status'}
                </span>
                <span className="text-sm text-deep-navy font-bold">
                  {isAmharic ? 'ሙሉ በሙሉ እየሰራ ነው' : 'Fully Operational'}
                </span>
              </div>
            </div>
          </div>

          {/* Links Grid */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-8">
            <div>
              <h4 className={cn("text-xs uppercase tracking-[0.2em] text-deep-navy font-black mb-8 italic", isAmharic && "font-ethiopic")}>
                {isAmharic ? 'አሰሳ' : 'Navigation'}
              </h4>
              <ul className="space-y-4">
                {[
                  { label: nav('home'), href: `/${locale}` },
                  { label: nav('issues'), href: `/${locale}/issues` },
                  { label: nav('report'), href: `/${locale}/report` },
                  { label: nav('map'), href: `/${locale}/issues` }
                ].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={cn("text-sm text-slate-gray hover:text-teal-primary font-medium transition-colors duration-300", isAmharic && "font-ethiopic")}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className={cn("text-xs uppercase tracking-[0.2em] text-deep-navy font-black mb-8 italic", isAmharic && "font-ethiopic")}>
                {isAmharic ? 'ህጋዊ' : 'Legal'}
              </h4>
              <ul className="space-y-4">
                {[
                  { label: footer('privacy'), href: '#' },
                  { label: footer('terms'), href: '#' },
                  { label: isAmharic ? 'ኩኪ ፖሊሲ' : 'Cookie Policy', href: '#' }
                ].map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className={cn("text-sm text-slate-gray hover:text-deep-navy font-medium transition-colors duration-300", isAmharic && "font-ethiopic")}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Mini-Map Preview (Leaflet) */}
          <div className="lg:col-span-4">
            <h4 className="text-xs uppercase tracking-[0.2em] text-deep-navy font-black mb-8 italic">
              {isAmharic ? 'ቀጥታ ሽፋን' : 'Live Coverage'}
            </h4>
            <div className="aspect-video rounded-3xl overflow-hidden border border-zinc-200 shadow-sm relative group">
              <MiniMap />
              <div className="absolute inset-0 bg-teal-primary/5 pointer-events-none group-hover:bg-transparent transition-colors duration-500" />
              <div className="absolute bottom-4 left-4 z-10">
                <div className="px-3 py-1 rounded-full bg-white border border-zinc-200 text-[10px] font-bold text-teal-primary uppercase tracking-widest shadow-sm">
                  {isAmharic ? 'አዲስ አበባ፣ ኢትዮጵያ' : 'Addis Ababa, ET'}
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-[#F1F5F9] bg-zinc-200" />
                ))}
                <div className="w-8 h-8 rounded-full border-2 border-[#F1F5F9] bg-teal-primary/10 flex items-center justify-center text-[10px] font-bold text-teal-primary">+12k</div>
              </div>
              <span className="text-xs text-slate-gray font-medium italic">
                {isAmharic ? 'አሁን ንቁ የሆኑ ዜጎች' : 'Citizens active now'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-12 border-t border-zinc-200 flex flex-col md:flex-row justify-between items-center gap-8">
          <p className={cn("text-xs text-slate-gray font-bold tracking-wide", isAmharic && 'font-ethiopic text-sm')}>
            © {new Date().getFullYear()} {isAmharic ? 'ሲቪክፊክስ ኢትዮጵያ። መብቱ በሕግ የተጠበቀ ነው።' : 'CivicFix Ethiopia. All rights reserved.'}
          </p>
          <div className="flex gap-4">
            <Link href="#" className="p-3 rounded-2xl bg-white border border-zinc-200 hover:border-teal-primary/30 hover:shadow-xl hover:shadow-black/5 transition-all group">
              <Twitter className="w-5 h-5 text-slate-gray group-hover:text-teal-primary" />
            </Link>
            <Link href="#" className="p-3 rounded-2xl bg-white border border-zinc-200 hover:border-teal-primary/30 hover:shadow-xl hover:shadow-black/5 transition-all group">
              <Github className="w-5 h-5 text-slate-gray group-hover:text-teal-primary" />
            </Link>
            <Link href="#" className="p-3 rounded-2xl bg-white border border-zinc-200 hover:border-teal-primary/30 hover:shadow-xl hover:shadow-black/5 transition-all group">
              <ExternalLink className="w-5 h-5 text-slate-gray group-hover:text-teal-primary" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
