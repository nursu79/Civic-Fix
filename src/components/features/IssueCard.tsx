'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { MapPin, MessageSquare, ThumbsUp, Clock, ArrowUpRight, Maximize2, Flag } from 'lucide-react';
import { Card, StatusBadge, CategoryBadge } from '@/components/ui';
import { Issue } from '@/lib/types';
import { cn, formatRelativeTime, formatNumber, categories, Category, statuses, Status } from '@/lib/utils';

interface IssueCardProps {
  issue: Issue;
  view?: 'grid' | 'list';
  onUpvote?: (id: string) => void;
}

export function IssueCard({ issue, view = 'grid', onUpvote }: IssueCardProps) {
  const t = useTranslations('issues');
  const common = useTranslations('common');
  const locale = useLocale();
  const isAmharic = locale === 'am';
  
  const categoryConfig = categories[issue.category as Category];
  const categoryColor = categoryConfig?.color || '#0d9488'; // Default to teal if undefined

  const handleUpvote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onUpvote?.(issue.id);
  };

  // Image Logic: Use first uploaded image or a geometric pattern fallback
  const hasImage = issue.images && issue.images.length > 0;
  const coverImage = hasImage ? issue.images[0] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ 
        type: 'spring', 
        stiffness: 100, 
        damping: 20, 
        duration: 0.6 
      }}
      className="relative"
    >
      <Link href={`/${locale}/issues/${issue.id}`} className="block group relative">
        <div 
          className={cn(
            "relative overflow-hidden rounded-[2.5rem] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
            "bg-white border border-zinc-100/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]",
            "hover:-translate-y-4 hover:shadow-2xl hover:shadow-teal-500/20"
          )}
        >
          {/* Image Section (Fixed Aspect Ratio for Grid Consistency) */}
          <div className={cn("relative overflow-hidden bg-[#FBFBFB] aspect-video")}>
            {coverImage ? (
              <img 
                src={coverImage} 
                alt={issue.title}
                className="w-full h-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-110"
              />
            ) : (
              <div 
                className="w-full h-full relative"
                style={{ backgroundColor: `${categoryColor}08` }}
              >
                {/* Refined Geometric Pattern */}
                <div 
                  className="absolute inset-0 opacity-10" 
                  style={{
                    backgroundImage: `radial-gradient(circle at 1.5px 1.5px, ${categoryColor} 1.5px, transparent 0)`,
                    backgroundSize: '20px 20px'
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center shadow-inner transform group-hover:scale-110 transition-transform duration-700"
                    style={{ backgroundColor: `${categoryColor}15` }}
                  >
                     <MapPin className="w-10 h-10" style={{ color: categoryColor }} />
                  </div>
                </div>
              </div>
            )}

            {/* Premium Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700" />

            {/* Quick View Button (Modern Rounded Pill) */}
            <div className="absolute inset-x-0 bottom-8 flex justify-center translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 ease-out z-20 px-6">
               <div className="w-full py-3.5 rounded-2xl bg-white/30 backdrop-blur-xl border border-white/30 shadow-2xl flex items-center justify-center gap-2 text-white font-bold tracking-tight">
                  <Maximize2 className="w-4 h-4" />
                  <span>{common('viewDetails')}</span>
               </div>
            </div>

            {/* Floating Info Badges */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none">
              <span 
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-xl shadow-lg border border-white/20",
                  isAmharic && 'font-ethiopic'
                )}
                style={{ 
                  // Keep vibrant category colors for both Open and In Progress
                  backgroundColor: ['open', 'in_progress'].includes(issue.status) ? `${categoryColor}DD` : '#10B981DD',
                  color: 'white'
                }}
              >
                 {statuses[issue.status as Status]?.label[locale as 'en' | 'am'] || issue.status}
              </span>
              
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl backdrop-blur-md border shadow-lg pointer-events-auto transition-colors",
                issue.has_upvoted 
                  ? "bg-teal-500 border-teal-500 text-white" 
                  : "bg-white/90 border-white/40 text-slate-600 hover:bg-white"
              )}>
                <ThumbsUp className={cn("w-3.5 h-3.5", issue.has_upvoted && "fill-white")} />
                <span className="text-xs font-bold leading-none">{formatNumber(issue.upvote_count || 0, locale)}</span>
              </div>
            </div>
          </div>

          {/* Elevated Glass Content Panel */}
          <div className="p-6 relative">
            {/* Category Color Accent Strip */}
            <div 
              className="absolute top-0 left-6 right-6 h-0.5 rounded-full"
              style={{ backgroundColor: `${categoryColor}40` }}
            />

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-600 transition-colors">
                    {categoryConfig?.label[locale as 'en' | 'am'] || issue.category}
                 </span>
                 <span className="text-[10px] font-bold text-slate-300">
                    {formatRelativeTime(issue.created_at, locale)}
                 </span>
              </div>

              <h3 className={cn(
                "text-xl font-bold text-[#1A1A1A] leading-snug tracking-tight group-hover:text-teal-primary transition-colors",
                isAmharic && "font-ethiopic"
              )}>
                {issue.title}
              </h3>
              
              {issue.description && (
                 <p className={cn(
                    "text-sm text-slate-500 font-medium leading-relaxed line-clamp-3",
                    isAmharic && "font-ethiopic"
                 )}>
                    {issue.description}
                 </p>
              )}

              <div className="flex items-center justify-between pt-2">
                 <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">
                       {issue.address || (locale === 'am' ? 'አዲስ አበባ' : 'Addis Ababa')}
                    </span>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-bold" title="Priority Score">
                       <Flag className="w-3.5 h-3.5" />
                       <span> {issue.priority_score || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                       <MessageSquare className="w-3.5 h-3.5" />
                       <span>{formatNumber(issue.comment_count || 0, locale)}</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function IssueCardSkeleton({ view = 'grid' }: { view?: 'grid' | 'list' }) {
  return (
    <div className="mb-6 break-inside-avoid">
       <div className="rounded-[2rem] overflow-hidden bg-white border border-zinc-100 shadow-sm">
          <div className="h-48 bg-zinc-100 animate-pulse" /> {/* Image skeleton */}
          <div className="p-5 space-y-3">
             <div className="flex justify-between">
                <div className="w-16 h-5 bg-zinc-100 rounded-md animate-pulse" />
                <div className="w-12 h-4 bg-zinc-100 rounded-full animate-pulse" />
             </div>
             <div className="w-full h-6 bg-zinc-100 rounded-lg animate-pulse" />
             <div className="w-3/4 h-6 bg-zinc-100 rounded-lg animate-pulse" />
             <div className="flex gap-2 pt-2">
                <div className="w-full h-4 bg-zinc-50 rounded-md animate-pulse" />
             </div>
             <div className="flex justify-between pt-4 border-t border-zinc-50">
                <div className="w-12 h-8 bg-zinc-100 rounded-full animate-pulse" />
                <div className="w-8 h-8 bg-zinc-100 rounded-full animate-pulse" />
             </div>
          </div>
       </div>
    </div>
  );
}
